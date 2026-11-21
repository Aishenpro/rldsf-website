
const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/xauth');

const router = express.Router();

router.use(requireAdmin);

router.get('/summary', (req, res) => {
  const donations = db.prepare(`
    SELECT COUNT(*) AS total
    FROM donations
  `).get();

  const contacts = db.prepare(`
    SELECT COUNT(*) AS total
    FROM contact_messages
  `).get();

  const subscribers = db.prepare(`
    SELECT COUNT(*) AS total
    FROM subscribers
    WHERE active = 1
  `).get();

  const programs = db.prepare(`
    SELECT COUNT(*) AS total
    FROM programs
    WHERE active = 1
  `).get();

  res.json({
    donations: donations.total,
    contacts: contacts.total,
    subscribers: subscribers.total,
    programs: programs.total
  });
});

router.get('/donations', (req, res) => {
  const rows = db.prepare(`
    SELECT
      id,
      donor_name,
      email,
      amount_minor,
      currency,
      status,
      created_at
    FROM donations
    ORDER BY id DESC
    LIMIT 100
  `).all();

  res.json(rows);
});

router.get('/messages', (req, res) => {
  const rows = db.prepare(`
    SELECT *
    FROM contact_messages
    ORDER BY id DESC
    LIMIT 100
  `).all();

  res.json(rows);
});

module.exports = router;

