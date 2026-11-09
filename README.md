# Opportunity Field Health

Interactive version of "Opportunity Field Health Analysis" (SBU and XBU) — Quilt Software Sales Ops theme.

Source: `Opportunity Field Health Analysis SBU.xlsx` / `...XBU.xlsx`, extracted into `public/data/{sbu,xbu}.json` and re-scored live in the browser.

## Pages

- **Read Me** — the workbook's methodology and caveats
- **Scoring Model** — editable weights, thresholds and bands; Field Health recalculates immediately
- **Field Health** — one row per assessed Opportunity field, searchable/filterable, with a full detail drawer
- **Additional Notes** — retire candidates with an editable Notes column (saved to this browser)
- **Retire Candidates** — custom, non-required fields past the grace period with no measurable current value
- **Verify Formula Usage** — formula fields with no references or a single constant value
- **Data Quality Flags** — required-but-empty, slow-adoption, and undocumented fields
- **Not Assessable** — fields excluded from measurement

The scoring engine (`src/lib/scoring.js`) reproduces the workbook's formula columns (Population/Recency/Trend/Info/Integration/Doc scores, Health Score, Band, Classification, Action, Effective Age) exactly, so editing a Scoring Model input live-recalculates every tab. Validated against the source workbooks: identical Retire Candidates / Verify Formula Usage / Data Quality Flags counts for both orgs.

Scoring Model edits and field Notes persist to `localStorage`, per browser, per org (SBU/XBU) — there is no backend.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
