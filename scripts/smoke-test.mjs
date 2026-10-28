// Starts dist/index.js over stdio, then checks initialize, tools/list and one tool call.
import path from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = path.resolve(import.meta.dirname, "..");
const expected = [
  "search_manufacturers",
  "get_manufacturer",
  "compare_manufacturers",
  "get_facets",
  "get_dataset_info",
];

const client = new Client({ name: "smoke-test", version: "0.0.0" });
await client.connect(
  new StdioClientTransport({ command: process.execPath, args: [path.join(root, "dist", "index.js")] }),
);

const { tools } = await client.listTools();
const names = tools.map((t) => t.name);
const missing = expected.filter((n) => !names.includes(n));
if (missing.length) throw new Error(`Missing tools: ${missing.join(", ")}`);

const info = await client.callTool({ name: "get_dataset_info", arguments: {} });
const records = JSON.parse(info.content[0].text).records;
if (!(records > 0)) throw new Error("get_dataset_info returned no records");

await client.close();
console.log(`OK: ${client.getServerVersion()?.name} lists ${names.length} tools, ${records} records`);
