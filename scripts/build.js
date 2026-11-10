// Converts one collect.js folder into the app's dataset JSON, reproducing the raw columns of
// the "<Object> Field Health Analysis <BU>.xlsx" Field Health tab (A:AI). The scored columns
// (AJ:AT) are computed by the app from the Scoring Model, exactly like the workbook formulas.
// usage: node build.js <dataDir> <BU> <outJson>
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const [dir, BU, outJson] = process.argv.slice(2);
const J = n => JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8'));
const meta = J('meta.json');
const obj = meta.obj;
const desc = J('describe.json');
const fdList = J('fielddefinition.json');
const cfList = J('customfield.json');
const deps = J('dependencies.json');
const source = J('source_counts.json');
const layouts = J('layouts.json');
const exportCols = J('export_columns.json');

const asOf = new Date(meta.takenAt.slice(0, 10) + 'T00:00:00Z');
const asOfYm = meta.takenAt.slice(0, 7);
const ymAdd = (ym, k) => { let [y, m] = ym.split('-').map(Number); m += k; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } return `${y}-${String(m).padStart(2, '0')}`; };
const lastComplete = ymAdd(asOfYm, -1);
const win90 = new Set([0, 1, 2].map(k => ymAdd(lastComplete, -k)));
const win365 = new Set([...Array(12).keys()].map(k => ymAdd(lastComplete, -k)));
const ymDiff = (a, b) => { const [ay, am] = a.split('-').map(Number); const [by, bm] = b.split('-').map(Number); return (ay - by) * 12 + (am - bm); };
const dayMs = 86400000;
const r4 = n => Math.round(n * 10000) / 10000;
const dateOnly = s => (s ? s.slice(0, 10) + 'T00:00:00.000Z' : null);

// ---- metadata joins
const dByName = Object.fromEntries(desc.fields.map(f => [f.name, f]));
const fdByName = Object.fromEntries(fdList.map(f => [f.QualifiedApiName, f]));
const cfByApi = {};
for (const c of cfList) {
  const api = (c.NamespacePrefix ? c.NamespacePrefix + '__' : '') + c.DeveloperName + '__c';
  cfByApi[api] = c;
}
const cfIdToApi = Object.fromEntries(Object.entries(cfByApi).map(([a, c]) => [c.Id.slice(0, 15), a]));

// References per field, deduped per component (a flow's versions count once).
const refs = {};
for (const d of deps) {
  const api = cfIdToApi[d.RefMetadataComponentId.slice(0, 15)];
  if (!api) continue;
  const r = (refs[api] ||= { Flow: new Set(), Formula: new Set(), Other: new Set() });
  const t = d.MetadataComponentType;
  if (t === 'Layout') continue; // layouts come from the retrieved layout files
  const kind = t === 'Flow' ? 'Flow' : t === 'CustomField' ? 'Formula' : 'Other';
  r[kind].add(`${t}:${t === 'Flow' ? d.MetadataComponentName : d.MetadataComponentId}`);
}

// Layout placements. Compound sub-fields take their parent's count.
const layoutCount = {};
for (const fields of Object.values(layouts)) for (const f of fields) layoutCount[f] = (layoutCount[f] || 0) + 1;
const layoutsFor = name => {
  const d = dByName[name];
  if (layoutCount[name]) return layoutCount[name];
  if (d && d.compoundFieldName && layoutCount[d.compoundFieldName]) return layoutCount[d.compoundFieldName];
  return 0;
};

// ---- assessable fields
// The field universe is the live describe, as in the workbook builds. FieldDefinition supplies the
// Setup-style Data Type and Description; the few describe-only fields (e.g. FiscalYear) fall back.
const FALLBACK_TYPE = { int: 'Number', double: 'Number', string: 'Text', boolean: 'Checkbox', date: 'Date', datetime: 'Date/Time', picklist: 'Picklist', reference: 'Lookup', textarea: 'Text Area', currency: 'Currency', percent: 'Percent', email: 'Email', phone: 'Phone', url: 'URL' };
for (const d of desc.fields) if (!fdByName[d.name]) fdByName[d.name] = { QualifiedApiName: d.name, Label: d.label, DataType: FALLBACK_TYPE[d.type] || d.type, Description: null, NamespacePrefix: null };
const notAssess = [];
const assess = [];
for (const d of desc.fields) {
  const name = d.name;
  const fd = fdByName[name];
  if (name === 'Id') { notAssess.push([fd, 'Record Id — present on every record by definition; not a data field.']); continue; }
  if (d.type === 'address' || d.type === 'location') { notAssess.push([fd, 'Compound field. Its component sub-fields (street, city, state, postal code, country, etc.) are assessed individually on Field Health; the compound parent holds no separate value.']); continue; }
  if (d.type === 'base64') { notAssess.push([fd, 'Binary (base64) field — cannot be exported or measured.']); continue; }
  if (!exportCols.includes(name)) { notAssess.push([fd, 'Rejected by the Bulk API export, so its records could not be read.']); continue; }
  assess.push(name);
}

// ---- stream the export
(async () => {
  const total = {};
  const pop = Object.fromEntries(assess.map(n => [n, {}]));
  const distinct = Object.fromEntries(assess.map(n => [n, new Set()]));
  const isBool = Object.fromEntries(assess.map(n => [n, dByName[n].type === 'boolean']));
  let firstCreated = null;
  let header = null;
  let idx = null;
  let cdIdx = -1;
  let n = 0;

  const hash = s => { let h1 = 0x811c9dc5, h2 = 0x01000193; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = Math.imul(h2 ^ c, 2246822519); } return (h1 >>> 0) * 2097152 + ((h2 >>> 0) & 2097151); };

  // RFC 4180 streaming parser over a read stream.
  const stream = fs.createReadStream(path.join(dir, 'export.csv'), { encoding: 'utf8', highWaterMark: 1 << 20 });
  let row = [], field = '', inQ = false, pendingQ = false;
  const onRow = r => {
    if (!header) { header = r; idx = assess.map(a => header.indexOf(a)); cdIdx = header.indexOf('CreatedDate'); return; }
    if (r.length === 1 && r[0] === '') return;
    n++;
    const cd = r[cdIdx];
    const ym = cd.slice(0, 7);
    if (!firstCreated || cd < firstCreated) firstCreated = cd;
    total[ym] = (total[ym] || 0) + 1;
    for (let k = 0; k < assess.length; k++) {
      const v = r[idx[k]];
      if (v === undefined || v === '') continue;
      const name = assess[k];
      if (isBool[name]) { if (v === 'true') { pop[name][ym] = (pop[name][ym] || 0) + 1; distinct[name].add(1); } continue; }
      pop[name][ym] = (pop[name][ym] || 0) + 1;
      distinct[name].add(hash(v));
    }
  };
  for await (const chunk of stream) {
    for (let i = 0; i < chunk.length; i++) {
      const c = chunk[i];
      if (pendingQ) { pendingQ = false; if (c === '"') { field += '"'; continue; } inQ = false; }
      if (inQ) { if (c === '"') pendingQ = true; else field += c; continue; }
      if (c === '"') { inQ = true; continue; }
      if (c === ',') { row.push(field); field = ''; continue; }
      if (c === '\r') continue;
      if (c === '\n') { row.push(field); onRow(row); row = []; field = ''; continue; }
      field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); onRow(row); }

  const months = Object.keys(total).sort();
  const firstYm = months[0];
  const sumTotal = pred => months.filter(pred).reduce((s, m) => s + total[m], 0);

  const fields = [];
  for (const name of assess) {
    const d = dByName[name];
    const fd = fdByName[name];
    const cf = cfByApi[name];
    const origin = fd.NamespacePrefix || (cf && cf.NamespacePrefix) ? 'Managed Package' : d.custom ? 'Custom' : 'Standard';
    const formula = d.calculated || /^(Formula|Roll-Up Summary)/.test(fd.DataType) ? 'Yes' : 'No';
    const created = cf ? dateOnly(cf.CreatedDate) : null;
    const createdYm = created ? created.slice(0, 7) : null;
    const age = created ? Math.round((asOf - new Date(created)) / dayMs) : null;
    const p = pop[name];
    const popAll = Object.values(p).reduce((s, x) => s + x, 0);
    const elig = m => !createdYm || m >= createdYm;
    const eligible = sumTotal(elig);
    const popSince = months.filter(elig).reduce((s, m) => s + (p[m] || 0), 0);
    const winPct = w => { const den = sumTotal(m => w.has(m) && elig(m)); const num = months.filter(m => w.has(m) && elig(m)).reduce((s, m) => s + (p[m] || 0), 0); return den ? r4((num / den) * 100) : 0; };
    const popMonths = months.filter(m => p[m]);
    const firstPop = popMonths[0] || null;
    const lastPop = popMonths[popMonths.length - 1] || null;
    const onset = months.find(m => p[m] && p[m] / total[m] >= 0.01) || null;
    let lag = null;
    if (onset && created) {
      const [oy, om] = onset.split('-').map(Number);
      const end = Date.UTC(oy, om, 0);
      lag = Math.max(0, Math.round((end - new Date(created)) / dayMs));
    }
    const rf = refs[name] || { Flow: new Set(), Formula: new Set(), Other: new Set() };
    const flows = rf.Flow.size, formulaRefs = rf.Formula.size, otherRefs = rf.Other.size, lay = layoutsFor(name);
    const src = source[name];
    fields.push({
      apiName: name,
      label: d.label,
      dataType: fd.DataType,
      origin,
      required: d.nillable ? 'No' : 'Yes',
      formula,
      checkbox: d.type === 'boolean' ? 'Yes' : 'No',
      createdDate: created,
      age,
      createdBeforeWindow: created && created.slice(0, 10) < firstCreated.slice(0, 10) ? 'Yes' : 'No',
      createdBy: cf ? cf.CreatedBy && cf.CreatedBy.Name : null,
      lastModified: cf ? dateOnly(cf.LastModifiedDate) : null,
      recordsPopulated: popAll,
      pctAll: n ? r4((popAll / n) * 100) : 0,
      eligibleSinceCreation: eligible,
      recordsPopulatedSinceCreation: popSince,
      pctSinceCreation: eligible ? r4((popSince / eligible) * 100) : 0,
      pct90d: winPct(win90),
      pct365d: winPct(win365),
      firstPopulated: firstPop,
      lastPopulated: lastPop,
      monthsSinceLast: lastPop ? Math.max(0, ymDiff(lastComplete, lastPop)) : 999,
      adoptionOnset: onset,
      adoptionLag: lag,
      distinctValues: distinct[name].size,
      flows,
      formulaRefs,
      layouts: lay,
      otherRefs,
      totalRefs: flows + formulaRefs + lay + otherRefs,
      refTypes: [flows, formulaRefs, lay, otherRefs].filter(x => x > 0).length,
      helpText: d.inlineHelpText ? 'Yes' : 'No',
      description: fd.Description ? 'Yes' : 'No',
      sourceRecordsPopulated: src === undefined ? null : src,
      varianceVsSource: src === undefined ? null : popAll - src,
    });
  }
  fields.sort((a, b) => a.apiName.localeCompare(b.apiName));

  const naRows = notAssess.map(([fd, why]) => {
    const d = dByName[fd.QualifiedApiName];
    return {
      'API Name': fd.QualifiedApiName,
      'Field Label': fd.Label,
      'Data Type': fd.DataType,
      'Why not assessable': why,
      'Help Text?': d && d.inlineHelpText ? 'Yes' : 'No',
      'Description?': fd.Description ? 'Yes' : 'No',
      'Required?': d && !d.nillable ? 'Yes' : 'No',
      'Formula?': d && d.calculated ? 'Yes' : 'No',
    };
  });

  const stats = {
    obj, BU, records: n, firstCreated: firstCreated.slice(0, 10), asOf: meta.takenAt.slice(0, 10),
    liveFields: desc.fields.length, assessed: fields.length, notAssessable: naRows.length,
    origins: fields.reduce((o, f) => ((o[f.origin] = (o[f.origin] || 0) + 1), o), {}),
    formulas: fields.filter(f => f.formula === 'Yes').length,
    checkboxes: fields.filter(f => f.checkbox === 'Yes').length,
    noCreated: fields.filter(f => !f.createdDate).length,
    beforeWindow: fields.filter(f => f.createdBeforeWindow === 'Yes').length,
    lagOverYear: fields.filter(f => f.adoptionLag > 365).length,
    layouts: Object.keys(layouts).length,
    layoutNames: Object.keys(layouts),
    namespaces: [...new Set(fdList.map(f => f.NamespacePrefix).filter(Boolean))].sort(),
    comparable: fields.filter(f => f.sourceRecordsPopulated !== null).length,
    exactMatch: fields.filter(f => f.varianceVsSource === 0).length,
    medianAbsVar: (() => { const v = fields.filter(f => f.varianceVsSource !== null).map(f => Math.abs(f.varianceVsSource)).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : 0; })(),
    win90: [...win90].sort(), win365: [...win365].sort(), partial: asOfYm,
    instanceUrl: meta.instanceUrl,
  };
  fs.writeFileSync(outJson, JSON.stringify({ stats, fields, notAssessable: { columns: ['API Name', 'Field Label', 'Data Type', 'Why not assessable', 'Help Text?', 'Description?', 'Required?', 'Formula?'], rows: naRows } }));
  console.log(JSON.stringify(stats));
})();
