import path from "node:path";

import { build } from "esbuild";

// Bundles src/index.ts and data/manufacturers.json into a self-contained dist/index.js.
// Only the MCP SDK and zod stay external (installed as dependencies).
const here = import.meta.dirname;

await build({
  entryPoints: [path.join(here, "src", "index.ts")],
  outfile: path.join(here, "dist", "index.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  external: ["@modelcontextprotocol/sdk", "@modelcontextprotocol/sdk/*", "zod"],
  banner: { js: "#!/usr/bin/env node" },
  logLevel: "info",
});
