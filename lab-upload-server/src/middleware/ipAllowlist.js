function normalizeIp(ip) {
  // Express לפעמים מחזיר IPv6-mapped IPv4 בפורמט ::ffff:1.2.3.4
  if (typeof ip === "string" && ip.startsWith("::ffff:")) {
    return ip.replace("::ffff:", "");
  }
  return ip;
}

function getClientIp(req) {
  // אם יש reverse proxy / load balancer, ה-IP יכול להגיע ב-x-forwarded-for
  const xff = req.headers["x-forwarded-for"];
  if (xff && typeof xff === "string") {
    // לוקחים את הראשון (המקורי)
    return xff.split(",")[0].trim();
  }
  return req.ip;
}

function ipAllowlist(req, res, next) {
  const raw = process.env.ALLOWED_IPS || "";
  const allowed = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const clientIp = normalizeIp(getClientIp(req));

  if (allowed.length === 0) {
    return res.status(500).json({
      status: "error",
      message: "Server misconfiguration: ALLOWED_IPS is empty",
    });
  }

  if (!allowed.includes(clientIp)) {
    return res.status(403).json({
      status: "forbidden",
      message: "IP not allowed",
      clientIp,
    });
  }

  return next();
}

module.exports = ipAllowlist;
