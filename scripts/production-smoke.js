const assert = require("assert");

const baseUrl = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:4000").replace(/\/+$/, "");
const apiToken = process.env.SMOKE_API_TOKEN || "";
const expectedOrigin = process.env.SMOKE_EXPECTED_CORS_ORIGIN || "";

async function request(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (error) {
    body = text;
  }
  return { res, body, text };
}

async function main() {
  console.log(`Production smoke target: ${baseUrl}`);

  const health = await request("/health");
  assert.strictEqual(health.res.status, 200, "/health should return 200");
  assert.strictEqual(health.body?.ok, true, "/health should return ok=true");
  assert(health.body?.service, "/health should include service name");
  assert.strictEqual(health.body?.storage?.schemaVersion, 1, "/health should include storage schema version");
  assert(health.res.headers.get("x-request-id"), "/health should include x-request-id");
  assert.strictEqual(health.res.headers.get("x-frame-options"), "DENY");
  console.log(`ok - health ${health.body.service} ${health.body.environment}/${health.body.authMode}`);

  const home = await request("/");
  assert.strictEqual(home.res.status, 200, "/ should return 200");
  assert(home.res.headers.get("content-type")?.includes("text/html"), "/ should return HTML");
  assert(home.text.includes("HakimPintar AI"), "homepage should include product name");
  console.log("ok - homepage render");

  const staticGuard = await request("/backend/server.js");
  assert.strictEqual(staticGuard.res.status, 403, "backend source should not be served");
  console.log("ok - static guard");

  const api = await request("/api/simulations/current");
  if (apiToken) {
    assert.strictEqual(api.res.status, 200, "authorized API smoke should return 200");
    assert.strictEqual(api.body?.ok, true, "authorized API smoke should return ok=true");
    console.log("ok - authorized API");
  } else {
    assert([200, 401].includes(api.res.status), "API should return 200 in dev mode or 401 in token mode");
    console.log(`ok - API auth posture status=${api.res.status}`);
  }

  if (expectedOrigin) {
    const cors = await request("/health", {
      headers: { Origin: expectedOrigin }
    });
    assert.strictEqual(cors.res.status, 200, "CORS health check should return 200");
    assert.strictEqual(
      cors.res.headers.get("access-control-allow-origin"),
      expectedOrigin,
      "CORS allow-origin should match expected origin"
    );
    console.log("ok - CORS allowlist");
  }

  console.log("Production smoke passed");
}

main().catch((error) => {
  console.error("Production smoke failed");
  console.error(error);
  process.exit(1);
});
