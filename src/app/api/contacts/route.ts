import { Hono } from 'hono'

const contactsAPI = new Hono()

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

// 📌 Read All Contacts (GET /api/contacts) with Cloudflare KV Caching
contactsAPI.get('/', async (c) => {
  try {
    const db = c.env.DB as D1Database // ✅ Get DB binding
    const kv = c.env.CONTACT_CACHE // ✅ Get KV binding
    const cacheKey = 'contacts_list' // ✅ KV Cache Key

    // 🟢 Step 1: Check if cached data exists
    const cachedData = await kv.get(cacheKey)
    if (cachedData) {
      console.log('📌 Returning cached contacts from KV...')
      return c.json({ contacts: JSON.parse(cachedData), cached: true })
    }

    // 🔵 Step 2: If no cache, fetch from DB
    const selectSQL = `SELECT * FROM contacts ORDER BY created_at DESC`
    const result = await db.prepare(selectSQL).all()
    const contacts = result.results

    // 🟣 Step 3: Store data in KV with a TTL of 60 seconds
    await kv.put(cacheKey, JSON.stringify(contacts), { expirationTtl: 60 })

    console.log('✅ Contacts fetched from DB and cached in KV.')
    return c.json({ contacts, cached: false })
  } catch (error) {
    return c.json({ error: error.toString() }, 500)
  }
})

// 📌 Update Contact (PUT /api/contacts/:id)
contactsAPI.put('/:id', async (c) => {
  try {
    const db = c.env.DB as D1Database
    const contactId = c.req.param('id')
    const updatedData = await c.req.json()

    if (Object.keys(updatedData).length === 0) {
      return c.json({ error: 'No update data provided.' }, 400)
    }

    let setClauses = []
    let values = []
    for (const key in updatedData) {
      setClauses.push(`${key} = ?`)
      values.push(updatedData[key])
    }

    const setClause = setClauses.join(', ')
    const updateSQL = `UPDATE contacts SET ${setClause} WHERE id = ?`
    values.push(contactId)

    const result = await db
      .prepare(updateSQL)
      .bind(...values)
      .run()

    if (result.success && result.meta?.changes > 0) {
      return c.json({ message: 'Contact updated successfully!' })
    } else {
      return c.json({ error: 'No contact found with the provided ID.' }, 404)
    }
  } catch (error) {
    return c.json({ error: error.toString() }, 500)
  }
})

// 📌 Delete Contact (DELETE /api/contacts/:id)
contactsAPI.delete('/:id', async (c) => {
  try {
    const db = c.env.DB as D1Database
    const contactId = c.req.param('id')

    const deleteSQL = `DELETE FROM contacts WHERE id = ?`
    const result = await db.prepare(deleteSQL).bind(contactId).run()

    if (result.success && result.meta?.changes > 0) {
      return c.json({ message: 'Contact deleted successfully!' })
    } else {
      return c.json({ error: 'No contact found with the provided ID.' }, 404)
    }
  } catch (error) {
    return c.json({ error: error.toString() }, 500)
  }
})

export default contactsAPI
