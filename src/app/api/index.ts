import { Hono } from "hono";
import contactsAPI from "./contacts/route"; // ✅ Import contacts API
import dbAPI from "./db/route"; // ✅ Import DB initialization

const app = new Hono();

app.route("/contacts", contactsAPI); // ✅ Correct `/api/contacts`
app.route("/db", dbAPI); // ✅ Correct `/api/db`

export default app;
