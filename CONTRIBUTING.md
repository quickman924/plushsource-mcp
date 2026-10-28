# Contributing

This repository holds the open list of custom plush manufacturers behind
[PlushSource](https://plushsource.com), and the `plushsource-mcp` server. Anyone can ask for a
manufacturer to be added or for a fact to be corrected, including the manufacturer itself.

## Ways to contribute

1. **Open an issue.** This is the easiest way. Use one of these forms:
   - [Add a manufacturer](https://github.com/quickman924/plushsource-mcp/issues/new?template=add-manufacturer.yml)
   - [Correct a listing](https://github.com/quickman924/plushsource-mcp/issues/new?template=correction.yml)
2. **Open a pull request** that edits [`data/manufacturers.csv`](data/manufacturers.csv). The
   steps are below.

## What gets listed

The full rules are in the [listing criteria](https://plushsource.com/about/criteria). In short:

- The manufacturer's own website says it produces plush to a customer's design (custom, OEM or
  ODM work), not only stock products.
- Plush is a named part of what it offers, not an incidental product line.
- It publishes at least one commercial fact a buyer can act on: an MOQ, a sample or prototype
  service, a production location, or toy-safety certifications.
- Trading companies and sourcing agents qualify only if they state that they manage production
  with partner factories. Pure resellers and stock marketplaces are not listed.
- The website is reachable and clearly belongs to the business named in the listing. A record
  cannot be built from a directory profile alone.

## Every fact needs a public source

Each fact in a row must be backed by a public page that states it. Usually that is the
manufacturer's own website, a certificate registry, or a public marketplace or trade show profile.

- Put the links in the `sources` column, separated by `;`, or list them in the issue form.
- If the manufacturer does not publish a fact, leave the cell empty. Do not estimate, round or fill
  in from private quotes or emails.
- Only record certifications or test standards that are publicly claimed. A link to a certificate
  or test report is best.
- Do not add descriptions, marketing copy, logos, reviews, prices, or personal names, emails or
  phone numbers. The validator rejects emails and phone numbers.

## Opening a pull request

1. Fork the repository and edit `data/manufacturers.csv`. Add one row per manufacturer and keep the
   rows sorted by `slug`. Column formats and allowed values are in
   [`data/README.md`](data/README.md).
2. Leave `listing_url` empty and fill in `sources`. Set `added` and `updated` to the date you
   checked the sources.
3. Run the checks:

   ```sh
   npm install
   npm run build      # regenerates data/manufacturers.json and MANUFACTURERS.md
   npm run validate
   ```

4. Commit the CSV together with the regenerated `data/manufacturers.json` and `MANUFACTURERS.md`.
   CI runs the same checks on every pull request.

If you can't run Node, open the PR with only the CSV change and a maintainer will regenerate the
files.

For a correction, edit the cells that are wrong, add the link that proves the new value to
`sources`, and update `updated`.

## Review

A maintainer checks each source, may contact the manufacturer through its public website, and then
merges or explains what is missing. When a manufacturer is published on plushsource.com, the
maintainer fills in `listing_url`.

Manufacturers can ask for their row to be corrected or removed at any time through an issue.

## No endorsement, no paid ranking

A listing is not an endorsement, a ranking or a quality guarantee. Being listed is free, and
inclusion depends only on the listing criteria. If sponsored placement is ever offered, it will be
clearly labeled as sponsored, and it will not change the data in this repository.

## Licensing of contributions

By contributing data you agree that it is published under [CC BY 4.0](data/LICENSE). By
contributing code you agree that it is published under the [MIT License](LICENSE).
