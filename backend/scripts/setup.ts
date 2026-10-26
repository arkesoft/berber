import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { readConfig } from "../src/config.js";
import { database, transaction } from "../src/infrastructure/database.js";
import { setupSchema, updateSalon } from "../src/modules/salon/index.js";
import { hashPassword } from "../src/modules/identity/index.js";
const config = readConfig(),
  pool = database(config.DATABASE_URL);
try {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: npm run setup -- path/to/salon.json");
  const setup = setupSchema.parse(JSON.parse(await readFile(file, "utf8")));
  if (setup.salon.id !== config.SALON_ID)
    throw new Error("SALON_ID must match setup salon");
  const email = z.email().parse(process.env.ADMIN_EMAIL).toLowerCase(),
    password = z.string().min(12).max(128).parse(process.env.ADMIN_PASSWORD),
    hash = await hashPassword(password);
  await transaction(pool, async (sql) => {
    if ((await sql.query("SELECT id FROM salon.settings")).rowCount)
      throw new Error(
        "Setup requires an empty installation; existing data will not be overwritten",
      );
    await sql.query(
      "INSERT INTO salon.settings(id,document,buffer_minutes) VALUES($1,$2,$3)",
      [setup.salon.id, setup.salon, setup.bufferMinutes],
    );
    for (const value of setup.services)
      await updateSalon(sql, config.SALON_ID, { resource: "services", value });
    for (const value of setup.staff)
      await updateSalon(sql, config.SALON_ID, { resource: "staff", value });
    for (const value of setup.chairs)
      await updateSalon(sql, config.SALON_ID, { resource: "chairs", value });
    for (const value of setup.schedules)
      await updateSalon(sql, config.SALON_ID, { resource: "schedules", value });
    for (const date of setup.closedDates)
      await sql.query(
        "INSERT INTO salon.closures(salon_id,day) VALUES($1,$2)",
        [config.SALON_ID, date],
      );
    await sql.query(
      "INSERT INTO identity.users(id,salon_id,email,name,password_hash,role) VALUES($1,$2,$3,$4,$5,'manager')",
      [randomUUID(), config.SALON_ID, email, "Salon yöneticisi", hash],
    );
  });
  console.log("Salon and manager created. Credentials were not printed.");
} finally {
  await pool.end();
}
