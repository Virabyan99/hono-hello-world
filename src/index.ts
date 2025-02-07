import { Hono } from "hono";
import apiRoutes from "./app/api/index"; // ✅ Import API routes

const app = new Hono();

app.route("/api", apiRoutes); // ✅ Attach all API routes under `/api`

export default {
  fetch: app.fetch, // ✅ Ensures all routes are registered
};
