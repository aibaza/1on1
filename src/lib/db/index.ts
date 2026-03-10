import { neon, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

// HTTP driver — fast single queries, no transactions needed
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzleHttp(sql, { schema });
export type Database = typeof db;

// WebSocket pool — supports transactions (used for auth flows)
const adminPool = new Pool({
  connectionString: process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL!,
});
export const adminDb = drizzleWs(adminPool, { schema });
