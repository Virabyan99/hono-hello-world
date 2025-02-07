import { Hono } from "hono";

const dbAPI = new Hono();

// SQL query to create the 'contacts' table if it doesn't exist.
const createTableSQL = `
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    category TEXT,
    details TEXT,
    photo_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

// Route to initialize the database (GET /api/db/init)
dbAPI.get("/init", async (c) => {
  try {
    const db = c.env.DB; // ✅ Retrieve DB from request context
    await db.prepare(createTableSQL).run();
    return c.json({ message: "Database initialized successfully!" });
  } catch (error) {
    return c.json({ error: error.toString() }, 500);
  }
});

export default dbAPI;
