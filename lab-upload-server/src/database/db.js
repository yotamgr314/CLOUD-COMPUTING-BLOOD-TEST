const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "database.json");

function loadDb() {
  const raw = fs.readFileSync(dbPath, "utf8");
  return JSON.parse(raw);
}

function findUserRecord(lab_id, user_id) {
  const db = loadDb();
  const lab = (db.labs || []).find((l) => l.lab_id === lab_id);
  if (!lab) return null;

  const user = (lab.users || []).find((u) => u.user_id === user_id);
  if (!user) return null;

  return { lab, user };
}

module.exports = { findUserRecord };
