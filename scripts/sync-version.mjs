// Runs on `npm version`: copies the new package.json version into server.json.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const file = path.join(root, "server.json");
const server = JSON.parse(fs.readFileSync(file, "utf8"));
server.version = pkg.version;
for (const p of server.packages ?? []) if (p.registryType === "npm") p.version = pkg.version;
fs.writeFileSync(file, `${JSON.stringify(server, null, 2)}\n`);
console.log(`server.json -> ${pkg.version}`);
