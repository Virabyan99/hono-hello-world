import { Hono } from "hono";
import contactsAPI from "./contacts/route"; // ✅ Import contacts API
import dbAPI from "./db/route"; // ✅ Import DB initialization

const app = new Hono();

app.route("/contacts", contactsAPI); // ✅ /api/contacts
app.route("/db", dbAPI); // ✅ /api/db (for initialization)

export default app;
