import { Hono } from "hono";
import apiRoutes from "./app/api/index"; // ✅ Import API routes

const app = new Hono();

// ==========================
// Logging Middleware
// ==========================
app.use('*', async (c, next) => {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.url}`);
  const response = await next();
  const duration = Date.now() - startTime;
  console.log(`[${new Date().toISOString()}] Completed in ${duration}ms`);
  return response;
});

// ==========================
// Error Handling Middleware
// ==========================
app.use('*', async (c, next) => {
  try {
    return await next();
  } catch (error) {
    console.error('Error caught in middleware:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// ==========================
// Authentication Middleware (Optional)
// ==========================
// Authentication Middleware: Protects sensitive routes.
app.use('/api/contacts', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || authHeader !== 'Bearer my-secret-token') {
    return c.json({ error: 'Unauthorized: Invalid or missing token.' }, 401);
  }
  return await next();
});


// ==========================
// Attach API Routes
// ==========================
app.route("/api", apiRoutes); // ✅ Attach all API routes under `/api`

export default {
  fetch: app.fetch, // ✅ Ensures all routes are registered
};
