const http = require("http");

const app = require("./src/app");
const config = require("./src/config/environment");

const websocket = require("./src/services/websocket");

const server = http.createServer(app);

websocket.initialize(server);

server.listen(config.PORT, "0.0.0.0", () => {
  console.log(
    `Foundation server listening on port ${config.PORT}`
  );

  console.log(
    `Environment: ${config.NODE_ENV}`
  );
});

// Graceful shutdown.
function shutdown() {
  console.log("Shutting down server...");

  server.close(() => {
    require("./src/config/database").close();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
