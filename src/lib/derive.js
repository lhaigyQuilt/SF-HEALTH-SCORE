import { RETIRE_SET, VERIFY_SET, num } from './scoring';

// "Retire Candidates" — custom, non-required fields past the grace period with no
// measurable current value.
export function retireCandidates(scored) {
  return scored.filter(
    f =>
      f.origin === 'Custom' &&
      f.required === 'No' &&
      f.formula !== 'Yes' &&
      f.band !== 'Too New - Provisional' &&
      f.band !== 'Managed Package' &&
      RETIRE_SET.has(f.classification)
  );
}

// "Verify Formula Usage" — custom formula fields with no metadata references, or a
// single constant value.
export function verifyFormulaUsage(scored) {
  return scored.filter(f => f.formula === 'Yes' && f.origin !== 'Managed Package' && VERIFY_SET.has(f.classification));
}

// "Data Quality Flags" — required-but-empty, slow adoption, or undocumented.
export function dataQualityFlags(scored) {
  const out = [];
  for (const f of scored) {
    const reasons = [];
    if (f.required === 'Yes' && num(f.recordsPopulated) === 0) reasons.push('Required but not populated');
    if (typeof f.adoptionLag === 'number' && f.adoptionLag > 365) reasons.push(`Adopted ${f.adoptionLag}d after creation`);
    if (f.helpText === 'No' && f.description === 'No') reasons.push('Undocumented');
    if (reasons.length) out.push({ ...f, flag: reasons.join('; ') });
  }
  return out;
}

export const BAND_ORDER = [
  'Healthy',
  'Monitor',
  'Review',
  'Likely Debt',
  'Retire',
  'Too New - Provisional',
  'Insufficient Data',
  'Standard Field',
  'Managed Package',
];

export const BAND_STATUS = {
  Healthy: 'green',
  Monitor: 'blue',
  Review: 'orange',
  'Likely Debt': 'orange',
  Retire: 'red',
  'Too New - Provisional': 'teal',
  'Insufficient Data': 'gray',
  'Standard Field': 'gray',
  'Managed Package': 'gray',
};

export function bandCounts(scored) {
  const counts = {};
  for (const b of BAND_ORDER) counts[b] = 0;
  for (const f of scored) counts[f.band] = (counts[f.band] || 0) + 1;
  return counts;
}
