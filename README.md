
# Rosa Lomba Da Silva Foundation

Responsive NGO and charity website.

## Technology

- Node.js 20+
- Express 5
- WebSockets
- SQLite
- HTML5
- CSS3
- Vanilla JavaScript

## Installation

Clone or enter the project directory:

```bash
cd rosa-lomba-foundation
```

Install dependencies:

```bash
npm install
```

Configure environment:

```bash
cp .env.example .env
```

Initialize database:

```bash
npm run db:init
```

Seed programs:

```bash
npm run db:seed
```

Start development:

```bash
npm run dev
```

Start production:

```bash
npm start
```

Open:

http://localhost:3000

## API endpoints

GET /api/health

GET /api/pages/:slug

GET /api/programs

GET /api/components/programs

POST /api/donations

POST /api/contact

POST /api/newsletter

GET /api/admin/summary

GET /api/admin/donations

GET /api/admin/messages

## WebSocket

Connect:

ws://localhost:3000/ws

Example event:

{
  "type": "donation_pledge",
  "id": 12
}

## Important

Donation submissions currently create pledges.
They do not charge customers.

Configure and verify an official payment gateway
before accepting real payments.

Configure admin authentication, MFA, email delivery,
backups, TLS and production monitoring before launch.

Replace demo content with verified organizational
information before publishing.

