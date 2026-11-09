// Reproduces the Field Health workbook's formula columns (AJ:AT) exactly, driven by the
// editable Scoring Model inputs, so changing a weight/threshold recalculates everything live.

const RETIRE_SET = new Set([
  'Never Adopted',
  'Never Adopted (checkbox always FALSE)',
  'Never Populated',
  'Never Populated (checkbox always FALSE)',
  'Dormant',
  'Single Value Only',
]);

const VERIFY_SET = new Set(['Unreferenced Formula', 'Constant Formula']);

function num(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function hasAge(f) {
  return f.age !== null && f.age !== undefined && f.age !== '';
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function populationScore(f, sm) {
  if (f.formula === 'Yes') return 'n/a';
  const denom = Math.log(1 + num(sm.popFullCreditPct));
  if (!denom) return 0;
  const v = Math.log(1 + num(f.pctSinceCreation)) / denom;
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, v);
}

function recencyScore(f, sm) {
  if (f.formula === 'Yes') return 'n/a';
  if (!sm.recencyMonthsZero) return 0;
  const v = 1 - num(f.monthsSinceLast) / sm.recencyMonthsZero;
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, v);
}

function trendScore(f, sm) {
  if (f.formula === 'Yes') return 'n/a';
  if (hasAge(f) && f.age < sm.trendWindowDays) return 'n/a';
  const sinceCreation = num(f.pctSinceCreation);
  if (sinceCreation === 0) return 0;
  return Math.min(1, num(f.pct90d) / sinceCreation);
}

function infoScore(f, sm) {
  const span = sm.infoDistinctFull - 1;
  if (!span) return 0;
  const v = (num(f.distinctValues) - 1) / span;
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

function integrationScore(f, sm) {
  if (!sm.integrationRefsFull) return 0;
  const v = num(f.totalRefs) / sm.integrationRefsFull;
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, v);
}

function docScore(f) {
  return (f.helpText === 'Yes' ? 0.5 : 0) + (f.description === 'Yes' ? 0.5 : 0);
}

function healthScore(scores, sm) {
  const { population, recency, trend, info, integration, doc } = scores;
  const numerAdd = (s, w) => (s === 'n/a' ? 0 : s * w);
  const denomAdd = (s, w) => (s === 'n/a' ? 0 : w);
  const numerator =
    numerAdd(population, sm.weightPopulation) +
    numerAdd(recency, sm.weightRecency) +
    numerAdd(trend, sm.weightTrend) +
    info * sm.weightInfo +
    integration * sm.weightIntegration +
    doc * sm.weightDoc;
  const denominator =
    denomAdd(population, sm.weightPopulation) +
    denomAdd(recency, sm.weightRecency) +
    denomAdd(trend, sm.weightTrend) +
    sm.weightInfo +
    sm.weightIntegration +
    sm.weightDoc;
  if (!denominator) return 0;
  return round1((numerator / denominator) * 100);
}

// Same as the workbook Band formula (AQ), except that Standard and Managed Package fields always
// get their own band: neither can be deleted, so a Healthy-to-Retire rating doesn't apply to them.
// Their Health Score still shows, for reference only.
function band(f, score, sm) {
  if (f.origin === 'Managed Package') return 'Managed Package';
  if (f.origin === 'Standard') return 'Standard Field';
  if (hasAge(f) && f.age < sm.graceDays) return 'Too New - Provisional';
  if (num(f.eligibleSinceCreation) < sm.minEligible) return 'Insufficient Data';
  if (score >= sm.bandHealthy) return 'Healthy';
  if (score >= sm.bandMonitor) return 'Monitor';
  if (score >= sm.bandReview) return 'Review';
  if (score >= sm.bandLikelyDebt) return 'Likely Debt';
  return 'Retire';
}

function classify(f, sm) {
  if (hasAge(f) && f.age < sm.graceDays) return 'Too New';
  if (f.formula === 'Yes') {
    if (num(f.totalRefs) === 0) return 'Unreferenced Formula';
    if (num(f.distinctValues) === 1) return 'Constant Formula';
    return 'Active Formula';
  }
  if (num(f.recordsPopulated) === 0) {
    const base = f.origin === 'Custom' ? 'Never Adopted' : 'Never Populated';
    return base + (f.checkbox === 'Yes' ? ' (checkbox always FALSE)' : '');
  }
  if (f.checkbox === 'No' && num(f.distinctValues) === 1) return 'Single Value Only';
  if (num(f.monthsSinceLast) >= sm.dormancyMonths) return 'Dormant';
  if (num(f.pct90d) === 0) return 'Recently Stopped';
  if (num(f.pctSinceCreation) > 0 && num(f.pct90d) >= num(f.pctSinceCreation) * sm.growingMultiple) return 'Growing';
  if (num(f.pctSinceCreation) >= sm.activePct) return 'Active';
  return 'Rarely Used';
}

function action(f, classification, sm) {
  if (f.origin === 'Standard') return 'Standard field — not removable';
  if (f.origin === 'Managed Package') return 'Managed package — not removable';
  if (classification === 'Too New') return 'Re-assess after grace period';
  if (classification === 'Active' || classification === 'Growing' || classification === 'Active Formula') return 'Keep';
  if (classification === 'Rarely Used') return 'Review — consolidate or retire';
  if (classification === 'Recently Stopped') return 'Investigate — did a process break?';
  if (VERIFY_SET.has(classification)) return 'Verify formula usage';
  return f.required === 'Yes' ? 'Required field — resolve requirement first' : 'Retire candidate';
}

function monthStart(ym) {
  const [y, m] = ym.split('-').map(Number);
  return Date.UTC(y, m - 1, 1);
}

function effectiveAge(f, sm) {
  if (!hasAge(f)) return '';
  if (f.formula === 'Yes') return f.age;
  const created = f.createdDate ? new Date(f.createdDate) : null;
  const anchor = f.firstPopulated
    ? monthStart(f.firstPopulated)
    : created
      ? Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), 1)
      : null;
  if (anchor === null) return f.age;
  const asOf = sm.asOfDate ? new Date(sm.asOfDate).getTime() : Date.now();
  const diffDays = Math.round((asOf - anchor) / 86400000);
  return Math.max(f.age, diffDays);
}

// Scores one field record against a scoring model config, returning the original
// raw fields plus every computed column (component scores, health score, band,
// classification, action, effective age).
export function scoreField(f, sm) {
  const population = populationScore(f, sm);
  const recency = recencyScore(f, sm);
  const trend = trendScore(f, sm);
  const info = infoScore(f, sm);
  const integration = integrationScore(f, sm);
  const doc = docScore(f);
  const score = healthScore({ population, recency, trend, info, integration, doc }, sm);
  const classification = classify(f, sm);
  return {
    ...f,
    populationScore: population,
    recencyScore: recency,
    trendScore: trend,
    infoScore: info,
    integrationScore: integration,
    docScore: doc,
    healthScore: score,
    band: band(f, score, sm),
    classification,
    action: action(f, classification, sm),
    effectiveAge: effectiveAge(f, sm),
  };
}

export function scoreFields(fields, sm) {
  return fields.map(f => scoreField(f, sm));
}

export { RETIRE_SET, VERIFY_SET, num };
