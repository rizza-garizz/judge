const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const config = require("./config");

const DB_SCHEMA_VERSION = 1;
const DATA_DIR = path.resolve(__dirname, "..", config.dataDir);
const DB_FILE = path.join(DATA_DIR, "dev-db.json");

const DEFAULT_DB = {
  metadata: {
    schemaVersion: DB_SCHEMA_VERSION,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString()
  },
  users: [
    {
      id: "dev-judge",
      name: "Hakim Pemula",
      email: "hakim.dev@hakimpintar.local",
      role: "peserta",
      createdAt: new Date(0).toISOString()
    }
  ],
  simulations: {},
  auditLogs: []
};

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readDb() {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const initialDb = normalizeDb(DEFAULT_DB);
    writeDb(initialDb);
    return structuredClone(initialDb);
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    const normalized = normalizeDb(parsed);
    if (JSON.stringify(parsed.metadata) !== JSON.stringify(normalized.metadata)) {
      writeDb(normalized);
    }
    return normalized;
  } catch (error) {
    const backupFile = `${DB_FILE}.corrupt-${Date.now()}`;
    fs.renameSync(DB_FILE, backupFile);
    const initialDb = normalizeDb(DEFAULT_DB);
    writeDb(initialDb);
    return structuredClone(initialDb);
  }
}

function normalizeDb(db) {
  const now = nowIso();
  return {
    metadata: {
      schemaVersion: DB_SCHEMA_VERSION,
      createdAt: db?.metadata?.createdAt || now,
      updatedAt: db?.metadata?.updatedAt || now
    },
    users: Array.isArray(db?.users) ? db.users : DEFAULT_DB.users,
    simulations: db?.simulations && typeof db.simulations === "object" && !Array.isArray(db.simulations) ? db.simulations : {},
    auditLogs: Array.isArray(db?.auditLogs) ? db.auditLogs : []
  };
}

function writeDb(db) {
  ensureDataDir();
  const tmpFile = `${DB_FILE}.tmp`;
  const normalized = normalizeDb(db);
  normalized.metadata.updatedAt = nowIso();
  fs.writeFileSync(tmpFile, JSON.stringify(normalized, null, 2));
  fs.renameSync(tmpFile, DB_FILE);
}

function nowIso() {
  return new Date().toISOString();
}

function appendAuditLog(db, { userId, action, meta = {} }) {
  const entry = {
    id: crypto.randomUUID(),
    userId,
    action,
    createdAt: nowIso(),
    meta
  };
  db.auditLogs.push(entry);
  return entry;
}

function getUser(userId) {
  const db = readDb();
  return db.users.find((user) => user.id === userId) || null;
}

function upsertUser({ id, name, email, role }) {
  const db = readDb();
  const existing = db.users.find((user) => user.id === id);
  const safeRole = ["admin", "penguji", "peserta"].includes(role) ? role : "peserta";

  if (existing) {
    existing.name = name || existing.name;
    existing.email = email || existing.email;
    existing.role = safeRole;
    existing.updatedAt = nowIso();
  } else {
    db.users.push({
      id,
      name: name || "Hakim Pemula",
      email: email || `${id}@hakimpintar.local`,
      role: safeRole,
      createdAt: nowIso()
    });
  }

  writeDb(db);
  return db.users.find((user) => user.id === id);
}

function getSimulation(userId) {
  const db = readDb();
  return db.simulations[userId] || null;
}

function saveSimulation(userId, snapshot) {
  const db = readDb();
  const previous = db.simulations[userId];
  const savedAt = nowIso();
  const id = previous?.id || crypto.randomUUID();

  db.simulations[userId] = {
    id,
    userId,
    snapshot,
    createdAt: previous?.createdAt || savedAt,
    updatedAt: savedAt
  };

  appendAuditLog(db, {
    userId,
    action: "simulation.save",
    meta: {
      currentSession: snapshot?.currentSession || null,
      finalScore: snapshot?.finalScore || 0
    }
  });

  writeDb(db);
  return db.simulations[userId];
}

function resetSimulation(userId) {
  const db = readDb();
  delete db.simulations[userId];
  appendAuditLog(db, {
    userId,
    action: "simulation.reset",
    meta: {}
  });
  writeDb(db);
}

function recordAuditLog(userId, action, meta = {}) {
  const db = readDb();
  const entry = appendAuditLog(db, { userId, action, meta });
  writeDb(db);
  return entry;
}

function getAuditLogs(userId, { limit = 100 } = {}) {
  const db = readDb();
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  return db.auditLogs
    .filter((entry) => entry.userId === userId)
    .slice(-safeLimit)
    .reverse();
}

function getReport(userId) {
  const simulation = getSimulation(userId);
  if (!simulation) return null;

  const snapshot = simulation.snapshot || {};
  return {
    simulationId: simulation.id,
    userId,
    updatedAt: simulation.updatedAt,
    currentSession: snapshot.currentSession || 1,
    finalScore: snapshot.finalScore || 0,
    userChoices: snapshot.userChoices || {},
    evaluationDetails: snapshot.evaluationDetails || {}
  };
}

function getComplianceExport(userId, { auditLimit = 500 } = {}) {
  const db = readDb();
  const user = db.users.find((item) => item.id === userId) || null;
  const simulation = db.simulations[userId] || null;
  const snapshot = simulation?.snapshot || {};

  return {
    generatedAt: nowIso(),
    user: user ? {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt || null
    } : {
      id: userId,
      name: null,
      email: null,
      role: "unknown",
      createdAt: null,
      updatedAt: null
    },
    simulation,
    report: simulation ? {
      simulationId: simulation.id,
      userId,
      updatedAt: simulation.updatedAt,
      currentSession: snapshot.currentSession || 1,
      finalScore: snapshot.finalScore || 0,
      userChoices: snapshot.userChoices || {},
      evaluationDetails: snapshot.evaluationDetails || {}
    } : null,
    auditLogs: db.auditLogs
      .filter((entry) => entry.userId === userId)
      .slice(-(Math.min(Math.max(Number(auditLimit) || 500, 1), 1000)))
  };
}

function pruneAuditLogs(retentionDays) {
  const safeDays = Math.max(Number(retentionDays) || 1, 1);
  const cutoff = Date.now() - safeDays * 24 * 60 * 60 * 1000;
  const db = readDb();
  const before = db.auditLogs.length;

  db.auditLogs = db.auditLogs.filter((entry) => {
    const createdAt = Date.parse(entry.createdAt);
    return Number.isNaN(createdAt) || createdAt >= cutoff;
  });

  const pruned = before - db.auditLogs.length;
  if (pruned > 0) writeDb(db);
  return { pruned, retained: db.auditLogs.length };
}

function getStorageInfo() {
  const db = readDb();
  const stats = fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE) : null;
  return {
    dataDir: DATA_DIR,
    dbFile: DB_FILE,
    schemaVersion: db.metadata.schemaVersion,
    users: db.users.length,
    simulations: Object.keys(db.simulations).length,
    auditLogs: db.auditLogs.length,
    bytes: stats?.size || 0,
    updatedAt: db.metadata.updatedAt
  };
}

function checkIntegrity() {
  const db = readDb();
  const issues = [];
  const userIds = new Set();
  const allowedRoles = new Set(["admin", "penguji", "peserta"]);

  db.users.forEach((user, index) => {
    if (!user.id) issues.push(`users[${index}] missing id`);
    if (user.id && userIds.has(user.id)) issues.push(`duplicate user id: ${user.id}`);
    if (user.id) userIds.add(user.id);
    if (!allowedRoles.has(user.role)) issues.push(`user ${user.id || index} has invalid role`);
  });

  Object.entries(db.simulations).forEach(([userId, simulation]) => {
    if (!simulation.id) issues.push(`simulation ${userId} missing id`);
    if (simulation.userId !== userId) issues.push(`simulation key ${userId} mismatches userId ${simulation.userId}`);
    if (!simulation.snapshot || typeof simulation.snapshot !== "object") issues.push(`simulation ${userId} missing snapshot`);
  });

  db.auditLogs.forEach((entry, index) => {
    if (!entry.id) issues.push(`auditLogs[${index}] missing id`);
    if (!entry.userId) issues.push(`auditLogs[${index}] missing userId`);
    if (!entry.action) issues.push(`auditLogs[${index}] missing action`);
    if (Number.isNaN(Date.parse(entry.createdAt))) issues.push(`auditLogs[${index}] invalid createdAt`);
  });

  return {
    ok: issues.length === 0,
    issues,
    info: getStorageInfo()
  };
}

function createBackup({ label = "" } = {}) {
  const db = readDb();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeLabel = label ? `-${String(label).replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 48)}` : "";
  const backupFile = path.join(DATA_DIR, `dev-db.backup-${stamp}${safeLabel}.json`);

  fs.writeFileSync(backupFile, JSON.stringify(db, null, 2));
  return {
    backupFile,
    bytes: fs.statSync(backupFile).size,
    schemaVersion: db.metadata.schemaVersion
  };
}

function restoreBackup(backupFile) {
  const resolvedBackup = path.resolve(backupFile);
  if (!fs.existsSync(resolvedBackup)) {
    throw new Error(`Backup file not found: ${resolvedBackup}`);
  }

  const parsed = JSON.parse(fs.readFileSync(resolvedBackup, "utf8"));
  const normalized = normalizeDb(parsed);
  const currentBackup = fs.existsSync(DB_FILE) ? createBackup({ label: "pre-restore" }) : null;
  writeDb(normalized);

  return {
    restoredFrom: resolvedBackup,
    preRestoreBackup: currentBackup?.backupFile || null,
    integrity: checkIntegrity()
  };
}

module.exports = {
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
  checkIntegrity,
  createBackup,
  restoreBackup
};
