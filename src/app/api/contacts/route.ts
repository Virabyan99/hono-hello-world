import { Hono } from 'hono'

const contactsAPI = new Hono()

// Authentication Middleware to Protect Routes
contactsAPI.use("*", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  // Check for Bearer token and compare it to a valid one (e.g., 'Bearer my-secret-token')
  if (!authHeader || authHeader !== "Bearer my-secret-token") {
    return c.json({ error: "Unauthorized: Invalid or missing token." }, 401);
  }
  return await next();
});

// 📌 Create Contact (POST /api/contacts)
contactsAPI.post('/', async (c) => {
  try {
    const db = c.env.DB as D1Database // ✅ Get DB from context
    const newContact = await c.req.json()

    if (!newContact.name) {
      return c.json({ error: 'The contact name is required.' }, 400)
    }

    const insertSQL = `
      INSERT INTO contacts (name, email, phone, category, details, photo_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `

    const result = await db
      .prepare(insertSQL)
      .bind(
        newContact.name,
        newContact.email || null,
        newContact.phone || null,
        newContact.category || null,
        newContact.details || null,
        newContact.photo_url || null
      )
      .run()

    return c.json({
      message: 'Contact created successfully!',
      id: result.meta.last_insert_rowid,
    })
  } catch (error) {
    return c.json({ error: error.toString() }, 500)
  }
})

// 📌 Retrieve Contacts (GET /api/contacts) with Search, Sort, and Filter
contactsAPI.get("/", async (c) => {
  try {
    const db = c.env.DB as D1Database;
    const kv = c.env.CONTACT_CACHE; // ✅ Correct way to access KV storage

    const searchQuery = c.req.query("search");   // e.g., "john"
    const sortParam = c.req.query("sort");       // e.g., "name_asc" or "created_at_desc"
    const filterCategory = c.req.query("filter");// e.g., "friend"

    // ✅ Build a unique cache key based on query parameters.
    const cacheKey = `contacts_list?search=${searchQuery || ""}&sort=${sortParam || ""}&filter=${filterCategory || ""}`;

    // ✅ Check if cached data exists in KV storage.
    const cachedData = await kv.get(cacheKey);
    if (cachedData) {
      const contacts = JSON.parse(cachedData);
      return c.json({ contacts, cached: true });
    }

    // ✅ Construct dynamic WHERE clause for filtering and searching.
    let whereClauses: string[] = [];
    let queryValues: any[] = [];

    if (searchQuery) {
      whereClauses.push("(name LIKE ? OR email LIKE ?)");
      const searchTerm = `%${searchQuery}%`;
      queryValues.push(searchTerm, searchTerm);
    }

    if (filterCategory) {
      whereClauses.push("category = ?");
      queryValues.push(filterCategory);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // ✅ Construct dynamic ORDER BY clause for sorting.
    let orderByClause = "ORDER BY created_at DESC"; // Default: newest first.
    if (sortParam) {
      if (sortParam === "name_asc") {
        orderByClause = "ORDER BY name ASC";
      } else if (sortParam === "name_desc") {
        orderByClause = "ORDER BY name DESC";
      } else if (sortParam === "created_at_asc") {
        orderByClause = "ORDER BY created_at ASC";
      } else if (sortParam === "created_at_desc") {
        orderByClause = "ORDER BY created_at DESC";
      }
    }

    // ✅ Assemble the final SQL query dynamically.
    const selectSQL = `SELECT * FROM contacts ${whereClause} ${orderByClause}`;

    // ✅ Execute the SQL query.
    const result = await db.prepare(selectSQL).bind(...queryValues).all();
    const contacts = result.results;

    // ✅ Cache the query result for 60 seconds in KV.
    await kv.put(cacheKey, JSON.stringify(contacts), { expirationTtl: 60 });

    // ✅ Return the response.
    return c.json({ contacts, cached: false });

  } catch (error) {
    return c.json({ error: error.toString() }, 500);
  }
});

// 📌 Retrieve a Contact by ID (GET /api/contacts/:id)
contactsAPI.get("/:id", async (c) => {
  try {
    const db = c.env.DB as D1Database;
    const contactId = c.req.param("id");

    // ✅ Fetch the contact by ID
    const result = await db.prepare(`SELECT * FROM contacts WHERE id = ?`).bind(contactId).first();

    if (!result) {
      return c.json({ error: "No contact found with this ID." }, 404);
    }

    return c.json({ contact: result });
  } catch (error) {
    return c.json({ error: error.toString() }, 500);
  }
});

// 📌 Update Contact (PUT /api/contacts/:id)
contactsAPI.put("/:id", async (c) => {
  try {
    const db = c.env.DB as D1Database;
    const contactId = c.req.param("id"); // This retrieves the ID from the URL.
    const updatedData = await c.req.json(); // This gets the updated contact data from the request body.

    // 🔹 Ensure contact ID is valid
    if (!contactId) {
      return c.json({ error: "Contact ID is required." }, 400);
    }

    // 🔹 Ensure at least one field is provided for update
    if (Object.keys(updatedData).length === 0) {
      return c.json({ error: "No update data provided." }, 400);
    }

    // 🔹 Build the update query dynamically
    let setClauses = [];
    let values = [];

    for (const key in updatedData) {
      setClauses.push(`${key} = ?`);
      values.push(updatedData[key]);
    }

    values.push(contactId); // Add ID at the end for `WHERE id = ?`

    const setClause = setClauses.join(", ");
    const updateSQL = `UPDATE contacts SET ${setClause} WHERE id = ?`;

    const result = await db.prepare(updateSQL).bind(...values).run();

    if (result.success && result.meta?.changes > 0) {
      return c.json({ message: "Contact updated successfully!" });
    } else {
      return c.json({ error: "No contact found with the provided ID." }, 404);
    }
  } catch (error) {
    return c.json({ error: error.toString() }, 500);
  }
});

// 📌 Delete Contact (DELETE /api/contacts/:id)
contactsAPI.delete('/:id', async (c) => {
  try {
    const db = c.env.DB as D1Database;
    const contactId = c.req.param('id');

    const deleteSQL = `DELETE FROM contacts WHERE id = ?`;
    const result = await db.prepare(deleteSQL).bind(contactId).run();

    if (result.success && result.meta?.changes > 0) {
      return c.json({ message: 'Contact deleted successfully!' });
    } else {
      return c.json({ error: 'No contact found with the provided ID.' }, 404);
    }
  } catch (error) {
    return c.json({ error: error.toString() }, 500);
  }
});

export default contactsAPI;
