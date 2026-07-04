const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "dev-db.json");

const DEFAULT_DB = {
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
    writeDb(DEFAULT_DB);
    return structuredClone(DEFAULT_DB);
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    return {
      users: Array.isArray(parsed.users) ? parsed.users : DEFAULT_DB.users,
      simulations: parsed.simulations && typeof parsed.simulations === "object" ? parsed.simulations : {},
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : []
    };
  } catch (error) {
    const backupFile = `${DB_FILE}.corrupt-${Date.now()}`;
    fs.renameSync(DB_FILE, backupFile);
    writeDb(DEFAULT_DB);
    return structuredClone(DEFAULT_DB);
  }
}

function writeDb(db) {
  ensureDataDir();
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2));
  fs.renameSync(tmpFile, DB_FILE);
}

function nowIso() {
  return new Date().toISOString();
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

  db.auditLogs.push({
    id: crypto.randomUUID(),
    userId,
    action: "simulation.save",
    createdAt: savedAt,
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
  db.auditLogs.push({
    id: crypto.randomUUID(),
    userId,
    action: "simulation.reset",
    createdAt: nowIso(),
    meta: {}
  });
  writeDb(db);
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

module.exports = {
  getUser,
  upsertUser,
  getSimulation,
  saveSimulation,
  resetSimulation,
  getReport
};
