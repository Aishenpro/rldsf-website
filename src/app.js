const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { rateLimit } = require("express-rate-limit");
const path = require("path");

const config = require("./config/environment");
const csrf = require("./middleware/csrf");

const app = express();

require("./models/schema");

// Security headers.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", "wss:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));

app.disable("x-powered-by");

app.set("trust proxy", 1);

app.use(express.json({
  limit: "100kb"
}));

app.use(express.urlencoded({
  extended: false,
  limit: "20kb"
}));

app.use(cookieParser());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false
});

// API routes.
app.use("/api", apiLimiter);

// Public webhook is excluded from CSRF.
app.use("/api/webhooks", require("./routes/webhooks"));

app.use("/api", csrf);

app.use("/api/auth/login", loginLimiter);

app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/content", require("./routes/content"));
app.use("/api/donations", require("./routes/donations"));
app.use("/api/payments", require("./routes/payments"));

// Static frontend.
app.use(express.static(
  path.join(__dirname, "../public"),
  {
    index: "index.html",
    dotfiles: "deny",
    maxAge: config.NODE_ENV === "production"
      ? "1d"
      : 0
  }
));

// Admin interface.
app.get("/admin", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/admin/index.html")
  );
});

app.get("/admin/login", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/admin/login.html")
  );
});

// Health endpoint.
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "rosa-lomba-foundation"
  });
});

// API error handler.
app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) return next(err);

  res.status(500).json({
    error: "Internal server error"
  });
});

module.exports = app;