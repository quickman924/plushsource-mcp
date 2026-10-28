// Validates data/manufacturers.csv and checks that generated files and metadata are in sync.
// Usage: node scripts/validate.mjs
import fs from "node:fs";
import path from "node:path";

import { JSON_PATH, ROOT, TABLE_PATH, buildDataset, buildTable, jsonText, loadCsv } from "./schema.mjs";

const problems = [];
const { records, errors, warnings } = loadCsv();
problems.push(...errors);
for (const w of warnings) console.warn(`warning: ${w}`);

if (errors.length === 0) {
  const dataset = buildDataset(records);
  const stale = [];
  if (!fs.existsSync(JSON_PATH) || fs.readFileSync(JSON_PATH, "utf8") !== jsonText(dataset)) {
    stale.push(path.relative(ROOT, JSON_PATH));
  }
  if (!fs.existsSync(TABLE_PATH) || fs.readFileSync(TABLE_PATH, "utf8") !== buildTable(dataset)) {
    stale.push(path.relative(ROOT, TABLE_PATH));
  }
  if (stale.length) {
    problems.push(`${stale.join(" and ")} out of date: run \`npm run generate\` and commit the result`);
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const server = JSON.parse(fs.readFileSync(path.join(ROOT, "server.json"), "utf8"));
if (pkg.mcpName !== server.name) problems.push(`package.json mcpName (${pkg.mcpName}) must equal server.json name (${server.name})`);
if (server.version !== pkg.version) problems.push(`server.json version (${server.version}) must equal package.json version (${pkg.version})`);
for (const p of server.packages ?? []) {
  if (p.registryType === "npm" && (p.identifier !== pkg.name || p.version !== pkg.version)) {
    problems.push(`server.json npm package must be ${pkg.name}@${pkg.version}, found ${p.identifier}@${p.version}`);
  }
}
if ((server.description ?? "").length > 100) problems.push("server.json description must be 100 characters or fewer");

if (problems.length) {
  console.error(`Validation failed with ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`OK: ${records.length} manufacturers, generated files and server.json in sync`);
