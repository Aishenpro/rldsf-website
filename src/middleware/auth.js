const jwt = require("jsonwebtoken");
const config = require("../config/environment");

function authenticate(req, res, next) {
  const token = req.cookies.admin_token;

  if (!token) {
    return res.status(401).json({
      error: "Authentication required"
    });
  }

  try {
    req.admin = jwt.verify(token, config.JWT_SECRET, {
      issuer: "rosa-lomba-foundation",
      audience: "foundation-admin"
    });

    next();
  } catch {
    res.clearCookie("admin_token");

    return res.status(401).json({
      error: "Session expired"
    });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res.status(403).json({
        error: "Insufficient permissions"
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize
};
