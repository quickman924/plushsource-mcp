import vocabulary from "./vocabulary.json";
import type {
  CategorySlug,
  CountrySlug,
  DesignInputSlug,
  IndustrySlug,
  MoqBand,
  ProductSlug,
  ServiceSlug,
} from "./types";

/** Controlled vocabularies shared by the MCP server and the data scripts (src/vocabulary.json). */

export const SITE = vocabulary.site;

export interface CategoryMeta {
  slug: CategorySlug;
  name: string;
  desc: string;
  url: string;
}

export interface CountryMeta {
  slug: CountrySlug;
  name: string;
  code: string;
  url: string;
}

export const CATEGORIES = vocabulary.categories as CategoryMeta[];
export const COUNTRIES = vocabulary.countries as CountryMeta[];
export const CERTIFICATIONS = vocabulary.certifications;
export const PRODUCT_LABELS = vocabulary.products as Record<ProductSlug, string>;
export const DESIGN_INPUT_LABELS = vocabulary.designInputs as Record<DesignInputSlug, string>;
export const INDUSTRY_LABELS = vocabulary.industries as Record<IndustrySlug, string>;
export const SERVICE_LABELS = vocabulary.services as Record<ServiceSlug, string>;
export const MOQ_BANDS = vocabulary.moqBands as Array<{
  band: MoqBand;
  label: string;
  min: number;
  max: number | null;
}>;

export function categoryMeta(slug: CategorySlug): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function countryMeta(slug: CountrySlug | null): CountryMeta | undefined {
  if (!slug) return undefined;
  return COUNTRIES.find((c) => c.slug === slug);
}
