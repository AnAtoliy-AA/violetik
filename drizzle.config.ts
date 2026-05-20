import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Drizzle Kit doesn't pick up .env.local on its own (Next.js does).
// Load it explicitly so `npm run db:generate / db:migrate / db:studio`
// see DATABASE_URL and DIRECT_URL.
config({ path: ".env.local" });

/**
 * `db:generate` reads schema.ts and emits SQL migrations — no DB
 * connection needed. `db:migrate` applies them to the database at
 * DIRECT_URL (Supabase direct port 5432), since the Transaction
 * pooler at 6543 doesn't accept the statements drizzle-kit emits.
 */
export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
