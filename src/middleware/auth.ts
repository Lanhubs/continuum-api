import type { Context, Next } from "hono";
import { auth } from "../auth";
import sql from "../config/db";

export const authMiddleware = async (c: Context, next: Next) => {
  // 1. Skip auth check for OPTIONS preflight requests
  if (c.req.method === "OPTIONS") {
    return next();
  }

  // 2. Pass headers robustly. We can pass the whole req or just a fresh Headers object
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  // Explicitly fetch the user ID from the database to ensure it's the database record
  // and NOT just the one from the Google session (addressing user's concern).
  try {
    const [user] = await sql`SELECT id FROM "user" WHERE email = ${session.user.email} LIMIT 1`;
    
    if (!user) {
      return c.json({ error: "User record not found in database" }, 404);
    }

    // Set the database user ID in the context
    c.set("userId", user.id);
    await next();
  } catch (error) {
    console.error("Auth Middleware DB Error:", error);
    return c.json({ error: "Internal Server Error during Authentication" }, 500);
  }
};
