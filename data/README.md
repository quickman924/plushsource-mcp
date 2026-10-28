# Dataset

`manufacturers.csv` is the source of truth. One row per manufacturer, sorted by `slug`. It is the
file you edit in a pull request.

`manufacturers.json` and [`../MANUFACTURERS.md`](../MANUFACTURERS.md) are generated from the CSV by
`npm run generate`. CI fails if they are out of date. The MCP server bundles `manufacturers.json`.

The data covers facts only: what each manufacturer publicly states about itself. It has no
descriptions, reviews, logos or personal contact details. The written profile for each listed
manufacturer is on its page at [plushsource.com](https://plushsource.com).

Licence: [CC BY 4.0](LICENSE). Credit "PlushSource" with a link to https://plushsource.com.

## Columns

Lists use `;` with no spaces, for example `custom-plush;low-moq`. Leave a cell empty when the
manufacturer does not publish that fact. Never estimate.

| Column | Required | Format | Notes |
| --- | --- | --- | --- |
| `slug` | yes | `lowercase-with-hyphens` | Unique ID, usually derived from the name. It never changes once listed. |
| `name` | yes | text | Trading name, plus the legal name in brackets if it differs. |
| `website` | yes | URL | Official website. |
| `country` | yes | country slug | Where the production or main operation is. |
| `additional_countries` | no | country slugs | Other countries where they operate factories or offices. |
| `city` | no | text | Main city. |
| `location` | yes | text | Location as the manufacturer states it, e.g. `Dongguan, Guangdong, China`. |
| `moq` | no | whole number | Lowest stated minimum order quantity, in pieces. |
| `moq_stated` | if `moq` set | short text | MOQ as stated, e.g. `100 pcs/design`. |
| `sample_time` | no | short text | Stated sampling lead time, e.g. `7–10 days`. |
| `production_time` | no | short text | Stated bulk production lead time. |
| `oem` | yes | `yes` / `no` | Produces to the client's own design. |
| `odm` | yes | `yes` / `no` | Offers in-house design or development. |
| `categories` | yes | category slugs | At least one, usually `custom-plush`. |
| `products` | no | product slugs | |
| `design_inputs` | no | design input slugs | What a client can start from. |
| `certifications` | no | certification codes | Only certifications or test standards the manufacturer publicly claims. |
| `industries` | no | industry slugs | Client types they state they serve. |
| `founded` | no | year | |
| `years_experience` | no | whole number | As stated by the manufacturer. |
| `capacity` | no | short text | Stated production capacity. |
| `listing_url` | no | URL | The PlushSource listing. Maintainers fill this in. Leave it empty in a PR. |
| `sources` | if no `listing_url` | URLs | Public pages that prove the facts in the row. |
| `added` | no | `YYYY-MM-DD` | First added. |
| `updated` | yes | `YYYY-MM-DD` | The date the facts were last checked against the sources. |

Short text fields (`moq_stated`, `sample_time`, `production_time`, `capacity`) are limited to
120 characters. They hold a stated fact, not marketing copy. Email addresses and phone numbers are
rejected anywhere in the file.

Derived fields in the JSON: `moq_band` (`micro` 1–99, `low` 100–299, `standard` 300–999, `bulk`
1000+) and `services` (from `oem`, `odm` and `sample_time`).

## Allowed values

The full vocabulary with display names is in [`../src/vocabulary.json`](../src/vocabulary.json).

- **country**: china, vietnam, usa, uk, germany, france, poland, portugal, netherlands, italy,
  spain, south-korea, japan, taiwan, hong-kong, turkey, india, singapore
- **categories**: custom-plush, low-moq, oem-odm, prototype-sampling, character-plush,
  mascot-plush, promotional-plush, kickstarter, keychains
- **products**: stuffed-animals, character-plush, mascot-plush, plush-dolls, cotton-dolls,
  plush-keychains, promotional-plush, pillows, art-toys, baby-plush, plush-houseware,
  corporate-gifts, other
- **design_inputs**: artwork, sketch, photo, 3d-model, character-design, logo-mascot,
  physical-sample, tech-pack, written-brief
- **certifications**: CE, EN71, ASTM, CPSIA, BSCI, Sedex, ISO9001, ICTI, GOTS, FAMA, GRS,
  ISO8124, KC, ST, CPC, Prop65
- **industries**: ip-licensing, gaming, anime, brands, marketing-events, kickstarter,
  corporate-gifts, education, sports, museums

Need a value that is not on the list, such as a new country? Say so in your issue or PR, and a
maintainer will add it to the vocabulary.
