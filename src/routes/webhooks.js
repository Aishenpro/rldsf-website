const express = require("express");
const crypto = require("crypto");

const config = require("../config/environment");
const db = require("../config/database");
const flutterwave = require("../services/flutterwave");
const { markPaid, fromMinorUnits } =
  require("../services/donation");
const websocket = require("../services/websocket");

const router = express.Router();

function safeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }

  const x = Buffer.from(a);
  const y = Buffer.from(b);

  return x.length === y.length &&
    crypto.timingSafeEqual(x, y);
}

router.post("/flutterwave", async (req, res) => {
  if (!safeCompare(
    req.get("verif-hash"),
    config.FLW_SECRET_HASH
  )) {
    return res.status(401).end();
  }

  try {
    const transactionId = String(req.body?.data?.id || "");

    if (!/^\d+$/.test(transactionId)) {
      return res.status(400).end();
    }

    const result = await flutterwave.verifyTransaction(
      transactionId
    );

    const payment = result.data;

    if (payment.status !== "successful") {
      return res.status(200).end();
    }

    const donation = db.prepare(`
      SELECT * FROM donations WHERE reference = ?
    `).get(payment.tx_ref);

    if (
      !donation ||
      donation.provider !== "flutterwave" ||
      payment.currency !== donation.currency ||
      Number(payment.amount) <
        fromMinorUnits(
          donation.amount_minor,
          donation.currency
        )
    ) {
      return res.status(400).end();
    }

    const processPayment = db.transaction(() => {
      const existing = db.prepare(`
        SELECT id FROM payment_events
        WHERE event_reference = ?
      `).get(transactionId);

      if (existing) return false;

      db.prepare(`
        INSERT INTO payment_events (
          provider,
          event_reference
        )
        VALUES ('flutterwave', ?)
      `).run(transactionId);

      markPaid(
        donation.reference,
        transactionId
      );

      return true;
    });

    const updated = processPayment();

    if (updated) {
      websocket.broadcast("donation.paid", {
        reference: donation.reference,
        amount: donation.amount_minor,
        currency: donation.currency
      });
    }

    return res.status(200).end();

  } catch (error) {
    console.error("Flutterwave webhook:", error.message);

    return res.status(500).end();
  }
});

module.exports = router;
