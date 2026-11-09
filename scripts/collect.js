// Read-only collector for one org + object. Mirrors the Opportunity Field Health build:
// describe + Tooling FieldDefinition/CustomField, MetadataComponentDependency, full Bulk export,
// independent COUNT() per field (Source Records Populated), and page layouts.
// usage: node collect.js <alias> <Object> <outDir>
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const [alias, obj, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const log = m => { const l = `${new Date().toISOString().slice(11, 19)} ${alias} ${obj} ${m}`; console.log(l); fs.appendFileSync(path.join(outDir, 'run.log'), l + '\n'); };
const sfj = cmd => JSON.parse(execSync(`sf ${cmd} --json`, { encoding: 'utf8', maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'ignore'] })).result;

const org = sfj(`org display -o ${alias}`);
const base = `/services/data/v66.0`;
// The CLI redacts access tokens, so every REST call goes through `sf api request rest`.
function rest(url, body) {
  const args = [`api request rest "${url}" -o ${alias}`];
  if (body) {
    const bf = path.join(outDir, '_body.json');
    fs.writeFileSync(bf, JSON.stringify(body));
    args.push(`--method POST --body @"${bf}"`);
  }
  for (let t = 0; t < 4; t++) {
    try {
      return JSON.parse(execSync(`sf ${args.join(' ')}`, { encoding: 'utf8', maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'pipe'] }));
    } catch (e) {
      if (t === 3) throw new Error(((e.stdout || '') + (e.stderr || '')).slice(0, 400));
    }
  }
}
async function get(url) {
  const r = rest(url.startsWith('/services') ? url : base + url);
  if (Array.isArray(r) && r[0] && r[0].errorCode) throw new Error(JSON.stringify(r).slice(0, 300));
  return r;
}
async function queryAll(soql, tooling) {
  let res = await get(`${tooling ? '/tooling' : ''}/query?q=${encodeURIComponent(soql)}`);
  const out = [...res.records];
  while (res.nextRecordsUrl) { res = await get(res.nextRecordsUrl); out.push(...res.records); }
  return out;
}
const save = (n, d) => fs.writeFileSync(path.join(outDir, n), JSON.stringify(d));

(async () => {
  // 1. Metadata
  const desc = await get(`/sobjects/${obj}/describe`);
  save('describe.json', desc);
  const fd = await queryAll(`SELECT QualifiedApiName, Label, DataType, Description, NamespacePrefix FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName = '${obj}'`, true);
  save('fielddefinition.json', fd);
  const entId = obj; // standard objects use the name as TableEnumOrId
  const cf = await queryAll(`SELECT Id, DeveloperName, NamespacePrefix, CreatedDate, CreatedBy.Name, LastModifiedDate, LastModifiedBy.Name FROM CustomField WHERE TableEnumOrId = '${entId}'`, true);
  save('customfield.json', cf);
  log(`describe ${desc.fields.length} fields, FieldDefinition ${fd.length}, CustomField ${cf.length}`);

  // 2. Dependencies
  const deps = [];
  const ids = cf.map(c => c.Id);
  for (let i = 0; i < ids.length; i += 40) {
    const inList = ids.slice(i, i + 40).map(x => `'${x}'`).join(',');
    const r = await queryAll(`SELECT MetadataComponentId, MetadataComponentType, MetadataComponentName, RefMetadataComponentId FROM MetadataComponentDependency WHERE RefMetadataComponentId IN (${inList})`, true);
    if (r.length >= 2000) log(`WARN dependency batch ${i} returned ${r.length} rows (cap)`);
    deps.push(...r);
  }
  save('dependencies.json', deps);
  log(`dependencies ${deps.length}`);

  // 3. Full Bulk export of every assessable field
  const skipTypes = new Set(['address', 'location', 'base64']);
  let cols = desc.fields.filter(f => !skipTypes.has(f.type)).map(f => f.name);
  if (!cols.includes('CreatedDate')) throw new Error('no CreatedDate');
  const csv = path.join(outDir, 'export.csv');
  for (let attempt = 0; attempt < 6; attempt++) {
    const qf = path.join(outDir, 'export.soql');
    fs.writeFileSync(qf, `SELECT ${cols.join(', ')} FROM ${obj}`);
    try {
      execSync(`sf data export bulk -o ${alias} --query-file "${qf}" --output-file "${csv}" --result-format csv --wait 60 --json`, { encoding: 'utf8', maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'pipe'] });
      break;
    } catch (e) {
      const msg = (e.stdout || '') + (e.stderr || '');
      const bad = [...msg.matchAll(/No such column '([^']+)'|field '?([A-Za-z0-9_]+)'? (?:can not|cannot|is not supported)/gi)].map(m => m[1] || m[2]).filter(Boolean);
      log(`export attempt ${attempt} failed: ${msg.slice(0, 300).replace(/\s+/g, ' ')}`);
      if (!bad.length) throw e;
      cols = cols.filter(c => !bad.includes(c));
      log(`dropping ${bad.join(',')}`);
    }
  }
  save('export_columns.json', cols);
  log(`export ${(fs.statSync(csv).size / 1048576).toFixed(1)} MB`);

  // 4. Independent server-side count per filterable field
  const source = {};
  const filt = desc.fields.filter(f => f.filterable && !skipTypes.has(f.type) && f.name !== 'Id');
  for (let i = 0; i < filt.length; i += 25) {
    const batch = filt.slice(i, i + 25);
    const body = {
      batchRequests: batch.map(f => ({
        method: 'GET',
        url: `v66.0/query?q=${encodeURIComponent(`SELECT COUNT() FROM ${obj} WHERE ${f.name} ${f.type === 'boolean' ? '= true' : '!= null'}`)}`,
      })),
    };
    const r = rest(`${base}/composite/batch`, body);
    r.results.forEach((x, k) => { if (x.statusCode === 200) source[batch[k].name] = x.result.totalSize; });
  }
  save('source_counts.json', source);
  log(`source counts ${Object.keys(source).length}/${filt.length}`);

  // 5. Layouts
  const lm = sfj(`org list metadata -m Layout -o ${alias}`);
  const names = (Array.isArray(lm) ? lm : [lm]).map(x => x.fullName).filter(n => n.split('-')[0] === obj);
  const proj = path.join(outDir, 'layouts_md');
  fs.rmSync(proj, { recursive: true, force: true });
  fs.mkdirSync(proj, { recursive: true });
  const pkg = `<?xml version="1.0" encoding="UTF-8"?><Package xmlns="http://soap.sforce.com/2006/04/metadata"><types>${names.map(n => `<members>${n.replace(/&/g, '&amp;')}</members>`).join('')}<name>Layout</name></types><version>66.0</version></Package>`;
  fs.writeFileSync(path.join(proj, 'package.xml'), pkg);
  execSync(`sf project retrieve start -o ${alias} --manifest "${path.join(proj, 'package.xml')}" --target-metadata-dir "${path.join(proj, 'out')}" --unzip --wait 30 --json`, { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 });
  const layouts = {};
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.layout')) layouts[e.name.replace(/\.layout$/, '')] = [...new Set([...fs.readFileSync(p, 'utf8').matchAll(/<field>([^<]+)<\/field>/g)].map(m => m[1]))]; } };
  walk(path.join(proj, 'out'));
  save('layouts.json', layouts);
  log(`layouts ${Object.keys(layouts).length} of ${names.length}`);
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({ alias, obj, instanceUrl: org.instanceUrl, username: org.username, orgId: org.id, takenAt: new Date().toISOString() }));
  log('done');
})().catch(e => { log('FATAL ' + e.message); process.exit(1); });
