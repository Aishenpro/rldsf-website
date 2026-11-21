const express = require("express");

const db = require("../config/database");
const paypal = require("../services/paypal");
const flutterwave = require("../services/flutterwave");

const websocket = require("../services/websocket");

const {
  fromMinorUnits,
  markPaid
} = require("../services/donation");

const router = express.Router();

function getDonation(reference) {
  return db.prepare(`
    SELECT * FROM donations WHERE reference = ?
  `).get(reference);
}

// Create PayPal checkout.
router.post("/paypal/order", async (req, res) => {
  try {
    const donation = getDonation(req.body.reference);

    if (
      !donation ||
      donation.status !== "pending" ||
      donation.provider !== "paypal"
    ) {
      return res.status(400).json({
        error: "Invalid donation"
      });
    }

    const order = await paypal.createOrder(donation);

    res.json({
      orderId: order.id,
      status: order.status
    });
  } catch (error) {
    console.error("PayPal order error:", error.message);

    res.status(502).json({
      error: "Unable to initialize PayPal checkout"
    });
  }
});

// Capture PayPal payment after customer approval.
router.post("/paypal/capture", async (req, res) => {
  try {
    const orderId = req.body.orderId;

    if (
      typeof orderId !== "string" ||
      !/^[A-Za-z0-9-]{5,100}$/.test(orderId)
    ) {
      return res.status(400).json({
        error: "Invalid order ID"
      });
    }

    const result = await paypal.captureOrder(orderId);

    const unit = result.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];

    if (
      result.status !== "COMPLETED" ||
      capture?.status !== "COMPLETED" ||
      !unit?.custom_id
    ) {
      return res.status(400).json({
        error: "Payment has not been completed"
      });
    }

    const donation = db.prepare(`
      SELECT * FROM donations WHERE id = ?
    `).get(Number(unit.custom_id));

    if (
      !donation ||
      donation.provider !== "paypal" ||
      donation.status !== "pending" ||
      unit.reference_id !== donation.reference ||
      capture.amount.currency_code !== donation.currency ||
      Number(capture.amount.value) !==
        fromMinorUnits(donation.amount_minor, donation.currency)
    ) {
      return res.status(400).json({
        error: "Payment does not match donation"
      });
    }

    const updated = markPaid(
      donation.reference,
      capture.id
    );

    res.json({
      success: true,
      donation: {
        reference: updated.reference,
        status: updated.status
      }
    });

  } catch (error) {
    console.error("PayPal capture error:", error.message);

    res.status(502).json({
      error: "Unable to verify PayPal payment"
    });
  }
});

// Initialize Flutterwave checkout.
router.post("/flutterwave/checkout", async (req, res) => {
  try {
    const donation = getDonation(req.body.reference);

    if (
      !donation ||
      donation.status !== "pending" ||
      donation.provider !== "flutterwave"
    ) {
      return res.status(400).json({
        error: "Invalid donation"
      });
    }

    const result = await flutterwave.createCheckout(donation);

    if (!result.data?.link) {
      throw new Error("Checkout link missing");
    }

    res.json({
      checkoutUrl: result.data.link
    });

  } catch (error) {
    console.error("Flutterwave checkout error:", error.message);

    res.status(502).json({
      error: "Unable to initialize Flutterwave checkout"
    });
  }
});

// Flutterwave callback.
router.get("/flutterwave/callback", async (req, res) => {
  try {
    const {
      status,
      transaction_id: transactionId,
      tx_ref: reference
    } = req.query;

    if (
      status !== "successful" ||
      !transactionId ||
      !reference
    ) {
      return res.redirect("/payment/cancel");
    }

    const donation = getDonation(reference);

    if (
      !donation ||
      donation.provider !== "flutterwave"
    ) {
      return res.status(400).send("Invalid donation");
    }

    const result = await flutterwave.verifyTransaction(
      String(transactionId)
    );

    const payment = result.data;

    const expectedAmount = fromMinorUnits(
      donation.amount_minor,
      donation.currency
    );

    if (
      payment.status !== "successful" ||
      payment.tx_ref !== donation.reference ||
      payment.currency !== donation.currency ||
      Number(payment.amount) < expectedAmount
    ) {
      return res.status(400).send(
        "Payment verification failed"
      );
    }

    markPaid(donation.reference, String(payment.id));

    res.redirect("/payment/success");
    
    websocket.broadcast("donation.paid", {
      reference: donation.reference,
      amount: donation.amount_minor,
      currency: donation.currency
    });

  } catch (error) {
    console.error("Flutterwave verification:", error.message);

    res.status(502).send(
      "Unable to verify payment. Please contact the foundation."
    );
  }
});

module.exports = router;