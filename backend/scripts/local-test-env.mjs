import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir("../.local", { recursive: true });
const password = randomBytes(24).toString("hex");
await writeFile("../.local/pg-password", password, { flag: "wx" });
await writeFile(
  "../.local/backend.env",
  `NODE_ENV=test\nDATABASE_URL=postgres://salon_test:${password}@127.0.0.1:55432/salon_backend_test\nTEST_DATABASE_URL=postgres://salon_test:${password}@127.0.0.1:55432/salon_backend_test\nSALON_ID=salon-test\nPUBLIC_ORIGIN=http://127.0.0.1:5174\nSESSION_SECRET=${randomBytes(48).toString("hex")}\nGUEST_SECRET=${randomBytes(48).toString("hex")}\nPORT=3001\n`,
  { flag: "wx" },
);
console.log(
  "Local-only random test credentials created in ignored .local directory.",
);
