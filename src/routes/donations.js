const express = require("express");
const crypto = require("crypto");

const db = require("../config/database");
const config = require("../config/environment");

const websocket = require("../services/websocket");

const {
  toMinorUnits
} = require("../services/donation");

const router = express.Router();

router.post("/", (req, res) => {
  const {
    name,
    email,
    phone,
    amount,
    currency,
    provider,
    anonymous
  } = req.body;

  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.length > 150 ||
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !["paypal", "flutterwave"].includes(provider)
  ) {
    return res.status(400).json({
      error: "Invalid donation information"
    });
  }

  const selectedCurrency =
    String(currency || config.DEFAULT_CURRENCY).toUpperCase();

  if (!/^[A-Z]{3}$/.test(selectedCurrency)) {
    return res.status(400).json({
      error: "Invalid currency"
    });
  }

  let amountMinor;

  try {
    amountMinor = toMinorUnits(
      Number(amount),
      selectedCurrency
    );
  } catch {
    return res.status(400).json({
      error: "Invalid donation amount"
    });
  }

  const majorAmount = Number(amount);

  if (
    majorAmount < config.MIN_DONATION ||
    majorAmount > config.MAX_DONATION
  ) {
    return res.status(400).json({
      error: "Donation amount is outside the allowed range"
    });
  }

  if (
    provider === "paypal" &&
    selectedCurrency !== "USD"
  ) {
    return res.status(400).json({
      error: "This PayPal checkout currently supports USD only"
    });
  }

  const reference = crypto.randomUUID();

  db.prepare(`
    INSERT INTO donations (
      reference,
      donor_name,
      email,
      phone,
      amount_minor,
      currency,
      provider,
      anonymous
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    reference,
    name.trim(),
    email.trim().toLowerCase(),
    typeof phone === "string" ? phone.slice(0, 30) : null,
    amountMinor,
    selectedCurrency,
    provider,
    anonymous === true ? 1 : 0
  );

  res.status(201).json({
    success: true,
    reference
  });
  
  websocket.broadcast("donation.created", {
      reference,
      amount: amountMinor,
      currency: selectedCurrency
    });

});

module.exports = router;