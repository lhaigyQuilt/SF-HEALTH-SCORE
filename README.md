# Salesforce Field Health

Interactive version of the "&lt;Object&gt; Field Health Analysis &lt;BU&gt;.xlsx" workbooks — Quilt Software Sales Ops theme. Pick the **Org** (SBU or XBU) and the **Object** (Opportunity, Case, Account, Lead, Contact) in the sidebar.

## Data

One file per object and org: `public/data/<object>/<sbu|xbu>.json`. Every file has the workbook's 46-column Field Health layout and is re-scored live in the browser.

| Object | SBU | XBU | Source |
|---|---|---|---|
| Opportunity | 2026-10-09 | 2026-10-09 | Field Health workbooks |
| Case | 2026-10-25 | 2026-10-25 | Field Health workbooks |
| Account | 2026-10-02 | 2026-10-01 | Field Health workbooks |
| Lead | 2026-11-09 | 2026-11-09 | Live measurement (scripts below) |
| Contact | 2026-11-09 | 2026-11-09 | Live measurement (scripts below) |

Scripts in `scripts/` (read-only against Salesforce):

- `extract_wb.py <xlsx> <out.json>`: turns a Field Health workbook into a dataset file.
- `collect.js <alias> <Object> <dir>`: describe, Tooling FieldDefinition/CustomField, MetadataComponentDependency, a full Bulk export, an independent `COUNT()` per field, and the page layouts.
- `build.js <dir> <BU> <out.json>`: computes the workbook's raw columns (A:AI) from a `collect.js` folder, using the same rules as the Opportunity build (complete-month 90d/365d windows, eligibility from the field's creation month, the 1% adoption onset, exact distinct counts, flows counted once per flow).
- `finalize.mjs <build.json> <objectKey> <BU> <repoRoot>`: writes the dataset file with the shared Scoring Model, a Read Me and Additional Notes seeded with retire candidates.

`build.js` was checked by rebuilding XBU Opportunity live and comparing it with the 2026-10-09 workbook. Every definitional column matched (origin, required, formula, checkbox, created date, age, layouts, formula refs, help text). Fill rates were within 0.013 points at the median, and the remaining differences were a month of real changes.

## Pages

- **Read Me** — the workbook's methodology and caveats
- **Scoring Model** — the weights, thresholds and bands behind every score
- **Field Health** — one row per assessed field, searchable/filterable, with a full detail drawer
- **Additional Notes** — per-field notes with an editable Notes column (saved to this browser); Band, Classification and Action are always the live values
- **Retire Candidates** — custom, non-required fields past the grace period with no measurable current value
- **Verify Formula Usage** — formula fields with no references or a single constant value
- **Data Quality Flags** — required-but-empty, slow-adoption, and undocumented fields
- **Not Assessable** — fields excluded from measurement

The scoring engine (`src/lib/scoring.js`) reproduces the workbook's formula columns (Population/Recency/Trend/Info/Integration/Doc scores, Health Score, Band, Classification, Action, Effective Age). One deliberate difference: on every object, standard fields are banded **Standard Field** and managed-package fields **Managed Package** instead of a Healthy-to-Retire rating, because neither can be deleted. Their Health Score still shows, for reference only.

Field Notes persist to `localStorage`, per browser, per object and org — there is no backend.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
