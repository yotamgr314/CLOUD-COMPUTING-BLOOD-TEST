const jwt = require("jsonwebtoken");
const { writeAudit } = require("../utils/auditLogger");

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff && typeof xff === "string") return xff.split(",")[0].trim();
  return req.ip;
}

function jwtAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    writeAudit({
      action: "unauthorized",
      stage: "jwtAuth",
      clientIp: getClientIp(req),
      reason: "Missing or invalid Authorization header",
      path: req.originalUrl,
      method: req.method,
    });

    return res.status(401).json({
      status: "unauthorized",
      message:
        "Missing or invalid Authorization header (expected: Bearer <token>)",
    });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({
      status: "error",
      message: "Server misconfiguration: JWT_SECRET is missing",
    });
  }

  try {
    const payload = jwt.verify(token, secret);

    if (!payload || !payload.lab_id || !payload.user_id) {
      writeAudit({
        action: "unauthorized",
        stage: "jwtAuth",
        clientIp: getClientIp(req),
        reason: "Token valid but missing lab_id or user_id",
        path: req.originalUrl,
        method: req.method,
      });

      return res.status(401).json({
        status: "unauthorized",
        message: "Token valid but missing lab_id or user_id",
      });
    }

    req.auth = payload;
    return next();
  } catch {
    writeAudit({
      action: "unauthorized",
      stage: "jwtAuth",
      clientIp: getClientIp(req),
      reason: "Invalid or expired token",
      path: req.originalUrl,
      method: req.method,
    });

    return res.status(401).json({
      status: "unauthorized",
      message: "Invalid or expired token",
    });
  }
}

module.exports = jwtAuth;
