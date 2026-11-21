require("dotenv").config();

const db = require("../src/config/database");
const { hashPassword } = require("../src/utils/password");

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first"
    );
  }

  if (password.length < 12) {
    throw new Error(
      "Administrator password must contain at least 12 characters"
    );
  }

  const exists = db.prepare(`
    SELECT id FROM admins WHERE email = ?
  `).get(email.toLowerCase());

  if (exists) {
    throw new Error("Administrator already exists");
  }

  const passwordHash = await hashPassword(password);

  db.prepare(`
    INSERT INTO admins (
      email,
      password_hash,
      role
    )
    VALUES (?, ?, 'superadmin')
  `).run(
    email.toLowerCase(),
    passwordHash
  );

  console.log("Super administrator created.");

  db.close();
}

main().catch(error => {
  console.error(error.message);
  db.close();
  process.exit(1);
});