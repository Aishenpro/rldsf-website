const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const db = require("../config/database");
const config = require("../config/environment");
const { verifyPassword } = require("../utils/password");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const cookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: "strict",
  path: "/"
};

// Generate a CSRF token before login.
router.get("/csrf", (req, res) => {
  const token = crypto.randomBytes(32).toString("hex");

  res.cookie("csrf_token", token, {
    httpOnly: false,
    secure: config.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 1000
  });

  res.json({ csrfToken: token });
});

// Administrator login.
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.length > 254 ||
    password.length > 200
  ) {
    return res.status(400).json({
      error: "Invalid login details"
    });
  }

  const admin = db.prepare(`
    SELECT *
    FROM admins
    WHERE email = ? AND active = 1
  `).get(email.trim().toLowerCase());

  if (
    !admin ||
    !(await verifyPassword(password, admin.password_hash))
  ) {
    return res.status(401).json({
      error: "Invalid email or password"
    });
  }

  const token = jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      role: admin.role
    },
    config.JWT_SECRET,
    {
      expiresIn: "2h",
      issuer: "rosa-lomba-foundation",
      audience: "foundation-admin"
    }
  );

  res.cookie("admin_token", token, {
    ...cookieOptions,
    maxAge: 2 * 60 * 60 * 1000
  });

  db.prepare(`
    UPDATE admins
    SET last_login = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(admin.id);

  res.json({
    success: true,
    admin: {
      id: admin.id,
      email: admin.email,
      role: admin.role
    }
  });
});

// Get current administrator.
router.get("/me", authenticate, (req, res) => {
  res.json({
    admin: req.admin
  });
});

// Logout.
router.post("/logout", (req, res) => {
  res.clearCookie("admin_token", cookieOptions);
  res.clearCookie("csrf_token", {
    path: "/"
  });

  res.json({ success: true });
});

module.exports = router;