const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const config = require("./config");
const {
  getUser,
  upsertUser,
  getSimulation,
  saveSimulation,
  resetSimulation,
  getReport,
  recordAuditLog,
  getAuditLogs,
  getComplianceExport,
  pruneAuditLogs,
  getStorageInfo,
  checkIntegrity
} = require("./storage");

const ROOT_DIR = path.resolve(__dirname, "..");
const rateLimitBuckets = new Map();

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml"
};

const STATIC_ALLOWLIST = new Set([
  "/index.html",
  "/style.css",
  "/app.js",
  "/data.js"
]);

const ROLE_PERMISSIONS = {
  admin: ["simulation:write", "report:read", "audit:read", "compliance:export", "storage:admin", "user:manage"],
  auditor: ["report:read", "audit:read", "compliance:export"],
  penguji: ["simulation:write", "report:read"],
  peserta: ["simulation:write", "report:read"]
};

function normalizeRole(role) {
  return Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role) ? role : "peserta";
}

function hasPermission(actor, permission) {
  return Boolean(actor?.permissions?.includes(permission));
}

function getRequestId(req) {
  const incoming = req.headers["x-request-id"];
  if (typeof incoming === "string" && incoming.length <= 80 && /^[a-zA-Z0-9._:-]+$/.test(incoming)) {
    return incoming;
  }
  return crypto.randomUUID();
}

function securityHeaders() {
  return {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "cross-origin-resource-policy": "same-site"
  };
}

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (config.corsOrigins.includes("*")) return true;
  return config.corsOrigins.includes(origin);
}

function corsHeaders(req) {
  const origin = req?.headers?.origin;
  const headers = {
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,x-dev-user-id,x-dev-user-role,x-user-id,x-user-role,x-request-id",
    "access-control-max-age": "600"
  };

  if (!origin) return headers;

  const allowOrigin = isOriginAllowed(origin) ? (config.corsOrigins.includes("*") ? "*" : origin) : "null";

  return {
    ...headers,
    "access-control-allow-origin": allowOrigin || "null",
    "vary": "Origin"
  };
}

function writeResponse(res, status, headers, body = "") {
  res.writeHead(status, {
    ...securityHeaders(),
    ...headers
  });
  res.end(body);
}

function sendJson(req, res, status, payload) {
  const body = JSON.stringify(payload);
  writeResponse(res, status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-request-id": req.requestId,
    ...corsHeaders(req)
  }, body);
}

function sendError(req, res, status, message, details = {}) {
  const safeMessage = status >= 500 && config.isProduction ? "Internal server error" : message;
  sendJson(req, res, status, {
    ok: false,
    requestId: req.requestId,
    error: {
      message: safeMessage,
      ...details
    }
  });
}

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

function applyRateLimit(req, res) {
  const now = Date.now();
  const key = `${getClientIp(req)}:${req.url}`;
  const current = rateLimitBuckets.get(key);

  if (!current || now > current.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + config.rateLimitWindowMs });
    return true;
  }

  current.count += 1;
  if (current.count > config.rateLimitMax) {
    writeResponse(res, 429, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "retry-after": String(Math.ceil((current.resetAt - now) / 1000)),
      "x-request-id": req.requestId,
      ...corsHeaders(req)
    }, JSON.stringify({
      ok: false,
      requestId: req.requestId,
      error: { message: "Too many requests" }
    }));
    return false;
  }

  return true;
}

function getDevUserId(req) {
  const userId = req.headers["x-dev-user-id"] || "dev-judge";
  return String(userId).replace(/[^a-zA-Z0-9._@-]/g, "").slice(0, 80) || "dev-judge";
}

function sanitizeId(value, fallback) {
  return String(value || fallback).replace(/[^a-zA-Z0-9._@-]/g, "").slice(0, 80) || fallback;
}

function getRequestActor(req) {
  const userIdHeader = config.apiAuthMode === "dev" ? req.headers["x-dev-user-id"] : req.headers["x-user-id"];
  const roleHeader = config.apiAuthMode === "dev" ? req.headers["x-dev-user-role"] : req.headers["x-user-role"];
  const userId = sanitizeId(userIdHeader, getDevUserId(req));
  const storedUser = getUser(userId);
  const role = normalizeRole(roleHeader || storedUser?.role || "peserta");

  return {
    id: userId,
    role,
    permissions: ROLE_PERMISSIONS[role]
  };
}

function isAuthorized(req) {
  if (config.apiAuthMode === "dev") return true;

  const authorization = req.headers.authorization || "";
  const expected = `Bearer ${config.apiToken}`;
  return crypto.timingSafeEqual(
    Buffer.from(authorization.padEnd(expected.length)),
    Buffer.from(expected.padEnd(authorization.length))
  );
}

function requireApiAuth(req, res) {
  if (isAuthorized(req)) return true;
  sendError(req, res, 401, "Unauthorized");
  return false;
}

function requirePermission(req, res, permission) {
  const actor = req.actor || getRequestActor(req);
  req.actor = actor;

  if (hasPermission(actor, permission)) return true;

  recordAuditLog(actor.id, "access.denied", {
    role: actor.role,
    permission,
    path: req.url,
    requestId: req.requestId
  });
  sendError(req, res, 403, "Forbidden", {
    requiredPermission: permission,
    role: actor.role
  });
  return false;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > config.maxBodyBytes) {
        reject(Object.assign(new Error("Payload too large"), { status: 413 }));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(Object.assign(new Error("Invalid JSON body"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") {
    if (!isOriginAllowed(req.headers.origin)) {
      sendError(req, res, 403, "CORS origin not allowed");
      return true;
    }
    writeResponse(res, 204, {
      "x-request-id": req.requestId,
      ...corsHeaders(req)
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    const storage = getStorageInfo();
    sendJson(req, res, 200, {
      ok: true,
      service: "hakimpintar-backend",
      version: "0.2.0",
      environment: config.nodeEnv,
      authMode: config.apiAuthMode,
      storage: {
        schemaVersion: storage.schemaVersion,
        users: storage.users,
        simulations: storage.simulations,
        auditLogs: storage.auditLogs
      },
      time: new Date().toISOString()
    });
    return true;
  }

  if (url.pathname.startsWith("/api/") && !requireApiAuth(req, res)) {
    return true;
  }
  if (url.pathname.startsWith("/api/")) {
    req.actor = getRequestActor(req);
  }

  if (req.method === "POST" && url.pathname === "/api/auth/dev-login") {
    const body = await readBody(req);
    const userId = body.userId || "dev-judge";
    const user = upsertUser({
      id: userId,
      name: body.name || "Hakim Pemula",
      email: body.email || "hakim.dev@hakimpintar.local",
      role: body.role || "peserta"
    });
    recordAuditLog(user.id, "auth.dev-login", {
      role: user.role,
      requestId: req.requestId
    });
    sendJson(req, res, 200, { ok: true, user });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/me") {
    const userId = req.actor.id;
    const user = getUser(userId) || upsertUser({ id: userId, role: "peserta" });
    sendJson(req, res, 200, {
      ok: true,
      user,
      actor: req.actor,
      permissionMatrix: ROLE_PERMISSIONS
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/simulations/current") {
    const userId = req.actor.id;
    const simulation = getSimulation(userId);
    sendJson(req, res, 200, { ok: true, simulation });
    return true;
  }

  if (req.method === "PUT" && url.pathname === "/api/simulations/current") {
    if (!requirePermission(req, res, "simulation:write")) return true;
    const userId = req.actor.id;
    const body = await readBody(req);
    if (!isPlainObject(body.snapshot)) {
      sendError(req, res, 400, "snapshot must be an object");
      return true;
    }
    const simulation = saveSimulation(userId, body.snapshot);
    sendJson(req, res, 200, { ok: true, simulation });
    return true;
  }

  if (req.method === "DELETE" && url.pathname === "/api/simulations/current") {
    if (!requirePermission(req, res, "simulation:write")) return true;
    resetSimulation(req.actor.id);
    sendJson(req, res, 200, { ok: true });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/reports/current") {
    if (!requirePermission(req, res, "report:read")) return true;
    const userId = req.actor.id;
    const report = getReport(userId);
    recordAuditLog(userId, "report.view", {
      hasReport: Boolean(report),
      requestId: req.requestId
    });
    sendJson(req, res, 200, { ok: true, report });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/audit/current") {
    if (!requirePermission(req, res, "audit:read")) return true;
    const userId = req.actor.id;
    const limit = url.searchParams.get("limit") || 100;
    const auditLogs = getAuditLogs(userId, { limit });
    sendJson(req, res, 200, {
      ok: true,
      retentionDays: config.auditRetentionDays,
      auditLogs
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/compliance/export/current") {
    if (!requirePermission(req, res, "compliance:export")) return true;
    const userId = req.actor.id;
    const exportPayload = getComplianceExport(userId);
    recordAuditLog(userId, "compliance.export", {
      requestId: req.requestId,
      hasSimulation: Boolean(exportPayload.simulation)
    });
    sendJson(req, res, 200, {
      ok: true,
      retentionDays: config.auditRetentionDays,
      export: exportPayload
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/storage/integrity") {
    if (!requirePermission(req, res, "storage:admin")) return true;
    const integrity = checkIntegrity();
    sendJson(req, res, integrity.ok ? 200 : 500, {
      ok: integrity.ok,
      integrity
    });
    return true;
  }

  return false;
}

function serveStatic(req, res, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.resolve(ROOT_DIR, `.${requestedPath}`);
  const isAllowedStaticFile = STATIC_ALLOWLIST.has(requestedPath) || requestedPath.startsWith("/js/");

  if (!isAllowedStaticFile || !filePath.startsWith(ROOT_DIR) || filePath.includes(`${path.sep}.git${path.sep}`)) {
    sendError(req, res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendError(req, res, error.code === "ENOENT" ? 404 : 500, error.code === "ENOENT" ? "Not found" : "File read failed");
      return;
    }

    const ext = path.extname(filePath);
    writeResponse(res, 200, {
      "content-type": CONTENT_TYPES[ext] || "application/octet-stream",
      "cache-control": "no-store",
      "x-request-id": req.requestId
    }, content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const startedAt = Date.now();
  req.requestId = getRequestId(req);

  if (config.requestLogging) {
    res.on("finish", () => {
      console.log(JSON.stringify({
        level: res.statusCode >= 500 ? "error" : "info",
        requestId: req.requestId,
        method: req.method,
        path: url.pathname,
        status: res.statusCode,
        durationMs: Date.now() - startedAt
      }));
    });
  }

  try {
    if (!applyRateLimit(req, res)) return;
    const handledApi = await handleApi(req, res, url);
    if (handledApi) return;
    serveStatic(req, res, url);
  } catch (error) {
    sendError(req, res, error.status || 500, error.message || "Internal server error");
  }
});

server.on("error", (error) => {
  console.error(JSON.stringify({
    level: "error",
    message: "Server failed to start",
    code: error.code,
    address: error.address,
    port: error.port
  }));
  process.exit(1);
});

const auditPruneResult = pruneAuditLogs(config.auditRetentionDays);

server.listen(config.port, config.host, () => {
  console.log(`HakimPintar backend running at http://${config.host}:${config.port}`);
  console.log(`Environment=${config.nodeEnv} API_AUTH_MODE=${config.apiAuthMode}`);
  if (auditPruneResult.pruned > 0) {
    console.log(`Audit retention pruned ${auditPruneResult.pruned} entries`);
  }
});

function shutdown(signal) {
  console.log(`Received ${signal}; closing server`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
