# PlushSource MCP and open plush manufacturer list

An MCP server and an open, facts-only list of custom plush manufacturers, from
**[PlushSource](https://plushsource.com)**, the independent directory of custom plush manufacturers.

Browse, filter and compare every manufacturer, with written profiles, at
**[plushsource.com](https://plushsource.com)**.

## What's inside

| Path | What it is |
| --- | --- |
| [`MANUFACTURERS.md`](MANUFACTURERS.md) | The manufacturer list as a table, grouped by country. |
| [`data/manufacturers.csv`](data/manufacturers.csv) | The source data. Edit this in a pull request. |
| [`data/manufacturers.json`](data/manufacturers.json) | The same data as JSON, generated from the CSV. |
| [`src/`](src) | The `plushsource-mcp` MCP server (TypeScript). |
| [`server.json`](server.json) | Metadata for the official MCP Registry. |

## Use the MCP server

Requires Node 20 or newer. Add this to your MCP client config (Claude Desktop, Cursor, VS Code and
others):

```json
{
  "mcpServers": {
    "plushsource": {
      "command": "npx",
      "args": ["-y", "plushsource-mcp"]
    }
  }
}
```

Or run it directly:

```sh
npx -y plushsource-mcp
```

The server talks over stdio, needs no API key and makes no network calls. The dataset is bundled
in the package.

### Tools

| Tool | What it does |
| --- | --- |
| `search_manufacturers` | Filter by free text, country, category, MOQ range, certifications, design inputs, products, industries and OEM/ODM. Array filters are AND. MOQ filters exclude records that do not publish an MOQ. |
| `get_manufacturer` | Every fact for one manufacturer, plus the link to its written profile on PlushSource. |
| `compare_manufacturers` | Two to five manufacturers side by side. Unknown slugs are reported in `missing`. |
| `get_facets` | Countries, categories, certifications, products, design inputs, industries and MOQ bands, with counts. Call it before filtering. |
| `get_dataset_info` | Dataset date, record count, licence, and links to the listing criteria and full dataset. |

It also provides an `rfq_draft` prompt that turns a project brief into a shortlist of 3–5
manufacturers and one RFQ email.

Empty fields mean the manufacturer does not publish that fact. They are never estimated.

## The dataset

The list has facts only: location, MOQ, sample and production lead times, OEM/ODM, product types,
accepted design inputs, claimed certifications, and client industries. Each fact comes from the
manufacturer's own public pages. Each row links to its PlushSource listing.

- Table: [MANUFACTURERS.md](MANUFACTURERS.md)
- Download: [CSV](data/manufacturers.csv) or [JSON](data/manufacturers.json)
- Columns and allowed values: [data/README.md](data/README.md)

A listing is not an endorsement, a ranking or a quality guarantee. PlushSource does not quote,
sample or take orders. Contact manufacturers directly.

## Add or correct a manufacturer

Manufacturers, buyers and anyone else can ask for a manufacturer to be added, or for a fact to be
corrected:

- [Request a new manufacturer](https://github.com/quickman924/plushsource-mcp/issues/new?template=add-manufacturer.yml)
- [Report a correction](https://github.com/quickman924/plushsource-mcp/issues/new?template=correction.yml)
- Or open a pull request that edits `data/manufacturers.csv`

Every fact needs a link to a public page that proves it. See [CONTRIBUTING.md](CONTRIBUTING.md) and
the [listing criteria](https://plushsource.com/about/criteria).

## Development

```sh
npm install
npm run build        # regenerate data files from the CSV, then bundle dist/index.js
npm run validate     # check the CSV and that generated files are up to date
npm run typecheck
node dist/index.js   # start the server on stdio
```

To try a local build in an MCP client, point `command` at `node` and `args` at the absolute path of
`dist/index.js`.

## Licences

- Code: [MIT](LICENSE)
- Data (`data/` and `MANUFACTURERS.md`): [CC BY 4.0](data/LICENSE). Credit "PlushSource" with a
  link to https://plushsource.com.

Manufacturer names and trademarks belong to their owners.
