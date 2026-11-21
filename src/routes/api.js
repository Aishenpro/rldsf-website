
const express = require('express');
const { z } = require('zod');

const db = require('../db');
const { renderPage, renderPrograms } = require('../services/html');
const { formLimiter } = require('../middleware/security');

const router = express.Router();

const emailSchema = z.string().trim().email().max(254);

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'rosa-foundation-api'
  });
});

// Server-generated HTML pages
router.get('/pages/:slug', (req, res) => {
  const html = renderPage(req.params.slug);

  if (!html) {
    return res.status(404).json({
      error: 'Page not found'
    });
  }

  res.type('html').send(html);
});

// Server-generated HTML components
router.get('/components/programs', (req, res) => {
  const programs = db.prepare(`
    SELECT title, summary, image
    FROM programs
    WHERE active = 1
    ORDER BY id
  `).all();

  res.type('html').send(renderPrograms(programs));
});

// Program information
router.get('/programs', (req, res) => {
  const programs = db.prepare(`
    SELECT id, slug, title, summary, image
    FROM programs
    WHERE active = 1
    ORDER BY id
  `).all();

  res.json(programs);
});

// Donation pledge
router.post('/donations', formLimiter, (req, res) => {
  const schema = z.object({
    name: z.string().trim().max(100).optional().default(''),
    email: emailSchema,
    amount: z.coerce.number().int().min(1).max(100000000),
    currency: z.enum(['UGX', 'USD', 'EUR']).default('USD'),
    message: z.string().trim().max(500).optional().default('')
  });

  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid donation information'
    });
  }

  const d = parsed.data;

  const result = db.prepare(`
    INSERT INTO donations
    (donor_name, email, amount_minor, currency, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    d.name || null,
    d.email.toLowerCase(),
    d.amount,
    d.currency,
    d.message || null
  );

  req.app.locals.broadcast({
    type: 'donation_pledge',
    id: result.lastInsertRowid
  });

  res.status(201).json({
    success: true,
    reference: `PLEDGE-${result.lastInsertRowid}`,
    message: 'Donation pledge received successfully.'
  });
});

// Contact form
router.post('/contact', formLimiter, (req, res) => {
  const schema = z.object({
    name: z.string().trim().min(1).max(100),
    email: emailSchema,
    subject: z.string().trim().min(2).max(120),
    message: z.string().trim().min(5).max(3000)
  });

  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid contact information'
    });
  }

  const d = parsed.data;

  db.prepare(`
    INSERT INTO contact_messages
    (name, email, subject, message)
    VALUES (?, ?, ?, ?)
  `).run(
    d.name,
    d.email.toLowerCase(),
    d.subject,
    d.message
  );

  res.status(201).json({
    success: true,
    message: 'Your message has been received.'
  });
});

// Newsletter subscription
router.post('/newsletter', formLimiter, (req, res) => {
  const parsed = z.object({
    email: emailSchema
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid email address'
    });
  }

  try {
    db.prepare(`
      INSERT INTO subscribers (email)
      VALUES (?)
    `).run(parsed.data.email.toLowerCase());

  } catch (error) {
    if (error.code !== 'SQLITE_CONSTRAINT_UNIQUE') {
      throw error;
    }
  }

  res.status(201).json({
    success: true,
    message: 'Subscription received.'
  });
});

module.exports = router;

