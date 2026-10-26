import { runner } from "node-pg-migrate";
import { resolve } from "node:path";
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL required");
await runner({
  databaseUrl: url,
  dir: resolve("migrations"),
  direction: "up",
  migrationsTable: "schema_migrations",
  count: Infinity,
  checkOrder: true,
  singleTransaction: true,
});
