
const http = require('node:http');
const path = require('node:path');

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const hpp = require('hpp');

const {
  WebSocketServer,
  WebSocket
} = require('ws');

const config = require('./xconfig');

require('./db');

const api = require('./routes/api');
const admin = require('./routes/xadmin');

const { apiLimiter } = require('./middleware/security');

const app = express();

if (config.trustProxy !== '0') {
  app.set('trust proxy', Number(config.trustProxy));
}

app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  }
}));

app.use(compression());

app.use(express.json({
  limit: '20kb'
}));

app.use(express.urlencoded({
  extended: false,
  limit: '20kb'
}));

app.use(cookieParser());

app.use(hpp());

app.use('/api', apiLimiter, api);
app.use('/api/admin', admin);

app.use(express.static(
  path.join(__dirname, '../public'),
  {
    etag: true,
    maxAge: config.env === 'production' ? '1d' : 0
  }
));


app.get('/', (req, res) => {
  res.sendFile(
    path.join(__dirname, '../public/index.html')
  );
});


app.use((error, req, res, next) => {
  console.error(error);

  res.status(500).json({
    error: 'Internal server error'
  });
});

const server = http.createServer(app);

const wss = new WebSocketServer({
  noServer: true,
  maxPayload: 1024
});

const clients = new Set();

server.on('upgrade', (request, socket, head) => {
  const url = new URL(
    request.url,
    config.origin
  );

  if (url.pathname !== '/ws') {
    socket.destroy();
    return;
  }

  if (
    config.env === 'production' &&
    url.origin !== config.origin
  ) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(
    request,
    socket,
    head,
    ws => wss.emit('connection', ws, request)
  );
});

wss.on('connection', ws => {
  clients.add(ws);

  ws.send(JSON.stringify({
    type: 'connected',
    message: 'WebSocket connection established'
  }));

  // This public socket is read-only.
  ws.on('message', () => {
    ws.close(1008, 'Client messages are not accepted');
  });

  ws.on('close', () => clients.delete(ws));

  ws.on('error', () => clients.delete(ws));
});

app.locals.broadcast = payload => {
  const message = JSON.stringify(payload);

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
};

server.listen(config.port, () => {
  console.log(
    `Foundation server running on port ${config.port}`
  );
});

function shutdown() {
  for (const client of clients) {
    client.close(1001, 'Server shutting down');
  }

  server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

