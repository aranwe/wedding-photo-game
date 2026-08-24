/**
 * prebuild — idempotent DB bootstrap.
 *
 * Runs before `next build` (locally and on Vercel). Applies the schema
 * migration and seed via the Supabase PostgREST-less SQL path using the
 * `postgres` package against POSTGRES_URL (provided by the Vercel-Supabase
 * integration; locally it comes from .env.local).
 *
 * Both SQL files are safe to run repeatedly:
 *   - migration uses `create table if not exists` / `create policy` guards
 *   - seed uses `on conflict` upserts
 * Skipped silently when POSTGRES_URL is not set (e.g. fork PR builds).
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.POSTGRES_URL;
if (!url) {
  console.log("[prebuild] POSTGRES_URL not set — skipping DB bootstrap");
  process.exit(0);
}

const sql = postgres(url, { max: 1, prepare: false });

const files = [
  ...readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => join("supabase/migrations", f)),
  "supabase/seed.sql",
];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  console.log(`[prebuild] applying ${file}`);
  await sql.unsafe(content);
}

await sql.end();
console.log("[prebuild] DB bootstrap done");
