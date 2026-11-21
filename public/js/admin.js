"use strict";

const $ = selector => document.querySelector(selector);

const csrfCookie = () => {
  const item = document.cookie
    .split("; ")
    .find(value => value.startsWith("csrf_token="));

  return item
    ? decodeURIComponent(item.split("=").slice(1).join("="))
    : "";
};

async function getCsrf() {
  await fetch("/api/auth/csrf", {
    credentials: "same-origin"
  });

  return csrfCookie();
}

async function api(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();

  const headers = {
    ...(options.headers || {})
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers["X-CSRF-Token"] = csrfCookie();
  }

  const response = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: "same-origin"
  });

  const result = await response.json().catch(() => ({}));

  if (response.status === 401) {
    if (location.pathname !== "/admin/login") {
      location.href = "/admin/login";
    }
  }

  if (!response.ok) {
    throw new Error(result.error || "Request failed");
  }

  return result;
}

function notify(message) {
  const toast = $("#toast");

  if (!toast) return;

  toast.textContent = message;
  toast.style.display = "block";

  setTimeout(() => {
    toast.style.display = "none";
  }, 3000);
}

function element(tag, value, className) {
  const node = document.createElement(tag);

  if (value !== undefined && value !== null) {
    node.textContent = String(value);
  }

  if (className) node.className = className;

  return node;
}

function addCell(row, value, className) {
  const cell = element("td", value, className);
  row.appendChild(cell);
  return cell;
}

function addStatus(row, status) {
  const cell = document.createElement("td");

  cell.appendChild(
    element("span", status, `status ${status}`)
  );

  row.appendChild(cell);
}

function currencyAmount(amountMinor, currency) {
  const zeroDecimal = [
    "UGX", "KES", "TZS", "RWF", "JPY"
  ];

  const amount = amountMinor /
    (zeroDecimal.includes(currency) ? 1 : 100);

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: zeroDecimal.includes(currency) ? 0 : 2
  }).format(amount);
}

/* --------------------------------
   LOGIN
-------------------------------- */

async function loginPage() {
  await getCsrf();

  const form = $("#loginForm");

  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const button = $("#loginButton");
    const error = $("#loginError");

    button.disabled = true;
    button.textContent = "Signing in...";
    error.textContent = "";

    try {
      await api("/api/auth/login", {
        method: "POST",

        body: JSON.stringify({
          email: $("#email").value,
          password: $("#password").value
        })
      });

      location.href = "/admin";

    } catch (err) {
      error.textContent = err.message;
    } finally {
      button.disabled = false;
      button.textContent = "Sign In";
    }
  });
}

/* --------------------------------
   AUTHENTICATION
-------------------------------- */

async function loadAdmin() {
  const result = await api("/api/auth/me");

  $("#adminEmail").textContent =
    result.admin.email;

  return result.admin;
}

/* --------------------------------
   NAVIGATION
-------------------------------- */

function initializeNavigation() {
  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
      const section = button.dataset.section;

      document.querySelectorAll(".dashboard-section")
        .forEach(item => item.classList.add("hidden"));

      document.querySelectorAll(".nav-item")
        .forEach(item => item.classList.remove("active"));

      $(`#${section}`).classList.remove("hidden");

      button.classList.add("active");

      $("#pageTitle").textContent =
        section.charAt(0).toUpperCase() + section.slice(1);

      if (section === "content") loadContent();
      if (section === "donations") loadDonations();
      if (section === "reports") loadReports();
    });
  });
}

/* --------------------------------
   DASHBOARD
-------------------------------- */

async function loadDashboard() {
  const result = await api("/api/admin/dashboard");

  const stats = result.donations;

  $("#totalDonations").textContent =
    stats.total_donations || 0;

  $("#successfulDonations").textContent =
    stats.successful_donations || 0;

  $("#pendingDonations").textContent =
    stats.pending_donations || 0;

  // Do not combine different currencies into one figure.
  $("#totalAmount").textContent = "See reports";

  const table = $("#recentDonations");

  table.replaceChildren();

  result.recent.forEach(donation => {
    const row = document.createElement("tr");

    addCell(row, donation.reference);
    addCell(row, donation.anonymous
      ? "Anonymous"
      : donation.donor_name);

    addCell(row, currencyAmount(
      donation.amount_minor,
      donation.currency
    ));

    addCell(row, donation.provider);
    addStatus(row, donation.status);

    table.appendChild(row);
  });
}

/* --------------------------------
   CONTENT MANAGEMENT
-------------------------------- */

async function loadContent() {
  const result = await api("/api/content");

  const table = $("#contentTable");

  table.replaceChildren();

  result.items.forEach(item => {
    const row = document.createElement("tr");

    addCell(row, item.title);
    addCell(row, item.type);
    addStatus(row, item.status);
    addCell(row, item.updated_at);

    const actions = document.createElement("td");

    const edit = element(
      "button",
      "Edit",
      "action-button"
    );

    edit.type = "button";

    edit.addEventListener("click", () => {
      editContent(item);
    });

    const remove = element(
      "button",
      "Delete",
      "action-button delete"
    );

    remove.type = "button";

    remove.addEventListener("click", async () => {
      if (!confirm(`Delete "${item.title}"?`)) return;

      try {
        await api(`/api/content/${item.id}`, {
          method: "DELETE"
        });

        notify("Content deleted");
        loadContent();

      } catch (error) {
        notify(error.message);
      }
    });

    actions.append(edit, remove);
    row.appendChild(actions);

    table.appendChild(row);
  });
}

function editContent(item) {
  $("#contentId").value = item.id;
  $("#contentType").value = item.type;
  $("#contentTitle").value = item.title;
  $("#contentSlug").value = item.slug;
  $("#contentImage").value = item.image || "";
  $("#contentBody").value = item.body || "";
  $("#contentStatus").value = item.status;

  $("#editorTitle").textContent = "Edit Content";

  $("#contentEditor").classList.remove("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function initializeContentEditor() {
  $("#newContentButton").addEventListener("click", () => {
    $("#contentForm").reset();
    $("#contentId").value = "";

    $("#editorTitle").textContent = "Create Content";

    $("#contentEditor").classList.remove("hidden");
  });

  $("#cancelContent").addEventListener("click", () => {
    $("#contentEditor").classList.add("hidden");
  });

  $("#contentTitle").addEventListener("input", event => {
    const slug = event.target.value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (!$("#contentId").value) {
      $("#contentSlug").value = slug;
    }
  });

  $("#contentForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = $("#contentId").value;

    const data = {
      type: $("#contentType").value,
      title: $("#contentTitle").value,
      slug: $("#contentSlug").value,
      image: $("#contentImage").value,
      body: $("#contentBody").value,
      status: $("#contentStatus").value
    };

    try {
      await api(
        id ? `/api/content/${id}` : "/api/content",
        {
          method: id ? "PUT" : "POST",
          body: JSON.stringify(data)
        }
      );

      notify("Content saved successfully");

      $("#contentEditor").classList.add("hidden");

      $("#contentForm").reset();

      loadContent();

    } catch (error) {
      notify(error.message);
    }
  });
}

/* --------------------------------
   DONATIONS
-------------------------------- */

async function loadDonations() {
  const result = await api(
    "/api/admin/donations?limit=100"
  );

  const table = $("#donationTable");

  table.replaceChildren();

  result.donations.forEach(donation => {
    const row = document.createElement("tr");

    addCell(row, donation.reference);

    addCell(
      row,
      donation.anonymous
        ? "Anonymous"
        : donation.donor_name
    );

    addCell(row, donation.email);

    addCell(row, currencyAmount(
      donation.amount_minor,
      donation.currency
    ));

    addCell(row, donation.currency);
    addCell(row, donation.provider);
    addStatus(row, donation.status);
    addCell(row, donation.created_at);

    table.appendChild(row);
  });
}

/* --------------------------------
   REPORTS
-------------------------------- */

async function xloadReports() {
  const result = await api(
    "/api/admin/donations?limit=100"
  );

  const totals = {};

  result.donations.forEach(donation => {
    if (donation.status !== "paid") return;

    totals[donation.currency] =
      (totals[donation.currency] || 0) +
      donation.amount_minor;
  });

  const report = Object.entries(totals)
    .map(([currency, amount]) => {
      return currencyAmount(amount, currency);
    });

  $("#reportSummary").textContent =
    report.length
      ? `Verified donations: ${report.join(" | ")}`
      : "No successful donations recorded.";
}


async function loadReports() {
  const result = await api("/api/admin/reports");

  const lines = result.totals.map(item => {
    return `${item.currency}: ${currencyAmount(
      item.total_minor,
      item.currency
    )} (${item.donations} donations)`;
  });

  $("#reportSummary").textContent =
    lines.length
      ? lines.join(" | ")
      : "No successful donations recorded.";
}


/* --------------------------------
   WEBSOCKETS
-------------------------------- */

function connectWebSocket() {
  const protocol =
    location.protocol === "https:" ? "wss:" : "ws:";

  const socket = new WebSocket(
    `${protocol}//${location.host}/ws`
  );

  socket.onopen = () => {
    $("#connectionStatus").textContent = "Live";
  };

  socket.onclose = () => {
    $("#connectionStatus").textContent = "Disconnected";

    setTimeout(connectWebSocket, 5000);
  };

  socket.onerror = () => {
    $("#connectionStatus").textContent = "Connection error";
  };

  socket.onmessage = event => {
    try {
      const message = JSON.parse(event.data);

      if (message.type === "donation.created" ||
          message.type === "donation.paid") {
        notify("Donation activity updated");

        loadDashboard();
        loadDonations();
      }

    } catch {
      console.error("Invalid WebSocket message");
    }
  };
}

/* --------------------------------
   LOGOUT
-------------------------------- */

function initializeLogout() {
  $("#logoutButton").addEventListener("click", async () => {
    try {
      await api("/api/auth/logout", {
        method: "POST"
      });
    } finally {
      location.href = "/admin/login";
    }
  });
}

/* --------------------------------
   INITIALIZATION
-------------------------------- */

async function dashboardPage() {
  try {
    await getCsrf();

    await loadAdmin();

    initializeNavigation();
    initializeContentEditor();
    initializeLogout();

    await loadDashboard();

    connectWebSocket();

  } catch {
    location.href = "/admin/login";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if ($("#loginForm")) {
    loginPage();
  }

  if ($("#overview")) {
    dashboardPage();
  }
});