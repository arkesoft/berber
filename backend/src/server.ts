import { readConfig } from "./config.js";
import { database } from "./infrastructure/database.js";
import { createApp } from "./app.js";
const config = readConfig(),
  pool = database(config.DATABASE_URL),
  app = await createApp(config, pool);
async function stop() {
  await app.close();
  await pool.end();
}
process.once("SIGTERM", () => void stop());
process.once("SIGINT", () => void stop());
await app.listen({ host: config.HOST, port: config.PORT });
