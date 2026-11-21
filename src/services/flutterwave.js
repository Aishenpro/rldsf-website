const config = require("../config/environment");

const API = "https://api.flutterwave.com/v3";

async function request(endpoint, method, body) {
  if (!config.FLW_SECRET_KEY) {
    throw new Error("Flutterwave is not configured");
  }

  const response = await fetch(`${API}${endpoint}`, {
    method,

    headers: {
      Authorization: `Bearer ${config.FLW_SECRET_KEY}`,
      "Content-Type": "application/json"
    },

    ...(body ? {
      body: JSON.stringify(body)
    } : {})
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Flutterwave request failed"
    );
  }

  return result;
}

async function createCheckout(donation) {
  const amount = donation.amount_minor /
    (10 ** require("./donation").currencyExponent(
      donation.currency
    ));

  return request("/payments", "POST", {
    tx_ref: donation.reference,

    amount,
    currency: donation.currency,

    redirect_url:
      `${config.BASE_URL}/api/payments/flutterwave/callback`,

    customer: {
      email: donation.email,
      name: donation.donor_name
    },

    customizations: {
      title: "Rosa Lomba Da Silva Foundation",
      description: "Support our humanitarian programs"
    }
  });
}

async function verifyTransaction(transactionId) {
  if (!/^\d+$/.test(String(transactionId))) {
    throw new Error("Invalid Flutterwave transaction ID");
  }

  return request(
    `/transactions/${transactionId}/verify`,
    "GET"
  );
}

async function verifyReference(reference) {
  return request(
    `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
    "GET"
  );
}

module.exports = {
  createCheckout,
  verifyTransaction,
  verifyReference
};