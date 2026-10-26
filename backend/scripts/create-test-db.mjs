import pg from "pg";
process.loadEnvFile("../.local/backend.env");
const url = new URL(process.env.TEST_DATABASE_URL);
if (url.pathname !== "/salon_backend_test" || url.hostname !== "127.0.0.1")
  throw new Error("Only the isolated local test database may be created");
url.pathname = "/postgres";
const db = new pg.Client({ connectionString: url.toString() });
try {
  await db.connect();
  if (
    !(
      await db.query(
        "SELECT datname FROM pg_database WHERE datname='salon_backend_test'",
      )
    ).rowCount
  )
    await db.query("CREATE DATABASE salon_backend_test");
  console.log("Isolated test database ready.");
} finally {
  await db.end();
}
