
const { jwtVerify } = require('jose');
const config = require('../xconfig');

async function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || '';

    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const token = header.slice(7);

    const key = new TextEncoder().encode(
      config.jwtSecret
    );

    const { payload } = await jwtVerify(token, key, {
      issuer: 'rosa-foundation',
      audience: 'foundation-admin'
    });

    if (payload.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    req.admin = payload;

    next();

  } catch {
    res.status(401).json({
      error: 'Invalid or expired token'
    });
  }
}

module.exports = { requireAdmin };

