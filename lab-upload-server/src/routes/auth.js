const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const router = express.Router();

function loadDb() {
  const p = path.join(__dirname, "..", "database", "database.json");
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

function labUserExists(labId, userId) {
  const db = loadDb();
  const lab = (db.labs || []).find((l) => String(l.lab_id) === String(labId));
  if (!lab) return false;
  const user = (lab.users || []).find(
    (u) => String(u.user_id) === String(userId)
  );
  return !!user;
}

router.post("/token", (req, res) => {
  const { lab_id, user_id, expiresIn } = req.body || {};

  if (!lab_id || !user_id) {
    return res.status(400).json({
      status: "error",
      message: "lab_id and user_id are required",
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      status: "error",
      message: "Server misconfiguration: JWT_SECRET is missing",
    });
  }

  if (!labUserExists(lab_id, user_id)) {
    return res.status(401).json({
      status: "unauthorized",
      message: "Unknown lab_id/user_id",
    });
  }

  const token = jwt.sign(
    { lab_id: String(lab_id), user_id: String(user_id) },
    process.env.JWT_SECRET,
    { expiresIn: expiresIn || "1h" }
  );

  return res.status(200).json({
    status: "ok",
    token,
    lab_id: String(lab_id),
    user_id: String(user_id),
    expiresIn: expiresIn || "1h",
  });
});

module.exports = router;
