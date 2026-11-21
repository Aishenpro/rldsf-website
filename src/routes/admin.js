const express = require("express");
const db = require("../config/database");
const { authenticate, authorize } =
  require("../middleware/auth");
const audit = require("../utils/audit");

const router = express.Router();

router.use(authenticate);

// Dashboard statistics.
router.get("/dashboard", (req, res) => {
  const donations = db.prepare(`
    SELECT
      COUNT(*) AS total_donations,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END)
        AS successful_donations,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)
        AS pending_donations,
      COALESCE(
        SUM(CASE WHEN status = 'paid'
          THEN amount_minor ELSE 0 END),
        0
      ) AS total_amount
    FROM donations
  `).get();

  const content = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(status = 'published') AS published,
      SUM(status = 'draft') AS drafts
    FROM content
  `).get();

  const recent = db.prepare(`
    SELECT
      id,
      reference,
      donor_name,
      email,
      amount_minor,
      currency,
      provider,
      status,
      anonymous,
      created_at
    FROM donations
    ORDER BY id DESC
    LIMIT 10
  `).all();

  res.json({
    donations,
    content,
    recent
  });
});

// List administrators.
router.get(
  "/administrators",
  authorize("superadmin"),
  (req, res) => {
    const admins = db.prepare(`
      SELECT id, email, role, active, created_at, last_login
      FROM admins
      ORDER BY id DESC
    `).all();

    res.json({ admins });
  }
);

// Create administrator.
router.post(
  "/administrators",
  authorize("superadmin"),
  async (req, res) => {
    const { email, password, role } = req.body;

    const bcrypt = require("bcryptjs");

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      password.length < 12 ||
      !["admin", "editor"].includes(role)
    ) {
      return res.status(400).json({
        error: "Invalid administrator details"
      });
    }

    try {
      const hash = await bcrypt.hash(password, 12);

      const result = db.prepare(`
        INSERT INTO admins (email, password_hash, role)
        VALUES (?, ?, ?)
      `).run(email.toLowerCase().trim(), hash, role);

      audit(req, "administrator.created", "admin", result.lastInsertRowid);

      res.status(201).json({
        success: true,
        id: result.lastInsertRowid
      });
    } catch {
      res.status(409).json({
        error: "Administrator email already exists"
      });
    }
  }
);

// Donation listing with pagination.
router.get("/donations", (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const status = req.query.status;

  const allowed = ["pending", "paid", "failed", "refunded"];

  if (status && !allowed.includes(status)) {
    return res.status(400).json({
      error: "Invalid donation status"
    });
  }

  const donations = status
    ? db.prepare(`
        SELECT * FROM donations
        WHERE status = ?
        ORDER BY id DESC
        LIMIT ? OFFSET ?
      `).all(status, limit, offset)
    : db.prepare(`
        SELECT * FROM donations
        ORDER BY id DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset);

  res.json({
    page,
    limit,
    donations
  });
});

// Refund status is not changed here.
// A real provider refund must be executed and verified.
router.post(
  "/donations/:id/refund-status",
  authorize("superadmin"),
  (req, res) => {
    const donation = db.prepare(`
      SELECT * FROM donations WHERE id = ?
    `).get(req.params.id);

    if (!donation || donation.status !== "paid") {
      return res.status(400).json({
        error: "Donation cannot be marked refunded"
      });
    }

    if (req.body.confirmed !== true) {
      return res.status(400).json({
        error: "Provider refund confirmation required"
      });
    }

    res.status(409).json({
      error: "Connect and verify the provider refund before changing donation status"
    });
  }
);


router.get("/reports", (req, res) => {
  const totals = db.prepare(`
    SELECT
      currency,
      COUNT(*) AS donations,
      SUM(amount_minor) AS total_minor
    FROM donations
    WHERE status = 'paid'
    GROUP BY currency
  `).all();

  const monthly = db.prepare(`
    SELECT
      strftime('%Y-%m', created_at) AS month,
      currency,
      COUNT(*) AS donations,
      SUM(amount_minor) AS total_minor
    FROM donations
    WHERE status = 'paid'
    GROUP BY month, currency
    ORDER BY month DESC
    LIMIT 120
  `).all();

  res.json({
    totals,
    monthly
  });
});

module.exports = router;
