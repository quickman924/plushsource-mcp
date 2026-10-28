import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import pkg from "../package.json";
import raw from "../data/manufacturers.json";
import {
  detailManufacturer,
  facetCounts,
  filterManufacturers,
  summarizeManufacturer,
} from "./query";
import {
  CATEGORIES,
  CERTIFICATIONS,
  COUNTRIES,
  DESIGN_INPUT_LABELS,
  INDUSTRY_LABELS,
  PRODUCT_LABELS,
  SITE,
} from "./taxonomy";
import type {
  CategorySlug,
  CertSlug,
  CountrySlug,
  Dataset,
  DesignInputSlug,
  IndustrySlug,
  Manufacturer,
  ProductSlug,
} from "./types";

/**
 * stdio MCP server for the PlushSource directory (https://plushsource.com).
 *
 * The dataset (data/manufacturers.json, generated from data/manufacturers.csv) is bundled at
 * build time, so each npm release is a snapshot. Records are facts only; the written profile
 * for each manufacturer lives on its PlushSource listing page.
 */

const DATASET = raw as Dataset;
const BASE = SITE.url.replace(/\/$/, "");

const MANUFACTURERS: Manufacturer[] = [...DATASET.manufacturers].sort((a, b) =>
  a.name.localeCompare(b.name),
);

const COUNTRY_SLUGS = COUNTRIES.map((c) => c.slug) as [CountrySlug, ...CountrySlug[]];
const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as [CategorySlug, ...CategorySlug[]];
const PRODUCT_SLUGS = Object.keys(PRODUCT_LABELS) as [ProductSlug, ...ProductSlug[]];
const DESIGN_INPUT_SLUGS = Object.keys(DESIGN_INPUT_LABELS) as [
  DesignInputSlug,
  ...DesignInputSlug[],
];
const INDUSTRY_SLUGS = Object.keys(INDUSTRY_LABELS) as [IndustrySlug, ...IndustrySlug[]];
const CERT_SLUGS = CERTIFICATIONS as [CertSlug, ...CertSlug[]];

const json = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

const fail = (message: string) => ({
  content: [{ type: "text" as const, text: message }],
  isError: true,
});

const server = new McpServer(
  { name: "plushsource", version: pkg.version },
  {
    instructions: [
      "PlushSource is an independent, human-verified directory of custom plush manufacturers.",
      "Use these tools to shortlist manufacturers for a plush project and to compare them field by field.",
      "",
      "When answering:",
      "- Cite the listing `url` for every manufacturer you mention, and include its `updated` date when the answer could go stale.",
      "- An empty field means the manufacturer does not publish that fact. It is never an estimate: do not infer MOQ, lead time, or certification.",
      "- MOQ filters exclude records that do not publish an MOQ, rather than treating them as 0.",
      "- A listing is not an endorsement, a ranking, or a quality guarantee. PlushSource does not quote, sample, or take orders; buyers contact manufacturers directly.",
      "- Prefer shortlists of 3-5 manufacturers. Do not draft bulk RFQs to dozens of factories.",
    ].join("\n"),
  },
);

server.registerTool(
  "search_manufacturers",
  {
    title: "Search manufacturers",
    description:
      "Search manufacturers with free text and structured filters, and return a compact shortlist. " +
      "All array filters are AND: every requested value must be present on the record. " +
      "MOQ filters only match records that publish an MOQ, so records with an unknown MOQ are excluded. " +
      "`country` matches the primary country only, the same way the site's country pages are built. " +
      "Call get_facets first if you are unsure which countries, categories, or certifications exist.",
    inputSchema: {
      query: z
        .string()
        .optional()
        .describe("Free text, for example 'mascot plush Vietnam' or 'low MOQ keychains'."),
      country: z.enum(COUNTRY_SLUGS).optional(),
      category: z.enum(CATEGORY_SLUGS).optional(),
      moq_max: z.number().int().positive().optional().describe("Maximum published MOQ, in pieces."),
      moq_min: z.number().int().positive().optional().describe("Minimum published MOQ, in pieces."),
      certifications: z.array(z.enum(CERT_SLUGS)).optional(),
      design_inputs: z.array(z.enum(DESIGN_INPUT_SLUGS)).optional(),
      products: z.array(z.enum(PRODUCT_SLUGS)).optional(),
      industries: z.array(z.enum(INDUSTRY_SLUGS)).optional(),
      oem: z.boolean().optional().describe("true requires the manufacturer to state OEM service."),
      odm: z.boolean().optional().describe("true requires the manufacturer to state ODM service."),
      limit: z.number().int().min(1).max(25).default(5),
      offset: z.number().int().min(0).default(0),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async (args) => {
    const matched = filterManufacturers(MANUFACTURERS, {
      q: args.query,
      country: args.country,
      category: args.category,
      moqMin: args.moq_min,
      moqMax: args.moq_max,
      certifications: args.certifications,
      designInputs: args.design_inputs,
      products: args.products,
      industries: args.industries,
      oem: args.oem,
      odm: args.odm,
    });

    const page = matched.slice(args.offset, args.offset + args.limit);

    return json({
      total: matched.length,
      returned: page.length,
      offset: args.offset,
      manufacturers: page.map(summarizeManufacturer),
    });
  },
);

server.registerTool(
  "get_manufacturer",
  {
    title: "Get manufacturer",
    description:
      "Return the full record for one manufacturer: capacity, founding year, stated location, source links, and the PlushSource listing URL where its written profile lives. " +
      "Use this before quoting any fact about a specific listing.",
    inputSchema: {
      slug: z.string().min(1).describe("Listing slug, as returned by search_manufacturers."),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ slug }) => {
    const wanted = slug.trim().toLowerCase();
    const found = MANUFACTURERS.find((m) => m.slug === wanted);
    if (!found) {
      return fail(
        `No manufacturer with slug "${slug}". Use search_manufacturers to find valid slugs.`,
      );
    }
    return json(detailManufacturer(found));
  },
);

server.registerTool(
  "compare_manufacturers",
  {
    title: "Compare manufacturers",
    description:
      "Return 2-5 records side by side for a sourcing decision. " +
      "Unknown slugs are reported in `missing` instead of failing the whole call.",
    inputSchema: {
      slugs: z
        .array(z.string().min(1))
        .min(2)
        .max(5)
        .describe("2-5 listing slugs from search_manufacturers."),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ slugs }) => {
    const wanted = [...new Set(slugs.map((s) => s.trim().toLowerCase()))];
    const manufacturers = wanted
      .map((slug) => MANUFACTURERS.find((m) => m.slug === slug))
      .filter((m): m is Manufacturer => m !== undefined);
    const missing = wanted.filter((slug) => !manufacturers.some((m) => m.slug === slug));

    if (manufacturers.length === 0) {
      return fail(
        `None of these slugs exist: ${missing.join(", ")}. Use search_manufacturers first.`,
      );
    }

    return json({
      returned: manufacturers.length,
      missing,
      manufacturers: manufacturers.map(detailManufacturer),
    });
  },
);

server.registerTool(
  "get_facets",
  {
    title: "List available filters",
    description:
      "List every country, category, certification, product type, design input, industry, and MOQ band " +
      "that currently has at least one manufacturer, with counts. " +
      "Call this before filtering so you only use values that exist in the directory.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async () => json(facetCounts(MANUFACTURERS)),
);

server.registerTool(
  "get_dataset_info",
  {
    title: "Get dataset info",
    description:
      "Return the snapshot date, number of records, licence, and links to PlushSource, the open dataset, and the listing criteria. " +
      "Use the criteria link when you need to explain what a listing does and does not verify.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async () =>
    json({
      site: SITE.name,
      url: SITE.url,
      tagline: SITE.tagline,
      dataset_version: DATASET.last_updated,
      last_verified: DATASET.last_updated,
      records: MANUFACTURERS.length,
      listing_criteria: `${BASE}/about/criteria`,
      full_dataset: `${BASE}/llms.txt`,
      open_dataset: "https://github.com/quickman924/plushsource-mcp/tree/main/data",
      data_license: DATASET.license,
      attribution: DATASET.attribution,
      note:
        "Records are facts only; read the written profile on each listing url. Empty fields mean the manufacturer does not publish them; " +
        "a listing is not an endorsement and PlushSource does not handle quotes or orders.",
    }),
);

server.registerPrompt(
  "rfq_draft",
  {
    title: "Draft an RFQ from a project brief",
    description:
      "Shortlist 3-5 manufacturers for a project and draft one RFQ email the buyer can send to a single factory.",
    argsSchema: {
      project: z
        .string()
        .min(1)
        .describe(
          "Project brief: product type, quantity, design input, certifications, destination market, deadline.",
        ),
      shortlist: z
        .string()
        .optional()
        .describe("Optional comma-separated slugs the buyer already shortlisted."),
    },
  },
  ({ project, shortlist }) => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: [
            "You are helping a buyer shortlist custom plush manufacturers from PlushSource.",
            "",
            "Project brief:",
            project,
            "",
            shortlist ? `Buyer's existing shortlist (slugs): ${shortlist}` : "No shortlist yet.",
            "",
            "Steps:",
            "1. If there is no shortlist, call search_manufacturers with filters inferred from the brief and pick at most 5.",
            "2. Call get_manufacturer for each pick to confirm the published facts.",
            "3. Draft ONE concise RFQ email the buyer can send to one manufacturer. Cover design input, target quantity, required certifications, destination market, and target in-hands date. Ask for MOQ, sample cost and lead time, bulk unit price, and production lead time.",
            "4. Cite each manufacturer's listing URL and its updated date. Never state a MOQ, lead time, or certification that is not in the record: if a field is empty, say \"not stated\" and ask the manufacturer to confirm.",
            "5. Do not turn this into a mass mailing to dozens of factories.",
          ].join("\n"),
        },
      },
    ],
  }),
);

await server.connect(new StdioServerTransport());
