const http = require("http");
const fs = require("fs");
const path = require("path");
const {
  getUser,
  upsertUser,
  getSimulation,
  saveSimulation,
  resetSimulation,
  getReport
} = require("./storage");

const PORT = Number(process.env.PORT || 4000);
const ROOT_DIR = path.resolve(__dirname, "..");
const MAX_BODY_BYTES = 1024 * 1024;

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...corsHeaders()
  });
  res.end(body);
}

function sendError(res, status, message, details = {}) {
  sendJson(res, status, {
    ok: false,
    error: {
      message,
      ...details
    }
  });
}

function corsHeaders() {
  return {
    "access-control-allow-origin": process.env.CORS_ORIGIN || "*",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,x-dev-user-id"
  };
}

function getDevUserId(req) {
  return req.headers["x-dev-user-id"] || "dev-judge";
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) {
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
    res.writeHead(204, corsHeaders());
    res.end();
    return true;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      service: "hakimpintar-backend",
      version: "0.2.0",
      time: new Date().toISOString()
    });
    return true;
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
    sendJson(res, 200, { ok: true, user });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/me") {
    const userId = getDevUserId(req);
    const user = getUser(userId) || upsertUser({ id: userId, role: "peserta" });
    sendJson(res, 200, { ok: true, user });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/simulations/current") {
    const userId = getDevUserId(req);
    const simulation = getSimulation(userId);
    sendJson(res, 200, { ok: true, simulation });
    return true;
  }

  if (req.method === "PUT" && url.pathname === "/api/simulations/current") {
    const userId = getDevUserId(req);
    const body = await readBody(req);
    if (!isPlainObject(body.snapshot)) {
      sendError(res, 400, "snapshot must be an object");
      return true;
    }
    const simulation = saveSimulation(userId, body.snapshot);
    sendJson(res, 200, { ok: true, simulation });
    return true;
  }

  if (req.method === "DELETE" && url.pathname === "/api/simulations/current") {
    resetSimulation(getDevUserId(req));
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/reports/current") {
    const report = getReport(getDevUserId(req));
    sendJson(res, 200, { ok: true, report });
    return true;
  }

  return false;
}

function serveStatic(req, res, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.resolve(ROOT_DIR, `.${requestedPath}`);

  if (!filePath.startsWith(ROOT_DIR) || filePath.includes(`${path.sep}.git${path.sep}`)) {
    sendError(res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendError(res, error.code === "ENOENT" ? 404 : 500, error.code === "ENOENT" ? "Not found" : "File read failed");
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, {
      "content-type": CONTENT_TYPES[ext] || "application/octet-stream",
      "cache-control": "no-store"
    });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  try {
    const handledApi = await handleApi(req, res, url);
    if (handledApi) return;
    serveStatic(req, res, url);
  } catch (error) {
    sendError(res, error.status || 500, error.message || "Internal server error");
  }
});

server.listen(PORT, () => {
  console.log(`HakimPintar backend running at http://127.0.0.1:${PORT}`);
});
