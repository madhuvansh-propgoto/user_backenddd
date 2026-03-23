
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const redis = require("redis");

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   REDIS SETUP
========================= 
new!!!*/
const redisClient = redis.createClient({
  url: "redis://redis:6379"
});

redisClient.on("connect", () => {
  console.log("Redis connecting...");
});

redisClient.on("ready", () => {
  console.log("Redis ready");
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

redisClient.on("end", () => {
  console.log("Redis connection closed");
});

const clearUsersCache = async () => {
  try {
    const keys = await redisClient.keys("users:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log("Cache cleared");
    }
  } catch (err) {
    console.error("Redis clear error:", err);
  }
};

/* =========================
   DB SETUP
========================= */
const pool = new Pool({
  user: "postgres",
  host: "db",
  database: "user_db",
  password: "Madhu",
  port: 5432,
});

/* =========================
   GET USERS (WITH CACHE)
========================= */
app.get("/users", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    const cacheKey = `users:${page}:${limit}`;

    // CACHE CHECK
    // const cachedData = await redisClient.get(cacheKey);
    //new!!!
    let cachedData = null;

    if (redisClient.isOpen) {
      cachedData = await redisClient.get(cacheKey);
    }

    if (cachedData) {
      console.log("CACHE HIT");
      return res.json(JSON.parse(cachedData));
    }

    console.log("CACHE MISS");

    // DB QUERY
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

    const total = await pool.query("SELECT COUNT(*) FROM users");

    const response = {
      users: users.rows,
      totalPages: Math.ceil(total.rows[0].count / limit),
      currentPage: page,
    };

    // STORE IN REDIS (TTL 60s)
    // await redisClient.setEx(cacheKey, 60, JSON.stringify(response));
    //new!!!
    if (redisClient.isOpen) {
      await redisClient.setEx(cacheKey, 60, JSON.stringify(response));
    }
    res.json(response);

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

    await clearUsersCache();

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

    await clearUsersCache();

    res.json(result.rows[0]);

  } catch (err) {
    console.error("UPDATE ERROR:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   DELETE USER
========================= */
app.delete("/users/:id", async (req, res) => {
  try {
    const id = req.params.id;

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

    await clearUsersCache();

    res.json({ message: "User deleted successfully" });

  } catch (err) {
    console.error("DELETE ERROR:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   SERVER START
========================= 
const startServer = async () => {
  try {
    await redisClient.connect();
    console.log("Redis connected");

    app.listen(5000, () => {
      console.log("Server running on port 5000");
    });

  } catch (err) {
    console.error("Startup Error:", err);
  }
};*/

const waitForDB = async () => {
  while (true) {
    try {
      await pool.query("SELECT 1");
      console.log("DB connected");
      break;
    } catch (err) {
      console.log("Waiting for DB...");
      await new Promise(res => setTimeout(res, 2000));
    }
  }
};

const startServer = async () => {
  try {
    await redisClient.connect();

    const pong = await redisClient.ping();
    console.log("Redis status:", pong);

    await waitForDB();

    app.listen(5000, () => {
      console.log("Server running on port 5000");
    });

  } catch (err) {
    console.error("Startup Error:", err);
  }
};

startServer();