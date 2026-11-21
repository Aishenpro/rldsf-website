const express = require("express");
const crypto = require("crypto");

const config = require("../config/environment");
const db = require("../config/database");
const flutterwave = require("../services/flutterwave");
const { markPaid, fromMinorUnits } =
  require("../services/donation");

const router = express.Router();

function safeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }

  const first = Buffer.from(a);
  const second = Buffer.from(b);

  return first.length === second.length &&
    crypto.timingSafeEqual(first, second);
}

router.post("/flutterwave", async (req, res) => {
  const signature = req.get("verif-hash");

  if (
    !config.FLW_SECRET_HASH ||
    !safeCompare(signature, config.FLW_SECRET_HASH)
  ) {
    return res.status(401).end();
  }

  // Acknowledge the authenticated notification.
  res.status(200).end();

  try {
    const transactionId = req.body?.data?.id;

    if (!transactionId) return;

    const verified = await flutterwave.verifyTransaction(
      String(transactionId)
    );

    const payment = verified.data;

    if (payment.status !== "successful") return;

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
      console.error("Webhook payment mismatch");
      return;
    }

    const transaction = db.transaction(() => {
      const eventReference = String(payment.id);

      const existing = db.prepare(`
        SELECT id FROM payment_events
        WHERE provider = 'flutterwave'
        AND event_reference = ?
      `).get(eventReference);

      if (existing) return;

      db.prepare(`
        INSERT INTO payment_events (
          provider,
          event_reference
        )
        VALUES ('flutterwave', ?)
      `).run(eventReference);

      markPaid(
        donation.reference,
        eventReference
      );
    });

    transaction();

    console.log("Verified donation:", donation.reference);

    // Dashboard notifications are published separately
    // by the WebSocket service.

  } catch (error) {
    console.error("Webhook processing error:", error.message);
  }
});

module.exports = router;