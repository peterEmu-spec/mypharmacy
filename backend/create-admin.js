require("dotenv").config();
const bcrypt = require("bcrypt");
const pool = require("./db");

async function createAdmin() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      "Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in your .env file.",
    );
  }

  if (password.length < 12) {
    throw new Error("The admin password must be at least 12 characters.");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const [existingUsers] = await pool.query(
    "SELECT user_id, role FROM users WHERE email = ?",
    [email],
  );

  if (existingUsers.length > 0) {
    if (existingUsers[0].role === "admin") {
      console.log("This admin account already exists. No changes made.");
      return;
    }

    console.log(
      "This email already belongs to a customer. Choose a different ADMIN_EMAIL.",
    );
    return;
  }

  await pool.query(
    `INSERT INTO users (full_name, email, password, role)
     VALUES (?, ?, ?, 'admin')`,
    [name, email, hashedPassword],
  );

  console.log("Admin account created successfully.");
  console.log("Admin email:", email);
}

createAdmin()
  .catch((error) => {
    console.error("Could not create admin:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
