
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const pool = require("./db");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "pharmacy-local-development-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 60 * 60 * 1000,
    },
  }),
);


function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      message: "Please log in first.",
    });
  }

  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      message: "Please log in first.",
    });
  }

  if (req.session.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Admin privileges are required.",
    });
  }

  next();
}

// Get all medicines, including their category names
app.get("/api/medicines", async (req, res) => {
  try {
    const [medicines] = await pool.query(`
      SELECT
        m.medicine_id,
        m.medicine_name,
        m.description,
        m.price,
        m.stock_quantity,
        m.requires_prescription,
        c.category_name
      FROM medicines m
      JOIN categories c
        ON m.category_id = c.category_id
      ORDER BY m.medicine_name
    `);

    res.json(medicines);
  } catch (error) {
    console.error("Error fetching medicines:", error.message);
    res.status(500).json({ error: "Could not fetch medicines" });
  }
});

app.post("/api/orders",requireAdmin, async (req, res) => {
  const { customerName, customerPhone, deliveryAddress, items } = req.body;

  if (
    typeof customerName !== "string" ||
    !customerName.trim() ||
    typeof customerPhone !== "string" ||
    !customerPhone.trim() ||
    typeof deliveryAddress !== "string" ||
    !deliveryAddress.trim() ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return res.status(400).json({
      error: "Please provide valid customer details and cart items.",
    });
  }

  // Validate each item before accessing the database.
  const quantities = new Map();

  for (const item of items) {
    if (
      !Number.isInteger(item.medicine_id) ||
      !Number.isInteger(item.quantity) ||
      item.medicine_id <= 0 ||
      item.quantity <= 0
    ) {
      return res.status(400).json({
        error: "Each item must have a valid medicine ID and quantity.",
      });
    }

    quantities.set(
      item.medicine_id,
      (quantities.get(item.medicine_id) || 0) + item.quantity,
    );
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const orderItems = [];
    let total = 0;

    for (const [medicineId, quantity] of quantities) {
      const [rows] = await connection.query(
        `SELECT medicine_id, medicine_name, price, stock_quantity
         FROM medicines
         WHERE medicine_id = ?
         FOR UPDATE`,
        [medicineId],
      );

      if (rows.length === 0) {
        throw new Error(`Medicine ID ${medicineId} was not found.`);
      }

      const medicine = rows[0];

      if (medicine.stock_quantity < quantity) {
        throw new Error(`Not enough stock for ${medicine.medicine_name}.`);
      }

      const unitPrice = Number(medicine.price);
      total += unitPrice * quantity;

      orderItems.push({
        medicine_id: medicine.medicine_id,
        quantity,
        unit_price: unitPrice,
      });
    }

    const [orderResult] = await connection.query(
      `INSERT INTO orders
       (customer_name, customer_phone, delivery_address, total_amount)
       VALUES (?, ?, ?, ?)`,
      [
        customerName.trim(),
        customerPhone.trim(),
        deliveryAddress.trim(),
        total.toFixed(2),
      ],
    );

    for (const item of orderItems) {
      await connection.query(
        `INSERT INTO order_items
         (order_id, medicine_id, quantity, unit_price)
         VALUES (?, ?, ?, ?)`,
        [
          orderResult.insertId,
          item.medicine_id,
          item.quantity,
          item.unit_price.toFixed(2),
        ],
      );

      await connection.query(
        `UPDATE medicines
         SET stock_quantity = stock_quantity - ?
         WHERE medicine_id = ?`,
        [item.quantity, item.medicine_id],
      );
    }

    await connection.commit();

    res.status(201).json({
      message: "Order placed successfully.",
      order_id: orderResult.insertId,
      total_amount: total.toFixed(2),
      status: "pending",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Order error:", error.message);

    res.status(400).json({
      error: error.message || "Could not place order.",
    });
  } finally {
    connection.release();
  }
});


app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT DATABASE() AS database_name");
    res.json({
      message: "Database connection successful",
      database: rows[0].database_name,
    });
  } catch (error) {
    console.error("Database error:", error.message);
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT
        order_id,
        customer_name,
        customer_phone,
        delivery_address,
        total_amount,
        status,
        created_at
      FROM orders
      ORDER BY created_at DESC
    `);

    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error.message);
    res.status(500).json({ error: "Could not fetch orders." });
  }
});

app.patch("/api/orders/:id/status", requireAdmin, async (req, res) => {
  const orderId = Number(req.params.id);
  const { status } = req.body;

  const allowedStatuses = ["pending", "processing", "completed", "cancelled"];

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      error: "Invalid order ID.",
    });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      error: "Invalid order status.",
    });
  }

  try {
    const [result] = await pool.query(
      "UPDATE orders SET status = ? WHERE order_id = ?",
      [status, orderId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Order not found.",
      });
    }

    res.json({
      message: "Order status updated successfully.",
      order_id: orderId,
      status: status,
    });
  } catch (error) {
    console.error("Error updating order status:", error.message);

    res.status(500).json({
      error: "Could not update order status.",
    });
  }
});

app.post("/api/register", async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({
      message: "Please fill in all fields.",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      message: "Password must be at least 8 characters long.",
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const [existingUsers] = await pool.query(
      "SELECT user_id FROM users WHERE email = ?",
      [normalizedEmail],
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "An account with this email already exists. Please log in.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO users (full_name, email, password, role)
             VALUES (?, ?, ?, 'customer')`,
      [fullName.trim(), normalizedEmail, hashedPassword],
    );

    res.status(201).json({
      message: "Registration successful! You can now log in.",
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    res.status(500).json({
      message: "Registration failed. Please try again.",
    });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Please enter your email and password.",
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const [users] = await pool.query(
      `SELECT user_id, full_name, email, password, role
             FROM users
             WHERE email = ?`,
      [normalizedEmail],
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const user = users[0];
    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    req.session.user = {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    };

    req.session.save((error) => {
      if (error) {
        console.error("Session save error:", error.message);

        return res.status(500).json({
          message: "Could not save login session.",
        });
      }

      res.json({
        message: "Login successful! Welcome back.",
        user: {
          full_name: user.full_name,
          role: user.role,
        },
      });
    });
  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      message: "Login failed. Please try again.",
    });
  }
});


app.get("/api/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      message: "You are not logged in.",
    });
  }

  res.json({
    user: req.session.user,
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Logout error:", error.message);

      return res.status(500).json({
        message: "Could not log out.",
      });
    }

    res.clearCookie("connect.sid");

    res.json({
      message: "Logged out successfully.",
    });
  });
});

app.get("/api/my-orders", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      message: "Please log in to view your orders.",
    });
  }

  try {
    const userId = req.session.user.user_id;

    const [orders] = await pool.query(
      `SELECT
                order_id,
                total_amount,
                status,
                created_at
             FROM orders
             WHERE user_id = ?
             ORDER BY created_at DESC`,
      [userId],
    );

    for (const order of orders) {
      const [items] = await pool.query(
        `SELECT
                    medicines.medicine_name,
                    order_items.quantity,
                    order_items.unit_price
                 FROM order_items
                 JOIN medicines
                    ON order_items.medicine_id = medicines.medicine_id
                 WHERE order_items.order_id = ?`,
        [order.order_id],
      );

      order.items = items;
    }

    res.json({ orders });
  } catch (error) {
    console.error("My orders error:", error.message);

    res.status(500).json({
      message: "Could not load your orders.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
