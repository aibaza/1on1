import * as schema from "./schema";

// Detect Neon cloud vs local PostgreSQL.
// @neondatabase/serverless Pool uses a WebSocket protocol that only works with
// Neon cloud endpoints (*.neon.tech). For local development against a standard
// PostgreSQL instance we fall back to the standard `pg` Pool.
const isNeon = (url: string) => url.includes(".neon.tech");

const dbUrl = process.env.DATABASE_URL!;
const adminUrl = process.env.DATABASE_ADMIN_URL || dbUrl;

function buildDb(connectionString: string) {
  if (isNeon(connectionString)) {
    // Production / Neon cloud: WebSocket pool (supports transactions + SET LOCAL)
    const { Pool } = require("@neondatabase/serverless") as typeof import("@neondatabase/serverless");
    const { drizzle } = require("drizzle-orm/neon-serverless") as typeof import("drizzle-orm/neon-serverless");
    return drizzle(new Pool({ connectionString }), { schema });
  }
  // Local dev: standard pg Pool (TCP, no WebSocket proxy required)
  const { Pool } = require("pg") as typeof import("pg");
  const { drizzle } = require("drizzle-orm/node-postgres") as typeof import("drizzle-orm/node-postgres");
  return drizzle(new Pool({ connectionString }), { schema });
}

// WebSocket pool (Neon) or standard pg pool (local) — supports transactions and
// SET LOCAL (required for RLS tenant context).
export const db = buildDb(dbUrl);
export type Database = typeof db;

// Admin connection bypasses RLS — used for auth flows (registration, login,
// password reset) that operate outside tenant context.
export const adminDb = buildDb(adminUrl);
