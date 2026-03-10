import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
export type Database = typeof db;

// Admin connection bypasses RLS — used for auth flows (registration, login,
// password reset) that operate outside tenant context.
const adminSql = neon(
  process.env.DATABASE_ADMIN_URL ||
    process.env.DATABASE_URL!
);
export const adminDb = drizzle(adminSql, { schema });
