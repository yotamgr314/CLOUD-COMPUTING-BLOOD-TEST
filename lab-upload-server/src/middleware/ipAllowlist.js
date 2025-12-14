const { findUserRecord } = require("../database/db");

function normalizeIp(ip) {
  if (typeof ip === "string" && ip.startsWith("::ffff:")) {
    return ip.replace("::ffff:", "");
  }
  return ip;
}

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff && typeof xff === "string") {
    return xff.split(",")[0].trim();
  }
  return req.ip;
}

function ipAllowlist(req, res, next) {
  const clientIp = normalizeIp(getClientIp(req));

  // חייב להיות אחרי jwtAuth
  if (!req.auth?.lab_id || !req.auth?.user_id) {
    return res.status(500).json({
      status: "error",
      message:
        "Server misconfiguration: auth context missing (jwtAuth must run before ipAllowlist)",
    });
  }

  const rec = findUserRecord(req.auth.lab_id, req.auth.user_id);
  if (!rec) {
    return res.status(401).json({
      status: "unauthorized",
      message: "Unknown lab_id/user_id pair",
    });
  }

  const allowedIps = (rec.user.ip_whitelist || []).map(normalizeIp);

  if (!allowedIps.includes(clientIp)) {
    return res.status(403).json({
      status: "forbidden",
      message: "IP not allowed for this user",
      clientIp,
    });
  }

  return next();
}

module.exports = ipAllowlist;
