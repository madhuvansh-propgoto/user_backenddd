
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: "postgres",
  host: "db",
  database: "user_db",
  password: "Madhu",
  port: 5432,
});

/* =========================
   GET USERS (FIXED)
========================= */
app.get("/users", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    const users = await pool.query(
      `SELECT 
         id::text AS id,
         name,
         email,
         age,
         gender,
         company
       FROM users
       ORDER BY id
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    console.log("DB USERS:", users.rows);

    const total = await pool.query("SELECT COUNT(*) FROM users");

    res.json({
      users: users.rows,
      totalPages: Math.ceil(total.rows[0].count / limit),
      currentPage: page,
    });

  } catch (err) {
    console.error("GET ERROR:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   CREATE USER
========================= */
app.post("/users", async (req, res) => {
  try {
    const { name, email, age, gender, company } = req.body;

    if (!name || !email || !age || !gender) {
      return res.status(400).json({ error: "All fields required" });
    }

    const newUser = await pool.query(
      `INSERT INTO users (id, name, email, age, gender, company)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
       RETURNING id::text AS id, name, email, age, gender, company`,
      [name, email, age, gender, company]
    );

    res.json(newUser.rows[0]);

  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Email already exists" });
    }

    console.error("POST ERROR:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   UPDATE USER
========================= */
app.put("/users/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { name, email, age, gender, company } = req.body;

    if (!id || id === "undefined") {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const result = await pool.query(
      `UPDATE users
       SET name=$1, email=$2, age=$3, gender=$4, company=$5
       WHERE id=$6
       RETURNING id::text AS id, name, email, age, gender, company`,
      [name, email, age, gender, company, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("UPDATE ERROR:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   DELETE USER (FIXED)
========================= */
app.delete("/users/:id", async (req, res) => {
  try {
    const id = req.params.id;

    console.log("DELETE ID:", id);

    if (!id || id === "undefined") {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const result = await pool.query(
      "DELETE FROM users WHERE id=$1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully" });

  } catch (err) {
    console.error("DELETE ERROR:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   SERVER
========================= */
app.listen(5000, () => {
  console.log("Server running on port 5000");
});