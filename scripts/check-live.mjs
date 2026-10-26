import { access, readdir, readFile } from "node:fs/promises";
const root = "build/client";
let hasWorker = false;
try {
  await access(`${root}/mockServiceWorker.js`);
  hasWorker = true;
} catch {
  /* expected */
}
if (hasWorker) throw new Error("Live build contains the mock worker");
for (const name of (await readdir(`${root}/assets`)).filter((x) =>
  x.endsWith(".js"),
)) {
  const content = await readFile(`${root}/assets/${name}`, "utf8");
  if (
    content.includes("demo-csrf-token") ||
    content.includes("Demo12345!") ||
    content.includes("MockServiceWorker")
  )
    throw new Error(`Mock code found in live chunk ${name}`);
}
const html = await readFile(`${root}/index.html`, "utf8");
if (!html.includes("<h1") || !html.includes("İyi bir kesim"))
  throw new Error("Public HTML was not prerendered");
console.log(
  "Live artifact: no mock worker, no demo accounts, public HTML prerendered.",
);
