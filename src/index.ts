import { Hono } from "hono";
import apiRoutes from "./app/api/index"; // ✅ Import API routes

const app = new Hono();

app.route("/api", apiRoutes); // ✅ Attach all API routes under `/api`

app.get("/", (c) => c.text("API is running 🚀")); // ✅ Simple root route check

export default {
  fetch: app.fetch, // ✅ Ensures all routes are registered
};
