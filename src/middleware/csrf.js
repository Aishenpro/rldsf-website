const crypto = require("crypto");

function csrf(req, res, next) {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];

  if (safeMethods.includes(req.method)) {
    return next();
  }

  if (req.path.startsWith("/api/webhooks/")) {
    return next();
  }

  const cookie = req.cookies.csrf_token;
  const header = req.get("x-csrf-token");

  if (!cookie || !header) {
    return res.status(403).json({
      error: "CSRF token required"
    });
  }

  const a = Buffer.from(cookie);
  const b = Buffer.from(header);

  if (
    a.length !== b.length ||
    !crypto.timingSafeEqual(a, b)
  ) {
    return res.status(403).json({
      error: "Invalid CSRF token"
    });
  }

  next();
}

module.exports = csrf;