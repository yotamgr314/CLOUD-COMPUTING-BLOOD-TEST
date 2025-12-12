const jwt = require("jsonwebtoken");

function jwtAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
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

    if (!payload || !payload.lab_id) {
      return res.status(401).json({
        status: "unauthorized",
        message: "Token valid but missing lab_id",
      });
    }

    req.lab = payload;
    next();
  } catch {
    return res.status(401).json({
      status: "unauthorized",
      message: "Invalid or expired token",
    });
  }
}

module.exports = jwtAuth;
