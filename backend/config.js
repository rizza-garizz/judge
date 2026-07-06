const DEFAULT_PORT = 4000;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 120;
const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;

function readInteger(name, fallback, { min, max } = {}) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be an integer`);
  }
  if (typeof min === "number" && value < min) {
    throw new Error(`${name} must be >= ${min}`);
  }
  if (typeof max === "number" && value > max) {
    throw new Error(`${name} must be <= ${max}`);
  }
  return value;
}

function readList(name, fallback = []) {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readBoolean(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function readHost() {
  const host = process.env.HOST || "127.0.0.1";
  if (!/^[a-zA-Z0-9.:-]+$/.test(host)) {
    throw new Error("HOST contains invalid characters");
  }
  return host;
}

function buildConfig() {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";
  const apiAuthMode = process.env.API_AUTH_MODE || (isProduction ? "token" : "dev");
  const allowedAuthModes = ["dev", "token"];

  if (!allowedAuthModes.includes(apiAuthMode)) {
    throw new Error(`API_AUTH_MODE must be one of: ${allowedAuthModes.join(", ")}`);
  }

  const apiToken = process.env.API_TOKEN || "";
  const corsOrigins = readList("CORS_ORIGIN", isProduction ? [] : ["*"]);

  if (apiAuthMode === "token" && apiToken.length < 24) {
    throw new Error("API_TOKEN must be at least 24 characters when API_AUTH_MODE=token");
  }
  if (isProduction && corsOrigins.includes("*")) {
    throw new Error("CORS_ORIGIN must be explicit in production");
  }

  return {
    nodeEnv,
    isProduction,
    port: readInteger("PORT", DEFAULT_PORT, { min: 1, max: 65_535 }),
    host: readHost(),
    apiAuthMode,
    apiToken,
    corsOrigins,
    requestLogging: readBoolean("REQUEST_LOGGING", true),
    rateLimitWindowMs: readInteger("RATE_LIMIT_WINDOW_MS", DEFAULT_RATE_LIMIT_WINDOW_MS, { min: 1_000 }),
    rateLimitMax: readInteger("RATE_LIMIT_MAX", DEFAULT_RATE_LIMIT_MAX, { min: 1 }),
    maxBodyBytes: readInteger("MAX_BODY_BYTES", DEFAULT_MAX_BODY_BYTES, { min: 1024 })
  };
}

module.exports = buildConfig();
