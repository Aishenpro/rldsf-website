const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const config = require("./environment");

const filename = path.resolve(config.DATABASE_PATH);

fs.mkdirSync(path.dirname(filename), {
  recursive: true
});

const db = new Database(filename);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");

module.exports = db;