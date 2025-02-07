import { Hono } from "hono";

const contactsAPI = new Hono();

// 📌 Create Contact (POST /api/contacts)
contactsAPI.post("/", async (c) => {
  try {
    const db = c.env.DB; // ✅ Get DB from context
    const newContact = await c.req.json();

    // Input validation
    if (!newContact.name) {
      return c.json({ error: "The contact name is required." }, 400);
    }

    // SQL Query
    const insertSQL = `
      INSERT INTO contacts (name, email, phone, category, details, photo_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    // Execute Query
    const result = await db.prepare(insertSQL)
      .bind(
        newContact.name,
        newContact.email || null,
        newContact.phone || null,
        newContact.category || null,
        newContact.details || null,
        newContact.photo_url || null
      )
      .run();

    return c.json({ message: "Contact created successfully!", id: result.lastRowId });
  } catch (error) {
    return c.json({ error: error.toString() }, 500);
  }
});

// 📌 Read Contacts (GET /api/contacts)
contactsAPI.get("/", async (c) => {
  try {
    const db = c.env.DB; // ✅ Get DB from context
    const selectSQL = `SELECT * FROM contacts ORDER BY created_at DESC`;
    const result = await db.prepare(selectSQL).all();
    return c.json({ contacts: result.results });
  } catch (error) {
    return c.json({ error: error.toString() }, 500);
  }
});

export default contactsAPI;
