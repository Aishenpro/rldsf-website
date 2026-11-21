const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const config = require("../config/environment");

let wss;

function parseCookies(header = "") {
  const result = {};

  for (const item of header.split(";")) {
    const index = item.indexOf("=");

    if (index < 0) continue;

    const key = item.slice(0, index).trim();
    const value = item.slice(index + 1).trim();

    result[key] = decodeURIComponent(value);
  }

  return result;
}

function initialize(server) {
  wss = new WebSocket.Server({
    noServer: true,
    maxPayload: 1024
  });

  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(
      request.url,
      "http://localhost"
    ).pathname;

    if (pathname !== "/ws") {
      socket.destroy();
      return;
    }

    const cookies = parseCookies(
      request.headers.cookie
    );

    try {
      const admin = jwt.verify(
        cookies.admin_token,
        config.JWT_SECRET,
        {
          issuer: "rosa-lomba-foundation",
          audience: "foundation-admin"
        }
      );

      request.admin = admin;

      wss.handleUpgrade(
        request,
        socket,
        head,
        ws => {
          wss.emit("connection", ws, request);
        }
      );

    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
  });

  wss.on("connection", (ws, request) => {
    ws.admin = request.admin;

    ws.send(JSON.stringify({
      type: "connected",
      message: "Admin dashboard connected"
    }));

    ws.on("message", message => {
      // The client cannot issue privileged commands.
      // This socket is notification-only.
      if (message.length > 1024) {
        ws.close();
      }
    });
  });

  return wss;
}

function broadcast(event, data) {
  if (!wss) return;

  const message = JSON.stringify({
    type: event,
    data,
    timestamp: new Date().toISOString()
  });

  for (const client of wss.clients) {
    if (
      client.readyState === WebSocket.OPEN &&
      client.admin?.role
    ) {
      client.send(message);
    }
  }
}

module.exports = {
  initialize,
  broadcast
};