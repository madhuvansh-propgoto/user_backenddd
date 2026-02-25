const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: "postgres",
  host: "host.docker.internal",
  database: "companydb",
  password: "Madhu@01",
  port: 5432,
});


// ===============================
// GET USERS WITH PAGINATION
// ===============================
app.get("/users", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    const users = await pool.query(
      "SELECT * FROM users ORDER BY uuid LIMIT $1 OFFSET $2",
      [limit, offset]
    );

    const total = await pool.query("SELECT COUNT(*) FROM users");

    res.json({
      users: users.rows,
      totalPages: Math.ceil(total.rows[0].count / limit),
      currentPage: page,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


// ===============================
// ADD USER
// ===============================
app.post("/users", async (req, res) => {
  try {
    const { name, email, age, gender, company, isactive } = req.body;

    const newUser = await pool.query(
      `INSERT INTO users (name, email, age, gender, company, isactive)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, email, age, gender, company, isactive]
    );

    res.json(newUser.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


// ===============================
// UPDATE USER (using uuid)
// ===============================
app.put("/users/:uuid", async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const { name, email, age, gender, company, isactive } = req.body;

    const updatedUser = await pool.query(
      `UPDATE users
       SET name=$1, email=$2, age=$3, gender=$4, company=$5, isactive=$6
       WHERE uuid=$7
       RETURNING *`,
      [name, email, age, gender, company, isactive, uuid]
    );

    res.json(updatedUser.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


// ===============================
// DELETE USER (using uuid)
// ===============================
app.delete("/users/:uuid", async (req, res) => {
  try {
    const uuid = req.params.uuid;

    await pool.query("DELETE FROM users WHERE uuid=$1", [uuid]);

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


app.listen(5000, () => {
  console.log("Server running on port 5000");
});