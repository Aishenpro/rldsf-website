const config = require("../config/environment");

const API =
  config.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function accessToken() {
  if (
    !config.PAYPAL_CLIENT_ID ||
    !config.PAYPAL_CLIENT_SECRET
  ) {
    throw new Error("PayPal credentials are not configured");
  }

  const credentials = Buffer.from(
    `${config.PAYPAL_CLIENT_ID}:${config.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(`${API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error("PayPal authentication failed");
  }

  return result.access_token;
}

async function request(endpoint, method, body) {
  const token = await accessToken();

  const response = await fetch(`${API}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "PayPal request failed"
    );
  }

  return result;
}

async function createOrder(donation) {
  const amount = (
    donation.amount_minor / 100
  ).toFixed(2);

  return request("/v2/checkout/orders", "POST", {
    intent: "CAPTURE",

    purchase_units: [{
      reference_id: donation.reference,
      custom_id: String(donation.id),
      invoice_id: donation.reference,

      description: "Donation to Rosa Lomba Da Silva Foundation",

      amount: {
        currency_code: donation.currency,
        value: amount
      }
    }],

    payment_source: {
      paypal: {
        experience_context: {
          return_url:
            `${config.BASE_URL}/payment/success`,
          cancel_url:
            `${config.BASE_URL}/payment/cancel`,
          user_action: "PAY_NOW"
        }
      }
    }
  });
}

async function captureOrder(orderId) {
  return request(
    `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    "POST"
  );
}

module.exports = {
  createOrder,
  captureOrder
};