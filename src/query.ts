import {
  CATEGORIES,
  COUNTRIES,
  DESIGN_INPUT_LABELS,
  INDUSTRY_LABELS,
  MOQ_BANDS,
  PRODUCT_LABELS,
  SERVICE_LABELS,
  categoryMeta,
  countryMeta,
} from "./taxonomy";
import type {
  CategorySlug,
  CertSlug,
  CountrySlug,
  DesignInputSlug,
  IndustrySlug,
  Manufacturer,
  MoqBand,
  ProductSlug,
} from "./types";

/**
 * Pure query layer: takes `Manufacturer[]` and never reads data itself, so it can be bundled
 * into the stdio server without any Node-specific APIs.
 */

// ---------------------------------------------------------------------------
// Free-text search
// ---------------------------------------------------------------------------

/** Data uses slugs ("low-moq"), users type prose ("low MOQ"): normalise both the same way. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Field weights, strongest signal first. Each query word scores by the strongest field it hits. */
const W_NAME = 10;
const W_LOCATION = 6;
const W_CATEGORY = 5;
const W_TAG = 4;
const W_FACT = 3;

interface Field {
  weight: number;
  text: string;
}

function fieldsFor(m: Manufacturer): Field[] {
  const countries = [...new Set([m.country, ...m.additional_countries])].filter(
    (c): c is CountrySlug => c !== null,
  );

  const raw: Array<[number, string[]]> = [
    [W_NAME, [m.name]],
    [W_LOCATION, [...countries.map((c) => countryMeta(c)?.name ?? c), m.city ?? "", m.location]],
    [W_CATEGORY, m.categories.map((c) => categoryMeta(c)?.name ?? c)],
    [W_TAG, m.services.map((s) => SERVICE_LABELS[s])],
    [W_TAG, m.products.map((p) => PRODUCT_LABELS[p])],
    [W_TAG, m.design_inputs.map((d) => DESIGN_INPUT_LABELS[d])],
    [W_TAG, [...m.certifications, ...m.industries.map((i) => INDUSTRY_LABELS[i])]],
    [W_FACT, [m.moq_stated, m.sample_time, m.production_time, m.capacity]],
  ];

  return raw
    .map(([weight, parts]) => ({ weight, text: normalize(parts.filter(Boolean).join(" ")) }))
    .filter((f) => f.text.length > 0);
}

export interface SearchIndex {
  all: Manufacturer[];
  docs: Array<{ m: Manufacturer; fields: Field[] }>;
}

export function createSearchIndex(list: Manufacturer[]): SearchIndex {
  return { all: list, docs: list.map((m) => ({ m, fields: fieldsFor(m) })) };
}

/**
 * Sum of the best field weight for each query word. Any word with no hit makes the record
 * irrelevant, so "low moq china" excludes other countries. Adjacent-phrase hits get a bonus.
 */
function scoreOf(doc: { fields: Field[] }, words: string[], phrase: string): number {
  let score = 0;
  for (const word of words) {
    let best = 0;
    for (const f of doc.fields) {
      if (f.weight > best && f.text.includes(word)) best = f.weight;
    }
    if (best === 0) return 0;
    score += best;
  }
  if (words.length > 1) {
    for (const f of doc.fields) {
      if (f.text.includes(phrase)) return score + f.weight * 3;
    }
  }
  return score;
}

/** An empty query returns everything; otherwise sort by relevance, then by name. */
export function searchInIndex(index: SearchIndex, query: string): Manufacturer[] {
  const phrase = normalize(query);
  if (!phrase) return index.all;

  return index.docs
    .map((doc) => ({ m: doc.m, score: scoreOf(doc, phrase.split(" "), phrase) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.m.name.localeCompare(b.m.name))
    .map((r) => r.m);
}

// ---------------------------------------------------------------------------
// Structured filters
// ---------------------------------------------------------------------------

export interface ManufacturerFilters {
  q?: string;
  /** Matches the primary `country` only, the same way PlushSource country pages are built. */
  country?: CountrySlug;
  category?: CategorySlug;
  /** Only records that publish an MOQ inside the range; unknown MOQ is excluded, never treated as 0. */
  moqMin?: number;
  moqMax?: number;
  /** Array filters are AND: every requested value must be on the record. */
  certifications?: CertSlug[];
  designInputs?: DesignInputSlug[];
  products?: ProductSlug[];
  industries?: IndustrySlug[];
  oem?: boolean;
  odm?: boolean;
  limit?: number;
  offset?: number;
}

function hasAll<T>(actual: T[], wanted: T[] | undefined): boolean {
  if (!wanted || wanted.length === 0) return true;
  return wanted.every((w) => actual.includes(w));
}

export function filterManufacturers(
  list: Manufacturer[],
  filters: ManufacturerFilters = {},
): Manufacturer[] {
  let out = list.filter((m) => {
    if (filters.country && m.country !== filters.country) return false;
    if (filters.category && !m.categories.includes(filters.category)) return false;
    if (filters.moqMax !== undefined && (m.moq === null || m.moq > filters.moqMax)) return false;
    if (filters.moqMin !== undefined && (m.moq === null || m.moq < filters.moqMin)) return false;
    if (!hasAll(m.certifications, filters.certifications)) return false;
    if (!hasAll(m.design_inputs, filters.designInputs)) return false;
    if (!hasAll(m.products, filters.products)) return false;
    if (!hasAll(m.industries, filters.industries)) return false;
    if (filters.oem === true && !m.oem) return false;
    if (filters.odm === true && !m.odm) return false;
    return true;
  });

  if (filters.q) out = searchInIndex(createSearchIndex(out), filters.q);

  const offset = filters.offset ?? 0;
  if (offset > 0 || filters.limit !== undefined) {
    out = out.slice(offset, filters.limit === undefined ? undefined : offset + filters.limit);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Facets
// ---------------------------------------------------------------------------

export interface FacetValue {
  slug: string;
  name: string;
  count: number;
}

export interface Facets {
  total: number;
  countries: FacetValue[];
  categories: FacetValue[];
  certifications: FacetValue[];
  products: FacetValue[];
  designInputs: FacetValue[];
  industries: FacetValue[];
  moqBands: Array<{ band: MoqBand; label: string; count: number }>;
}

function rank(values: FacetValue[]): FacetValue[] {
  return values
    .filter((v) => v.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function countBy<T extends string>(
  list: Manufacturer[],
  values: T[],
  has: (m: Manufacturer, value: T) => boolean,
  label: (value: T) => string,
): FacetValue[] {
  return rank(
    values.map((value) => ({
      slug: value,
      name: label(value),
      count: list.filter((m) => has(m, value)).length,
    })),
  );
}

/** Lets a client see which filter values exist before calling search_manufacturers. */
export function facetCounts(list: Manufacturer[]): Facets {
  return {
    total: list.length,
    countries: countBy(
      list,
      COUNTRIES.map((c) => c.slug),
      (m, slug) => m.country === slug,
      (slug) => countryMeta(slug)?.name ?? slug,
    ),
    categories: countBy(
      list,
      CATEGORIES.map((c) => c.slug),
      (m, slug) => m.categories.includes(slug),
      (slug) => categoryMeta(slug)?.name ?? slug,
    ),
    certifications: countBy(
      list,
      Array.from(new Set(list.flatMap((m) => m.certifications))),
      (m, slug) => m.certifications.includes(slug),
      (slug) => slug,
    ),
    products: countBy(
      list,
      Object.keys(PRODUCT_LABELS) as ProductSlug[],
      (m, slug) => m.products.includes(slug),
      (slug) => PRODUCT_LABELS[slug],
    ),
    designInputs: countBy(
      list,
      Object.keys(DESIGN_INPUT_LABELS) as DesignInputSlug[],
      (m, slug) => m.design_inputs.includes(slug),
      (slug) => DESIGN_INPUT_LABELS[slug],
    ),
    industries: countBy(
      list,
      Object.keys(INDUSTRY_LABELS) as IndustrySlug[],
      (m, slug) => m.industries.includes(slug),
      (slug) => INDUSTRY_LABELS[slug],
    ),
    moqBands: MOQ_BANDS.map((b) => ({
      band: b.band,
      label: b.label,
      count: list.filter((m) => m.moq_band === b.band).length,
    })),
  };
}

// ---------------------------------------------------------------------------
// Output shapes
// ---------------------------------------------------------------------------

export interface ManufacturerSummary {
  slug: string;
  name: string;
  /** PlushSource listing page (written profile and last-checked date); null if not listed yet. */
  url: string | null;
  website: string;
  country: CountrySlug | null;
  country_name: string | null;
  city: string | null;
  moq: number | null;
  moq_stated: string;
  moq_band: MoqBand | null;
  sample_time: string;
  production_time: string;
  oem: boolean;
  odm: boolean;
  certifications: string[];
  categories: string[];
  products: string[];
  design_inputs: string[];
  industries: string[];
  updated: string;
}

export interface ManufacturerDetail extends ManufacturerSummary {
  capacity: string;
  founded: number | null;
  years_experience: number | null;
  location_stated: string;
  additional_countries: string[];
  sources: string[];
  added: string | null;
  profile: string;
}

function labels<T extends string>(values: T[], lookup: Record<T, string>): string[] {
  return values.map((v) => lookup[v] ?? v);
}

const CATEGORY_NAMES = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c.name])) as Record<
  CategorySlug,
  string
>;

export function summarizeManufacturer(m: Manufacturer): ManufacturerSummary {
  return {
    slug: m.slug,
    name: m.name,
    url: m.listing_url,
    website: m.website,
    country: m.country,
    country_name: countryMeta(m.country)?.name ?? null,
    city: m.city,
    moq: m.moq,
    moq_stated: m.moq_stated,
    moq_band: m.moq_band,
    sample_time: m.sample_time,
    production_time: m.production_time,
    oem: m.oem,
    odm: m.odm,
    certifications: m.certifications,
    categories: labels(m.categories, CATEGORY_NAMES),
    products: labels(m.products, PRODUCT_LABELS),
    design_inputs: labels(m.design_inputs, DESIGN_INPUT_LABELS),
    industries: labels(m.industries, INDUSTRY_LABELS),
    updated: m.updated,
  };
}

export function detailManufacturer(m: Manufacturer): ManufacturerDetail {
  return {
    ...summarizeManufacturer(m),
    capacity: m.capacity,
    founded: m.founded,
    years_experience: m.years_experience,
    location_stated: m.location,
    additional_countries: m.additional_countries.map((c) => countryMeta(c)?.name ?? c),
    sources: m.sources,
    added: m.added,
    profile: m.listing_url
      ? `The written profile for this manufacturer is on its PlushSource listing: ${m.listing_url}`
      : `Not yet listed on PlushSource. See the manufacturer's own website: ${m.website}`,
  };
}
