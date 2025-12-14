const { writeAudit } = require("../utils/auditLogger");
const db = require("../database/database.json");

function normalizeIp(ip) {
  if (typeof ip === "string" && ip.startsWith("::ffff:"))
    return ip.replace("::ffff:", "");
  return ip;
}

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff && typeof xff === "string") return xff.split(",")[0].trim();
  return req.ip;
}

function isIpAllowed(labId, userId, clientIp) {
  const lab = db.labs.find((l) => l.lab_id === String(labId));
  if (!lab) return false;
  const user = (lab.users || []).find((u) => u.user_id === String(userId));
  if (!user) return false;
  return (user.ip_whitelist || []).includes(clientIp);
}

function ipAllowlist(req, res, next) {
  const labId = req.auth?.lab_id;
  const userId = req.auth?.user_id;

  const clientIp = normalizeIp(getClientIp(req));
  const ok = isIpAllowed(labId, userId, clientIp);

  if (!ok) {
    writeAudit({
      action: "forbidden",
      stage: "ipAllowlist",
      labId: String(labId),
      userId: String(userId),
      clientIp,
      reason: "IP not allowed",
      path: req.originalUrl,
      method: req.method,
    });

    return res.status(403).json({
      status: "forbidden",
      message: "IP not allowed",
      clientIp,
    });
  }

  return next();
}

module.exports = ipAllowlist;
