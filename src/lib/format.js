export function pct(v, digits = 1) {
  if (v === '' || v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  return `${Number(v).toFixed(digits)}%`;
}

export function num0(v) {
  if (v === '' || v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  return Number(v).toLocaleString('en-US');
}

export function yesNo(v) {
  return v === 'Yes';
}

export function dash(v) {
  if (v === '' || v === null || v === undefined) return '—';
  return String(v);
}

export function dateShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function scoreOrNA(v, digits = 2) {
  return v === 'n/a' ? 'n/a' : Number(v).toFixed(digits);
}
