import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./src/lib/db/migrations",
  schema: "./src/lib/db/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    // Use admin URL for migrations (needs CREATE TABLE perms); fall back to DATABASE_URL
    url: (process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL)!,
  },
});
