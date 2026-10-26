import { randomUUID } from "node:crypto";
import { z } from "zod";
import { readConfig } from "../src/config.js";
import { database, transaction } from "../src/infrastructure/database.js";
import { hashPassword } from "../src/modules/identity/index.js";
const config = readConfig(),
  pool = database(config.DATABASE_URL);
try {
  const id = z.string().min(1).parse(process.env.STAFF_ID),
    email = z.email().parse(process.env.STAFF_EMAIL).toLowerCase(),
    password = z.string().min(12).max(128).parse(process.env.STAFF_PASSWORD),
    hash = await hashPassword(password);
  await transaction(pool, async (sql) => {
    const row = (
      await sql.query<{ document: { name: string } }>(
        "SELECT document FROM salon.staff WHERE salon_id=$1 AND id=$2",
        [config.SALON_ID, id],
      )
    ).rows[0];
    if (!row) throw new Error("Staff record not found");
    await sql.query(
      "INSERT INTO identity.users(id,salon_id,email,name,password_hash,role,staff_id) VALUES($1,$2,$3,$4,$5,'staff',$6)",
      [randomUUID(), config.SALON_ID, email, row.document.name, hash, id],
    );
  });
  console.log("Staff account created.");
} finally {
  await pool.end();
}
