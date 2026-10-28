import type vocabulary from "./vocabulary.json";

type Vocab = typeof vocabulary;

export type CountrySlug = Vocab["countries"][number]["slug"];
export type CategorySlug = Vocab["categories"][number]["slug"];
export type CertSlug = Vocab["certifications"][number];
export type ProductSlug = keyof Vocab["products"];
export type DesignInputSlug = keyof Vocab["designInputs"];
export type IndustrySlug = keyof Vocab["industries"];
export type ServiceSlug = keyof Vocab["services"];
export type MoqBand = "micro" | "low" | "standard" | "bulk";

/**
 * One record in data/manufacturers.json. Facts only: every field is a short, checkable
 * statement taken from the manufacturer's own public pages. Editorial profiles live on
 * the PlushSource listing page (`listing_url`), not in this dataset.
 */
export interface Manufacturer {
  slug: string;
  name: string;
  website: string;
  country: CountrySlug | null;
  additional_countries: CountrySlug[];
  city: string | null;
  location: string;
  moq: number | null;
  moq_stated: string;
  moq_band: MoqBand | null;
  sample_time: string;
  production_time: string;
  oem: boolean;
  odm: boolean;
  services: ServiceSlug[];
  categories: CategorySlug[];
  products: ProductSlug[];
  design_inputs: DesignInputSlug[];
  certifications: CertSlug[];
  industries: IndustrySlug[];
  founded: number | null;
  years_experience: number | null;
  capacity: string;
  listing_url: string | null;
  sources: string[];
  added: string | null;
  updated: string;
}

export interface Dataset {
  name: string;
  license: string;
  attribution: string;
  homepage: string;
  last_updated: string;
  count: number;
  manufacturers: Manufacturer[];
}
