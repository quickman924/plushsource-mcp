// Regenerates data/manufacturers.json and MANUFACTURERS.md from data/manufacturers.csv.
import fs from "node:fs";
import path from "node:path";

import { JSON_PATH, ROOT, TABLE_PATH, buildDataset, buildTable, jsonText, loadCsv } from "./schema.mjs";

const { records, errors, warnings } = loadCsv();
for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length) {
  console.error(`data/manufacturers.csv has ${errors.length} error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const dataset = buildDataset(records);
fs.writeFileSync(JSON_PATH, jsonText(dataset), "utf8");
fs.writeFileSync(TABLE_PATH, buildTable(dataset), "utf8");
console.log(
  `Generated ${path.relative(ROOT, JSON_PATH)} and ${path.relative(ROOT, TABLE_PATH)} (${dataset.count} manufacturers)`,
);
