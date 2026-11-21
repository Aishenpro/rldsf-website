const express = require("express");
const { z } = require("zod");

const db = require("../config/database");
const { authenticate, authorize } =
  require("../middleware/auth");
const audit = require("../utils/audit");

const router = express.Router();

const contentSchema = z.object({
  type: z.enum([
    "page",
    "program",
    "project",
    "news",
    "event",
    "gallery"
  ]),
  slug: z.string().min(2).max(150)
    .regex(/^[a-z0-9-]+$/),
  title: z.string().min(2).max(200),
  body: z.string().max(50000).default(""),
  image: z.string().url().optional().or(z.literal("")),
  status: z.enum([
    "draft",
    "published",
    "archived"
  ]).default("draft")
});

// Public published content.
router.get("/public", (req, res) => {
  const type = req.query.type;

  const items = type
    ? db.prepare(`
        SELECT id, type, slug, title, body, image, updated_at
        FROM content
        WHERE type = ? AND status = 'published'
        ORDER BY id DESC
      `).all(type)
    : db.prepare(`
        SELECT id, type, slug, title, body, image, updated_at
        FROM content
        WHERE status = 'published'
        ORDER BY id DESC
      `).all();

  res.json({ items });
});

// Admin content operations.
router.use(authenticate);

// List all content.
router.get("/", (req, res) => {
  const items = db.prepare(`
    SELECT * FROM content
    ORDER BY updated_at DESC
  `).all();

  res.json({ items });
});

// Create content.
router.post(
  "/",
  authorize("superadmin", "admin", "editor"),
  (req, res) => {
    const parsed = contentSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid content",
        details: parsed.error.flatten()
      });
    }

    const item = parsed.data;

    try {
      const result = db.prepare(`
        INSERT INTO content (
          type, slug, title, body, image, status, created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        item.type,
        item.slug,
        item.title,
        item.body,
        item.image || null,
        item.status,
        req.admin.id
      );

      audit(req, "content.created", "content", result.lastInsertRowid);

      res.status(201).json({
        success: true,
        id: result.lastInsertRowid
      });
    } catch {
      res.status(409).json({
        error: "Content slug already exists"
      });
    }
  }
);

// Update content.
router.put(
  "/:id",
  authorize("superadmin", "admin", "editor"),
  (req, res) => {
    const parsed = contentSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid content"
      });
    }

    const item = parsed.data;

    const result = db.prepare(`
      UPDATE content
      SET
        type = ?,
        slug = ?,
        title = ?,
        body = ?,
        image = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      item.type,
      item.slug,
      item.title,
      item.body,
      item.image || null,
      item.status,
      req.params.id
    );

    if (!result.changes) {
      return res.status(404).json({
        error: "Content not found"
      });
    }

    audit(req, "content.updated", "content", req.params.id);

    res.json({ success: true });
  }
);

// Delete content.
router.delete(
  "/:id",
  authorize("superadmin", "admin"),
  (req, res) => {
    const result = db.prepare(`
      DELETE FROM content WHERE id = ?
    `).run(req.params.id);

    if (!result.changes) {
      return res.status(404).json({
        error: "Content not found"
      });
    }

    audit(req, "content.deleted", "content", req.params.id);

    res.json({ success: true });
  }
);

module.exports = router;