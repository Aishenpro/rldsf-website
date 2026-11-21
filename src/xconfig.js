
require('dotenv').config();

const path = require('node:path');

const env = process.env.NODE_ENV || 'development';

const jwtSecret = process.env.JWT_SECRET || '';

if (
  env === 'production' &&
  Buffer.byteLength(jwtSecret) < 32
) {
  throw new Error(
    'JWT_SECRET must be at least 32 bytes'
  );
}

module.exports = {
  env,

  port: Number(process.env.PORT || 3000),

  origin:
    process.env.PUBLIC_ORIGIN ||
    'http://localhost:3000',

  dbPath: path.resolve(
    process.env.XDATABASE_PATH ||
    './data/xfoundation.sqlite'
  ),

  jwtSecret:
    jwtSecret ||
    'development-only-secret-change-this',

  adminEmail: process.env.ADMIN_EMAIL || '',

  adminPasswordHash:
    process.env.ADMIN_PASSWORD_HASH || '',

  trustProxy:
    process.env.TRUST_PROXY || '0'
};

