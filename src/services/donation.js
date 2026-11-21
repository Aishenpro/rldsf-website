const db = require("../config/database");

function currencyExponent(currency) {
  const zeroDecimal = [
    "UGX", "KES", "TZS", "RWF", "JPY"
  ];

  return zeroDecimal.includes(currency.toUpperCase()) ? 0 : 2;
}

function toMinorUnits(amount, currency) {
  const exponent = currencyExponent(currency);
  const factor = 10 ** exponent;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid donation amount");
  }

  const result = Math.round(amount * factor);

  if (Math.abs(result / factor - amount) > 0.000001) {
    throw new Error("Invalid currency precision");
  }

  return result;
}

function fromMinorUnits(amount, currency) {
  return amount / (10 ** currencyExponent(currency));
}

function markPaid(reference, providerReference) {
  const transaction = db.transaction(() => {
    const donation = db.prepare(`
      SELECT * FROM donations WHERE reference = ?
    `).get(reference);

    if (!donation) {
      throw new Error("Donation not found");
    }

    if (donation.status === "paid") {
      return donation;
    }

    if (donation.status !== "pending") {
      throw new Error("Donation is not pending");
    }

    db.prepare(`
      UPDATE donations
      SET
        status = 'paid',
        provider_reference = ?,
        paid_at = CURRENT_TIMESTAMP
      WHERE reference = ? AND status = 'pending'
    `).run(providerReference, reference);

    return db.prepare(`
      SELECT * FROM donations WHERE reference = ?
    `).get(reference);
  });

  return transaction();
}

module.exports = {
  currencyExponent,
  toMinorUnits,
  fromMinorUnits,
  markPaid
};