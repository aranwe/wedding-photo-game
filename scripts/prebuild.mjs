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

// Ensure migration tracking table exists
await sql`
  create table if not exists public._schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  );
`;

const appliedRows = await sql`select name from public._schema_migrations`;
const appliedSet = new Set(appliedRows.map((r) => r.name));

const migrationFiles = readdirSync("supabase/migrations")
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of migrationFiles) {
  if (appliedSet.has(file)) {
    console.log(`[prebuild] skipping already applied migration: ${file}`);
    continue;
  }
  const content = readFileSync(join("supabase/migrations", file), "utf8");
  console.log(`[prebuild] applying migration: ${file}`);
  await sql.unsafe(content);
  await sql`insert into public._schema_migrations (name) values (${file}) on conflict do nothing`;
}

// Seed is always executed to keep config and task updates in sync
const seedFile = "supabase/seed.sql";
const seedContent = readFileSync(seedFile, "utf8");
console.log(`[prebuild] applying ${seedFile}`);
await sql.unsafe(seedContent);

await sql.end();
console.log("[prebuild] DB bootstrap done");
