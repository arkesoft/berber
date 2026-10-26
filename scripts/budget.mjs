import { readdir, readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
const files = await readdir("build/client/assets");
let total = 0,
  max = 0;
for (const name of files.filter((x) => x.endsWith(".js"))) {
  const size = gzipSync(await readFile(`build/client/assets/${name}`)).length;
  total += size;
  max = Math.max(max, size);
}
console.log(
  JSON.stringify({
    totalJavaScriptGzipBytes: total,
    largestChunkGzipBytes: max,
    totalBudget: 450000,
    chunkBudget: 220000,
  }),
);
if (total > 450000 || max > 220000) process.exitCode = 1;
