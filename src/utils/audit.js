const db = require("../config/database");

function audit(req, action, entity, entityId) {
  db.prepare(`
    INSERT INTO audit_logs (
      admin_id,
      action,
      entity,
      entity_id,
      ip_address
    )
    VALUES (?, ?, ?, ?, ?)
  `).run(
    req.admin?.id || null,
    action,
    entity || null,
    String(entityId || ""),
    req.ip
  );
}

module.exports = audit;