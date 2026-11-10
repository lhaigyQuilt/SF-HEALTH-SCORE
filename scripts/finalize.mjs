// Wraps a build.js output into the app dataset format, with a Read Me in the workbook's
// structure and Additional Notes seeded with every retire candidate (as the Opportunity build did).
// usage: node finalize.mjs <build.json> <objectKey> <BU> <appRoot>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [buildPath, objectKey, BU, appRoot] = process.argv.slice(2);
const { scoreFields, RETIRE_SET } = await import(pathToFileURL(path.join(appRoot, 'src/lib/scoring.js')).href);
const b = JSON.parse(fs.readFileSync(buildPath, 'utf8'));
const s = b.stats;
const Obj = s.obj;
const objPlural = `${Obj}s`;

// Same weights and thresholds as every other object and business unit; only the as-of date changes.
const template = JSON.parse(fs.readFileSync(path.join(appRoot, 'public/data/opportunity/sbu.json'), 'utf8')).scoringModel;
const scoringModel = { ...template, asOfDate: `${s.asOf}T00:00:00.000Z` };

const scored = scoreFields(b.fields, scoringModel);
const retire = scored.filter(f => f.origin === 'Custom' && f.required === 'No' && f.formula !== 'Yes' && f.band !== 'Too New - Provisional' && f.band !== 'Managed Package' && RETIRE_SET.has(f.classification));
const additionalNotes = {
  columns: ['API Name', 'Field Label', 'Data Type', 'Band', 'Classification', 'Action', 'Notes'],
  rows: retire.map(f => ({ 'API Name': f.apiName, 'Field Label': f.label, 'Data Type': f.dataType, Band: f.band, Classification: f.classification, Action: f.action, Notes: null })),
};

const fmt = n => n.toLocaleString('en-US');
const orgName = BU === 'SBU' ? 'SBU production (Quilt Software / posnation)' : 'XBU production (rainprod / Rain)';
const nsList = s.namespaces.length ? ` (${s.namespaces.join(', ')})` : '';
const longText = b.fields.filter(f => /^Long Text Area|^Rich Text Area/.test(f.dataType)).length;
const naNames = b.notAssessable.rows.map(r => r['API Name']);
const compound = naNames.filter(n => n !== 'Id');
const layoutWord = s.layouts === 1 ? 'the 1 retrieved' : `all ${s.layouts} retrieved`;
const dqRequired = scored.filter(f => f.required === 'Yes' && Number(f.recordsPopulated) === 0).length;
const dqUndoc = scored.filter(f => f.helpText === 'No' && f.description === 'No').length;

const readMe = [
  [`${Obj} Field Health & Tech Debt Analysis — ${BU}`, null],
  ['Purpose', `Identify which ${Obj} fields are genuinely in use and which are tech debt, using measured record-level population rather than estimates.`],
  ['Metadata source', `Live Salesforce metadata (object describe, Tooling FieldDefinition and CustomField) read directly from ${orgName} on ${s.asOf}. No intermediate metadata export.`],
  ['Enrichment source', `Created Date, Created By and Last Modified come live from Tooling CustomField. Flows, Formula Refs and Other Refs come live from Tooling MetadataComponentDependency (a flow counts once, however many versions reference the field); Layouts from parsing ${layoutWord} ${Obj} page layouts (compound sub-fields take the layout count of their parent). Lightning record pages (FlexiPages) are counted under Other Refs. Required? / Help Text / Description come from the live read. Required? = the field is not nillable. There is no source catalogue for ${BU} ${Obj}, so the cross-check uses an independent server-side count (see caveat 5).`],
  ['Record source', `Full Bulk API 2.0 export of every ${Obj} record from ${BU} production. Every measure is an exact count over every ${Obj}, not a sample.`],
  [`${Obj} records analysed`, s.records],
  [`${Obj} date range`, `${s.firstCreated} to ${s.asOf} (record window; the 90d/365d windows use complete months only — see caveat 9)`],
  ['Field coverage', `${s.assessed} of ${s.liveFields} live ${Obj} fields assessed. ${naNames.length === 1 ? 'Only Id is excluded' : `Id${compound.length ? ` and the ${compound.length} compound field${compound.length === 1 ? '' : 's'} (${compound.join(', ')})` : ''} are excluded`} and listed on Not Assessable.${longText ? ` The ${longText} Long Text Area fields are assessed too, because the record export can test them for non-null.` : ''}`],
  ['THE THREE REQUESTED MEASURES', null],
  ['1. Field age', `Column "Age (days)", from the field's Created Date (Tooling CustomField). ${s.noCreated} fields (standard fields) have no creation date and show blank.`],
  ['2. Population %', `Column "% Populated (all records)" — measured across all ${fmt(s.records)} ${objPlural}, not sampled.`],
  ['3. Population since creation', `Columns "Eligible Records (since creation)" and "% Populated Since Creation" restrict the denominator to ${objPlural} created in or after the month the field was created. This is the fair measure: a field created in 2026 is not penalised for empty older records.`],
  ['Bonus: adoption lag', `"Adoption Lag (days)" is the gap between a field being created and the end of its first month of real use (>=1% of that month's ${objPlural}). A long lag means the field sat unused after it was built; ${s.lagOverYear} field${s.lagOverYear === 1 ? '' : 's'} waited over a year.`],
  ['CAVEATS', null],
  [`1. Record window starts ${s.firstCreated.slice(0, 7)}`, `${s.beforeWindow} field(s) predate the first ${Obj} in the org and are measured across the whole window. Flagged in "Created Before Export Window".`],
  ['2. Formula fields are always populated', `${s.formulas} fields are formulas or roll-up summaries. They compute a value on every record, so population, recency and trend are meaningless for them. Those three components score "n/a" and the total renormalises over information content, integration and documentation.`],
  ['3. Checkboxes are never null', `${s.checkboxes} checkbox fields. A checkbox is populated on 100% of records by definition, so every measure here uses % TRUE instead — including recency and trend.`],
  ['4. New fields sit outside the score ladder', 'Fields under the grace period are banded "Too New - Provisional" rather than given a Healthy/Retire rating, because two components are structurally biased against them: Trend compares a 90-day window that predates the field, and Integration/Documentation lag behind field creation. Their score still shows, but as advisory only. Fields are also banded Insufficient Data if they have too few eligible records to measure, whatever their age.'],
  ['   Field Origin', `One column carries provenance: Custom (${s.origins.Custom || 0}), Standard (${s.origins.Standard || 0}) or Managed Package (${s.origins['Managed Package'] || 0}). Managed-package fields belong to an installed app${nsList} and cannot be deleted at all, so they are excluded from Retire Candidates. Standard and Managed Package fields are banded "Standard Field" and "Managed Package" instead of a Healthy-to-Retire rating (the Health Score still shows, for reference only).`],
  ['   Scoring model', 'Weights, thresholds and bands are carried over unchanged from the other Field Health workbooks (Case, Account, Opportunity), so every object and business unit scores on the same scale.'],
  ['5. Cross-check against source', `Columns "Source Records Populated" and "Variance vs Source" compare the export count against an independent count run directly in the org (SELECT COUNT() FROM ${Obj} WHERE field != null, or = true for checkboxes), taken minutes after the export on ${s.asOf}. A small variance is ${objPlural} created or edited between the two pulls, not an error. Source is blank for fields Salesforce cannot filter on (Long Text Area and similar). ${s.exactMatch} of ${s.comparable} comparable fields match exactly and the median absolute variance is ${s.medianAbsVar}.`],
  ['6. Deleted records', 'IsDeleted was not used to filter; the Bulk export excludes soft-deleted records by default.'],
  ['7. Cardinality is exact, not sampled', `Distinct values are counted exactly over every ${Obj} from the export. Checkboxes show 1 when the box is ever TRUE and 0 when it never is. A distinct count of 0 means the field is never populated, not that cardinality is unknown.`],
  ['8. Blind spots remain', 'The record measures cannot see reports, dashboards, or external integrations. The dependency graph (MetadataComponentDependency) does not track standard fields at all, so standard fields show only their Layouts count. A field can look dead here and still break something on deletion.'],
  ['9. Window alignment', `"% Populated Last 90d" is the three most recent complete months (${s.win90[0]} to ${s.win90[2]}) and "% Populated Last 365d" the twelve most recent complete months (${s.win365[0]} to ${s.win365[11]}), each restricted to ${objPlural} eligible since the field's creation. Month-aligned windows keep the numerator and denominator consistent; records created in the partial month ${s.partial} are excluded from both.`],
  ['HOW TO USE', null],
  ['Field Health tab', 'One row per assessed field: raw measures on the left, scored components and classification on the right.'],
  ['Additional Notes tab', `Seeded with every retire candidate this analysis found (${retire.length}). Add your own notes in the Notes column.`],
  ['Retire Candidates tab', 'Custom, non-required fields past the grace period with no measurable current value.'],
  ['Verify Formula Usage tab', 'Custom formula fields with no metadata references, or a single constant value.'],
  ['Data Quality Flags tab', `Required fields not actually populated (${dqRequired}), fields adopted more than a year after creation (${s.lagOverYear}), and fields with no help text or description (${dqUndoc}).`],
  ['IMPORTANT', 'A low score is a prompt to investigate, not an instruction to delete. Verify dependencies before removing any field.'],
  ['EFFECTIVE AGE', '"Effective Age (days)" is the days between the Analysis as-of date (Scoring Model tab) and the older of the field\'s creation month and its first month carrying data. Formula and roll-up fields keep their metadata age, because they compute retroactively and would otherwise all look ancient; never-populated fields anchor to their creation month. It is reference information only: the Band, Trend, Classification and Action formulas key the grace period on the literal "Age (days)" from the metadata Created Date.'],
  ['BUILT FROM', `Built ${s.asOf} against live ${BU} production with the same pipeline, structure, columns, scoring formulas, classification and action rules as "Opportunity Field Health Analysis ${BU}.xlsx": a full record export, a live dependency crawl, and layouts parsed from metadata.`],
].map(([a, bb]) => ({ a, b: bb }));

const out = path.join(appRoot, 'public/data', objectKey, `${BU.toLowerCase()}.json`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ scoringModel, fields: b.fields, additionalNotes, notAssessable: b.notAssessable, readMe }));
const bands = scored.reduce((o, f) => ((o[f.band] = (o[f.band] || 0) + 1), o), {});
console.log(out, `${b.fields.length} fields, ${retire.length} retire candidates`, JSON.stringify(bands));
