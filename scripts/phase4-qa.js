const assert = require("assert");
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DEV_PORT = 4107;
const TOKEN_PORT = 4108;
const TOKEN = "phase4-token-123456789012";

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch (error) {
      body = text;
    }
  }
  return { res, body, text };
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 5000;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const { res, body } = await fetchJson(`${baseUrl}/health`);
      if (res.ok && body?.ok) return;
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }

  throw lastError || new Error(`Timed out waiting for ${baseUrl}/health`);
}

function startServer(env) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "hakimpintar-qa-data-"));
  const child = spawn(process.execPath, ["backend/server.js"], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      REQUEST_LOGGING: "false",
      DATA_DIR: dataDir,
      ...env
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  child.output = () => output;
  child.dataDir = dataDir;
  return child;
}

function stopServer(child) {
  return new Promise((resolve) => {
    const cleanup = () => {
      if (child?.dataDir) {
        fs.rmSync(child.dataDir, { recursive: true, force: true });
      }
      resolve();
    };
    if (!child || child.exitCode !== null) {
      cleanup();
      return;
    }
    child.once("exit", cleanup);
    child.kill("SIGINT");
    setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGTERM");
    }, 1500).unref();
  });
}

function runConfigProbe(env) {
  return spawnSync(process.execPath, ["-e", "require('./backend/config')"], {
    cwd: ROOT_DIR,
    env: { ...process.env, ...env },
    encoding: "utf8"
  });
}

test("frontend shell exposes required enterprise controls", () => {
  const html = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
  const css = fs.readFileSync(path.join(ROOT_DIR, "style.css"), "utf8");
  const api = fs.readFileSync(path.join(ROOT_DIR, "js/api.js"), "utf8");

  [
    'id="app-sidebar"',
    'id="sidebar-backdrop"',
    'aria-controls="app-sidebar"',
    'id="tab-courtroom"',
    'id="btn-reset-simulation"',
    'id="grades-feedback-card"'
  ].forEach((needle) => assert(html.includes(needle), `Missing ${needle}`));

  assert(css.includes(":focus-visible"), "Missing keyboard focus states");
  assert(css.includes("prefers-reduced-motion"), "Missing reduced-motion support");
  assert(api.includes("HAKIMPINTAR_API_TOKEN"), "Missing frontend bearer token support");
});

test("production config rejects unsafe env", () => {
  const shortToken = runConfigProbe({
    NODE_ENV: "production",
    API_AUTH_MODE: "token",
    API_TOKEN: "short",
    CORS_ORIGIN: "https://example.test"
  });
  assert.notStrictEqual(shortToken.status, 0, "Short API_TOKEN should fail");
  assert(shortToken.stderr.includes("API_TOKEN"), "Short token error should mention API_TOKEN");

  const wildcardCors = runConfigProbe({
    NODE_ENV: "production",
    API_AUTH_MODE: "token",
    API_TOKEN: TOKEN,
    CORS_ORIGIN: "*"
  });
  assert.notStrictEqual(wildcardCors.status, 0, "Wildcard production CORS should fail");
  assert(wildcardCors.stderr.includes("CORS_ORIGIN"), "Wildcard CORS error should mention CORS_ORIGIN");
});

test("development backend supports core simulation lifecycle", async () => {
  const server = startServer({
    NODE_ENV: "development",
    API_AUTH_MODE: "dev",
    PORT: String(DEV_PORT),
    HOST: "127.0.0.1",
    RATE_LIMIT_MAX: "1000"
  });
  const baseUrl = `http://127.0.0.1:${DEV_PORT}`;
  const userId = `phase4-${Date.now()}`;

  try {
    await waitForHealth(baseUrl);

    const health = await fetchJson(`${baseUrl}/health`);
    assert.strictEqual(health.res.status, 200);
    assert.strictEqual(health.body.ok, true);
    assert.strictEqual(health.body.authMode, "dev");
    assert.strictEqual(health.body.storage.schemaVersion, 1);
    assert.strictEqual(health.res.headers.get("x-frame-options"), "DENY");
    assert(health.res.headers.get("x-request-id"), "Missing request id header");

    const home = await fetch(`${baseUrl}/`);
    const html = await home.text();
    assert.strictEqual(home.status, 200);
    assert(home.headers.get("content-type").includes("text/html"));
    assert(html.includes("HakimPintar AI"));

    const staticGuard = await fetchJson(`${baseUrl}/backend/server.js`);
    assert.strictEqual(staticGuard.res.status, 403);
    assert.strictEqual(staticGuard.body.error.message, "Forbidden");

    const invalidSnapshot = await fetchJson(`${baseUrl}/api/simulations/current`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Dev-User-Id": userId
      },
      body: JSON.stringify({ snapshot: null })
    });
    assert.strictEqual(invalidSnapshot.res.status, 400);

    const snapshot = {
      currentSession: 4,
      finalScore: 88,
      userChoices: { phase4: true },
      evaluationDetails: { evidenceScore: 28 }
    };
    const save = await fetchJson(`${baseUrl}/api/simulations/current`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Dev-User-Id": userId
      },
      body: JSON.stringify({ snapshot })
    });
    assert.strictEqual(save.res.status, 200);
    assert.strictEqual(save.body.simulation.snapshot.finalScore, 88);

    const current = await fetchJson(`${baseUrl}/api/simulations/current`, {
      headers: { "X-Dev-User-Id": userId }
    });
    assert.strictEqual(current.res.status, 200);
    assert.strictEqual(current.body.simulation.snapshot.currentSession, 4);

    const report = await fetchJson(`${baseUrl}/api/reports/current`, {
      headers: { "X-Dev-User-Id": userId }
    });
    assert.strictEqual(report.res.status, 200);
    assert.strictEqual(report.body.report.finalScore, 88);

    const audit = await fetchJson(`${baseUrl}/api/audit/current?limit=10`, {
      headers: { "X-Dev-User-Id": userId }
    });
    assert.strictEqual(audit.res.status, 200);
    assert(Array.isArray(audit.body.auditLogs), "Audit logs should be an array");
    assert(
      audit.body.auditLogs.some((entry) => entry.action === "simulation.save"),
      "Audit logs should include simulation.save"
    );
    assert(
      audit.body.auditLogs.some((entry) => entry.action === "report.view"),
      "Audit logs should include report.view"
    );

    const compliance = await fetchJson(`${baseUrl}/api/compliance/export/current`, {
      headers: { "X-Dev-User-Id": userId }
    });
    assert.strictEqual(compliance.res.status, 200);
    assert.strictEqual(compliance.body.export.user?.id, userId);
    assert.strictEqual(compliance.body.export.report.finalScore, 88);
    assert(Array.isArray(compliance.body.export.auditLogs), "Compliance export should include audit logs");

    const integrity = await fetchJson(`${baseUrl}/api/admin/storage/integrity`, {
      headers: { "X-Dev-User-Id": userId }
    });
    assert.strictEqual(integrity.res.status, 200);
    assert.strictEqual(integrity.body.integrity.ok, true);
    assert.strictEqual(integrity.body.integrity.info.schemaVersion, 1);

    const reset = await fetchJson(`${baseUrl}/api/simulations/current`, {
      method: "DELETE",
      headers: { "X-Dev-User-Id": userId }
    });
    assert.strictEqual(reset.res.status, 200);

    const afterReset = await fetchJson(`${baseUrl}/api/simulations/current`, {
      headers: { "X-Dev-User-Id": userId }
    });
    assert.strictEqual(afterReset.body.simulation, null);
  } finally {
    await stopServer(server);
    assert.notStrictEqual(server.exitCode, 1, server.output());
  }
});

test("token mode enforces auth and explicit CORS", async () => {
  const server = startServer({
    NODE_ENV: "production",
    API_AUTH_MODE: "token",
    API_TOKEN: TOKEN,
    CORS_ORIGIN: `http://127.0.0.1:${TOKEN_PORT}`,
    PORT: String(TOKEN_PORT),
    HOST: "127.0.0.1",
    RATE_LIMIT_MAX: "1000"
  });
  const baseUrl = `http://127.0.0.1:${TOKEN_PORT}`;

  try {
    await waitForHealth(baseUrl);

    const noToken = await fetchJson(`${baseUrl}/api/simulations/current`);
    assert.strictEqual(noToken.res.status, 401);

    const withToken = await fetchJson(`${baseUrl}/api/simulations/current`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    assert.strictEqual(withToken.res.status, 200);

    const allowedCors = await fetch(`${baseUrl}/health`, {
      headers: { Origin: `http://127.0.0.1:${TOKEN_PORT}` }
    });
    assert.strictEqual(allowedCors.status, 200);
    assert.strictEqual(
      allowedCors.headers.get("access-control-allow-origin"),
      `http://127.0.0.1:${TOKEN_PORT}`
    );

    const blockedPreflight = await fetch(`${baseUrl}/api/simulations/current`, {
      method: "OPTIONS",
      headers: { Origin: "https://blocked.example" }
    });
    assert.strictEqual(blockedPreflight.status, 403);
  } finally {
    await stopServer(server);
    assert.notStrictEqual(server.exitCode, 1, server.output());
  }
});

(async () => {
  let passed = 0;

  for (const item of tests) {
    try {
      await item.fn();
      passed += 1;
      console.log(`ok - ${item.name}`);
    } catch (error) {
      console.error(`not ok - ${item.name}`);
      console.error(error);
      process.exitCode = 1;
      break;
    }
  }

  if (process.exitCode) return;
  console.log(`Phase 4 QA passed (${passed}/${tests.length})`);
})();
