// Registry of every Field Health column, driving the generic column filter builder.
export const FIELD_COLUMNS = [
  { key: 'apiName', label: 'API Name', type: 'text' },
  { key: 'label', label: 'Field Label', type: 'text' },
  { key: 'dataType', label: 'Data Type', type: 'select' },
  { key: 'origin', label: 'Field Origin', type: 'select' },
  { key: 'required', label: 'Required?', type: 'yesno' },
  { key: 'formula', label: 'Formula?', type: 'yesno' },
  { key: 'checkbox', label: 'Checkbox?', type: 'yesno' },
  { key: 'createdDate', label: 'Created Date', type: 'text' },
  { key: 'age', label: 'Age (days)', type: 'number' },
  { key: 'createdBeforeWindow', label: 'Created Before Export Window', type: 'yesno' },
  { key: 'createdBy', label: 'Created By', type: 'text' },
  { key: 'lastModified', label: 'Last Modified', type: 'text' },
  { key: 'recordsPopulated', label: 'Records Populated', type: 'number' },
  { key: 'pctAll', label: '% Populated (all records)', type: 'number' },
  { key: 'eligibleSinceCreation', label: 'Eligible Records (since creation)', type: 'number' },
  { key: 'recordsPopulatedSinceCreation', label: 'Records Populated Since Creation', type: 'number' },
  { key: 'pctSinceCreation', label: '% Populated Since Creation', type: 'number' },
  { key: 'pct90d', label: '% Populated Last 90d', type: 'number' },
  { key: 'pct365d', label: '% Populated Last 365d', type: 'number' },
  { key: 'firstPopulated', label: 'First Populated', type: 'text' },
  { key: 'lastPopulated', label: 'Last Populated', type: 'text' },
  { key: 'monthsSinceLast', label: 'Months Since Last Populated', type: 'number' },
  { key: 'adoptionOnset', label: 'Adoption Onset', type: 'text' },
  { key: 'adoptionLag', label: 'Adoption Lag (days)', type: 'number' },
  { key: 'distinctValues', label: 'Distinct Values', type: 'number' },
  { key: 'flows', label: 'Flows', type: 'number' },
  { key: 'formulaRefs', label: 'Formula Refs', type: 'number' },
  { key: 'layouts', label: 'Layouts', type: 'number' },
  { key: 'otherRefs', label: 'Other Refs', type: 'number' },
  { key: 'totalRefs', label: 'Total References', type: 'number' },
  { key: 'refTypes', label: 'Ref Types', type: 'number' },
  { key: 'helpText', label: 'Help Text?', type: 'yesno' },
  { key: 'description', label: 'Description?', type: 'yesno' },
  { key: 'sourceRecordsPopulated', label: 'Source Records Populated', type: 'number' },
  { key: 'varianceVsSource', label: 'Variance vs Source', type: 'number' },
  { key: 'populationScore', label: 'Population Score', type: 'number' },
  { key: 'recencyScore', label: 'Recency Score', type: 'number' },
  { key: 'trendScore', label: 'Trend Score', type: 'number' },
  { key: 'infoScore', label: 'Info Score', type: 'number' },
  { key: 'integrationScore', label: 'Integration Score', type: 'number' },
  { key: 'docScore', label: 'Doc Score', type: 'number' },
  { key: 'healthScore', label: 'Health Score', type: 'number' },
  { key: 'band', label: 'Band', type: 'select' },
  { key: 'classification', label: 'Classification', type: 'select' },
  { key: 'action', label: 'Action', type: 'select' },
  { key: 'effectiveAge', label: 'Effective Age (days)', type: 'number' },
];

export const COLUMN_BY_KEY = Object.fromEntries(FIELD_COLUMNS.map(c => [c.key, c]));

export const OPERATORS_BY_TYPE = {
  text: [
    { value: 'contains', label: 'contains' },
    { value: 'equals', label: 'is' },
    { value: 'notEquals', label: 'is not' },
  ],
  number: [
    { value: 'eq', label: '=' },
    { value: 'neq', label: '≠' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '≥' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '≤' },
  ],
  select: [
    { value: 'is', label: 'is' },
    { value: 'isNot', label: 'is not' },
  ],
  yesno: [{ value: 'is', label: 'is' }],
};

export function defaultOperator(type) {
  return OPERATORS_BY_TYPE[type][0].value;
}

export function distinctValuesFor(rows, key) {
  const set = new Set();
  for (const r of rows) {
    const v = r[key];
    if (v !== null && v !== undefined && v !== '') set.add(String(v));
  }
  return [...set].sort();
}

function numericMatch(raw, op, value) {
  if (raw === 'n/a' || raw === '' || raw === null || raw === undefined) return false;
  const n = Number(raw);
  const v = Number(value);
  if (Number.isNaN(n) || Number.isNaN(v)) return false;
  switch (op) {
    case 'eq':
      return n === v;
    case 'neq':
      return n !== v;
    case 'gt':
      return n > v;
    case 'gte':
      return n >= v;
    case 'lt':
      return n < v;
    case 'lte':
      return n <= v;
    default:
      return true;
  }
}

function textMatch(raw, op, value) {
  const rv = (raw ?? '').toString().toLowerCase();
  const fv = (value ?? '').toString().toLowerCase();
  switch (op) {
    case 'contains':
      return rv.includes(fv);
    case 'equals':
      return rv === fv;
    case 'notEquals':
      return rv !== fv;
    default:
      return true;
  }
}

function selectMatch(raw, op, value) {
  const rv = (raw ?? '').toString();
  if (op === 'isNot') return rv !== value;
  return rv === value;
}

// filtersByKey: { [columnKey]: { op, value } }
export function matchesFilters(row, filtersByKey) {
  for (const [key, { op, value }] of Object.entries(filtersByKey)) {
    const col = COLUMN_BY_KEY[key];
    if (!col) continue;
    const raw = row[key];
    let ok;
    if (col.type === 'number') ok = numericMatch(raw, op, value);
    else if (col.type === 'select' || col.type === 'yesno') ok = selectMatch(raw, op, value);
    else ok = textMatch(raw, op, value);
    if (!ok) return false;
  }
  return true;
}
