// Shared CSV schema for data/manufacturers.csv. Used by generate.mjs and validate.mjs.
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

export const ROOT = path.resolve(import.meta.dirname, "..");
export const CSV_PATH = path.join(ROOT, "data", "manufacturers.csv");
export const JSON_PATH = path.join(ROOT, "data", "manufacturers.json");
export const TABLE_PATH = path.join(ROOT, "MANUFACTURERS.md");

export const VOCAB = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src", "vocabulary.json"), "utf8"),
);

export const COLUMNS = [
  "slug",
  "name",
  "website",
  "country",
  "additional_countries",
  "city",
  "location",
  "moq",
  "moq_stated",
  "sample_time",
  "production_time",
  "oem",
  "odm",
  "categories",
  "products",
  "design_inputs",
  "certifications",
  "industries",
  "founded",
  "years_experience",
  "capacity",
  "listing_url",
  "sources",
  "added",
  "updated",
];

const COUNTRY = new Set(VOCAB.countries.map((c) => c.slug));
const CATEGORY = new Set(VOCAB.categories.map((c) => c.slug));
const CERT = new Set(VOCAB.certifications);
const PRODUCT = new Set(Object.keys(VOCAB.products));
const DESIGN = new Set(Object.keys(VOCAB.designInputs));
const INDUSTRY = new Set(Object.keys(VOCAB.industries));

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+|\b00)\d[\d\s().-]{7,}\d|\b\d{3}[\s.-]\d{3,4}[\s.-]\d{4}\b/;
/** Short factual statements only. Longer text belongs on the PlushSource listing, not here. */
const MAX_FACT = 120;
const LISTING_PREFIX = `${VOCAB.site.url}/plush-manufacturers/`;

function isUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function list(value) {
  return value
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean);
}

function isoDate(value) {
  return DATE_RE.test(value) && !Number.isNaN(Date.parse(value));
}

export function moqBandOf(value) {
  if (value < 100) return "micro";
  if (value < 300) return "low";
  if (value < 1000) return "standard";
  return "bulk";
}

/**
 * Parse and validate the CSV. Returns { records, errors, warnings }; records are only
 * meaningful when errors is empty.
 */
export function loadCsv(text = fs.readFileSync(CSV_PATH, "utf8")) {
  const errors = [];
  const warnings = [];
  const records = [];

  let rows;
  try {
    rows = parse(text, { bom: true, relax_column_count: false, skip_empty_lines: true });
  } catch (err) {
    return { records, errors: [`CSV parse error: ${err.message}`], warnings };
  }

  const [header, ...body] = rows;
  if (!header || header.join(",") !== COLUMNS.join(",")) {
    errors.push(
      `Header must be exactly:\n  ${COLUMNS.join(",")}\nfound:\n  ${(header ?? []).join(",")}`,
    );
    return { records, errors, warnings };
  }

  const today = new Date().toISOString().slice(0, 10);
  const thisYear = Number(today.slice(0, 4));
  const seenSlug = new Map();
  const seenSite = new Map();

  body.forEach((cells, i) => {
    const line = i + 2;
    const row = Object.fromEntries(COLUMNS.map((c, j) => [c, (cells[j] ?? "").trim()]));
    const where = `line ${line} (${row.slug || row.name || "?"})`;
    const err = (msg) => errors.push(`${where}: ${msg}`);

    for (const [col, value] of Object.entries(row)) {
      if (/[\r\n]/.test(value)) err(`${col} must be a single line`);
      if (col !== "website" && col !== "sources" && col !== "listing_url" && EMAIL_RE.test(value)) {
        err(`${col} looks like it contains an email address; do not add personal contact details`);
      }
      if (PHONE_RE.test(value)) err(`${col} looks like it contains a phone number`);
    }

    if (!SLUG_RE.test(row.slug)) err(`slug "${row.slug}" must be lowercase letters, digits and single hyphens`);
    else if (seenSlug.has(row.slug)) err(`duplicate slug (also on line ${seenSlug.get(row.slug)})`);
    else seenSlug.set(row.slug, line);

    if (!row.name) err("name is required");
    else if (row.name.length > 120) err("name is longer than 120 characters");

    if (!isUrl(row.website)) err(`website "${row.website}" is not an http(s) URL`);
    else {
      const host = new URL(row.website).hostname.replace(/^www\./, "");
      const key = host + new URL(row.website).pathname.replace(/\/$/, "");
      if (seenSite.has(key)) warnings.push(`${where}: same website as line ${seenSite.get(key)}`);
      else seenSite.set(key, line);
    }

    if (!COUNTRY.has(row.country)) {
      err(`country "${row.country}" must be one of: ${[...COUNTRY].join(", ")}`);
    }
    for (const c of list(row.additional_countries)) {
      if (!COUNTRY.has(c)) err(`additional_countries: unknown country "${c}"`);
      if (c === row.country) err(`additional_countries repeats the primary country "${c}"`);
    }

    if (row.city.length > 80) err("city is longer than 80 characters");
    if (!row.location) err("location is required (as stated by the manufacturer, e.g. \"Dongguan, China\")");
    else if (row.location.length > 160) err("location is longer than 160 characters");

    let moq = null;
    if (row.moq) {
      if (!/^\d+$/.test(row.moq) || Number(row.moq) <= 0) err(`moq "${row.moq}" must be a positive whole number of pieces`);
      else moq = Number(row.moq);
      if (!row.moq_stated) warnings.push(`${where}: moq is set but moq_stated is empty`);
    }

    for (const col of ["moq_stated", "sample_time", "production_time", "capacity"]) {
      if (row[col].length > MAX_FACT) {
        err(`${col} is longer than ${MAX_FACT} characters; keep it to a short factual statement`);
      }
    }

    for (const col of ["oem", "odm"]) {
      if (row[col] !== "yes" && row[col] !== "no") err(`${col} must be "yes" or "no"`);
    }

    const checkList = (col, allowed) => {
      const values = list(row[col]);
      const seen = new Set();
      for (const v of values) {
        if (!allowed.has(v)) err(`${col}: unknown value "${v}" (allowed: ${[...allowed].join(", ")})`);
        if (seen.has(v)) err(`${col}: "${v}" is listed twice`);
        seen.add(v);
      }
      return values;
    };
    const categories = checkList("categories", CATEGORY);
    const products = checkList("products", PRODUCT);
    const designInputs = checkList("design_inputs", DESIGN);
    const certifications = checkList("certifications", CERT);
    const industries = checkList("industries", INDUSTRY);
    if (categories.length === 0) err("categories needs at least one value (usually custom-plush)");

    let founded = null;
    if (row.founded) {
      const n = Number(row.founded);
      if (!/^\d{4}$/.test(row.founded) || n < 1800 || n > thisYear) err(`founded "${row.founded}" must be a year between 1800 and ${thisYear}`);
      else founded = n;
    }
    let years = null;
    if (row.years_experience) {
      if (!/^\d{1,3}$/.test(row.years_experience)) err(`years_experience "${row.years_experience}" must be a whole number`);
      else years = Number(row.years_experience);
    }

    const sources = list(row.sources);
    for (const s of sources) if (!isUrl(s)) err(`sources: "${s}" is not an http(s) URL`);

    let listingUrl = null;
    if (row.listing_url) {
      if (row.listing_url !== `${LISTING_PREFIX}${row.slug}`) {
        err(`listing_url must be ${LISTING_PREFIX}${row.slug} (maintainers fill this in once the listing is live)`);
      } else listingUrl = row.listing_url;
    } else if (sources.length === 0) {
      err("sources is required for records that are not yet listed on PlushSource: link the public pages that state each fact");
    }

    let added = null;
    if (row.added) {
      if (!isoDate(row.added)) err(`added "${row.added}" must be YYYY-MM-DD`);
      else added = row.added;
    }
    if (!isoDate(row.updated)) err(`updated "${row.updated}" must be YYYY-MM-DD (the date you checked the facts)`);
    else if (row.updated > today) err(`updated "${row.updated}" is in the future`);
    if (added && isoDate(row.updated) && added > row.updated) err("added is later than updated");

    const oem = row.oem === "yes";
    const odm = row.odm === "yes";
    const services = ["custom"];
    if (oem) services.push("oem");
    if (odm) services.push("odm");
    if (row.sample_time) services.push("sampling");

    records.push({
      slug: row.slug,
      name: row.name,
      website: row.website,
      country: row.country || null,
      additional_countries: list(row.additional_countries),
      city: row.city || null,
      location: row.location,
      moq,
      moq_stated: row.moq_stated,
      moq_band: moq === null ? null : moqBandOf(moq),
      sample_time: row.sample_time,
      production_time: row.production_time,
      oem,
      odm,
      services,
      categories,
      products,
      design_inputs: designInputs,
      certifications,
      industries,
      founded,
      years_experience: years,
      capacity: row.capacity,
      listing_url: listingUrl,
      sources,
      added,
      updated: row.updated,
    });
  });

  return { records, errors, warnings };
}

export function buildDataset(records) {
  const sorted = [...records].sort((a, b) => a.slug.localeCompare(b.slug));
  const lastUpdated = sorted.reduce((max, m) => (m.updated > max ? m.updated : max), "");
  return {
    name: "PlushSource open manufacturer dataset",
    license: "CC-BY-4.0",
    attribution: `PlushSource (${VOCAB.site.url})`,
    homepage: VOCAB.site.url,
    last_updated: lastUpdated,
    count: sorted.length,
    manufacturers: sorted,
  };
}

function md(text) {
  return String(text ?? "").replace(/\|/g, "\\|");
}

export function buildTable(dataset) {
  const countryName = Object.fromEntries(VOCAB.countries.map((c) => [c.slug, c]));
  const groups = new Map();
  for (const m of dataset.manufacturers) {
    const key = m.country ?? "unknown";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  }
  const order = [...groups.keys()].sort(
    (a, b) => groups.get(b).length - groups.get(a).length || a.localeCompare(b),
  );

  const out = [];
  out.push("# Custom plush manufacturers");
  out.push("");
  out.push(
    `<!-- Generated by scripts/generate.mjs from data/manufacturers.csv. Do not edit by hand. -->`,
  );
  out.push("");
  out.push(
    `${dataset.count} custom plush manufacturers, grouped by country. Search, filter and compare them on **[PlushSource](${VOCAB.site.url})**, where each listing has a written profile and the date its facts were last checked.`,
  );
  out.push("");
  out.push(
    `Facts only, recorded as each manufacturer states them on its own public pages. Empty cells mean the manufacturer does not publish that fact. A listing is not an endorsement or a certification, and PlushSource does not audit manufacturers. Last updated ${dataset.last_updated}. Data licence: [CC BY 4.0](data/LICENSE), attribution to [PlushSource](${VOCAB.site.url}).`,
  );
  out.push("");
  out.push("Want to add or correct a manufacturer? See [CONTRIBUTING.md](CONTRIBUTING.md).");
  out.push("");
  out.push("## Countries");
  out.push("");
  for (const key of order) {
    const name = countryName[key]?.name ?? "Unknown";
    const anchor = name.toLowerCase().replace(/[^a-z0-9 -]/g, "").replace(/ /g, "-");
    out.push(`- [${name}](#${anchor}) (${groups.get(key).length})`);
  }
  for (const key of order) {
    const meta = countryName[key];
    const list = groups.get(key).sort((a, b) => a.name.localeCompare(b.name));
    out.push("");
    out.push(`## ${meta?.name ?? "Unknown"}`);
    out.push("");
    if (meta && list.length >= VOCAB.countryPageMin) {
      out.push(`Browse on PlushSource: [Plush manufacturers in ${meta.name}](${VOCAB.site.url}/${meta.url})`);
      out.push("");
    }
    out.push("| Manufacturer | Location | MOQ | Sample time | OEM / ODM | Certifications | PlushSource listing |");
    out.push("| --- | --- | --- | --- | --- | --- | --- |");
    for (const m of list) {
      const oemOdm = [m.oem ? "OEM" : "", m.odm ? "ODM" : ""].filter(Boolean).join(" / ");
      const listing = m.listing_url ? `[View](${m.listing_url})` : "Pending";
      out.push(
        `| [${md(m.name)}](${m.website}) | ${md(m.location)} | ${md(m.moq_stated)} | ${md(m.sample_time)} | ${oemOdm} | ${m.certifications.join(", ")} | ${listing} |`,
      );
    }
  }
  out.push("");
  return out.join("\n");
}

export function jsonText(dataset) {
  return `${JSON.stringify(dataset, null, 2)}\n`;
}
