import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

export const db = drizzle(pool, { schema });
export type Database = typeof db;

// Admin connection bypasses RLS — used for auth flows (registration, login,
// password reset) that operate outside tenant context.
const adminPool = new Pool({
  connectionString: process.env.DATABASE_ADMIN_URL || process.env.SEED_DATABASE_URL!,
});

export const adminDb = drizzle(adminPool, { schema });
