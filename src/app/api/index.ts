import { Hono } from "hono";
import contactsAPI from "./contacts/route"; // ✅ Import contacts API
import dbAPI from "./db/route"; // ✅ Import DB initialization

const app = new Hono();

app.route("/contacts", contactsAPI); // ✅ Attach `/api/contacts`
app.route("/db", dbAPI); // ✅ Attach `/api/db`

export default app;
