import { useMemo, useState } from 'react';
import { useOrg } from '../state/OrgContext';
import { PageHeader, StatTile, FilterChip, Pill, ProgressBar, EmptyState } from '../components/ui';
import FieldDrawer from '../components/FieldDrawer';
import { pct, num0, dash } from '../lib/format';
import { BAND_ORDER, bandCounts } from '../lib/derive';

const ORIGINS = ['Custom', 'Standard', 'Managed Package'];

export default function FieldHealth() {
  const { org, scored } = useOrg();
  const [search, setSearch] = useState('');
  const [band, setBand] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [sortKey, setSortKey] = useState('healthScore');
  const [sortDir, setSortDir] = useState('asc');
  const [selected, setSelected] = useState(null);

  const counts = useMemo(() => bandCounts(scored), [scored]);
  const avgHealth = useMemo(() => {
    if (!scored.length) return 0;
    return Math.round((scored.reduce((s, f) => s + f.healthScore, 0) / scored.length) * 10) / 10;
  }, [scored]);

  const filtered = useMemo(() => {
    let rows = scored;
    if (band) rows = rows.filter(f => f.band === band);
    if (origin) rows = rows.filter(f => f.origin === origin);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(f => f.apiName.toLowerCase().includes(q) || (f.label || '').toLowerCase().includes(q));
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === bv) return 0;
      if (av === '' || av === null || av === undefined) return 1;
      if (bv === '' || bv === null || bv === undefined) return -1;
      return av > bv ? dir : -dir;
    });
  }, [scored, band, origin, search, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <div>
      <PageHeader title="Field Health" subtitle={`One row per assessed Opportunity field — ${org}. ${scored.length} fields.`} />

      <div className="stat-row">
        <StatTile number={scored.length} label="Fields assessed" />
        <StatTile number={avgHealth} label="Avg health score" />
        <StatTile number={counts.Healthy ?? 0} label="Healthy" />
        <StatTile number={counts.Retire ?? 0} label="Retire" />
        <StatTile number={(counts['Likely Debt'] ?? 0) + (counts.Review ?? 0)} label="Review / Likely Debt" />
      </div>

      <div className="chip-row">
        {BAND_ORDER.filter(b => counts[b]).map(b => (
          <FilterChip key={b} active={band === b} onClick={() => setBand(band === b ? null : b)}>
            {b} ({counts[b]})
          </FilterChip>
        ))}
      </div>
      <div className="chip-row">
        {ORIGINS.map(o => (
          <FilterChip key={o} active={origin === o} onClick={() => setOrigin(origin === o ? null : o)} plum>
            {o}
          </FilterChip>
        ))}
      </div>

      <div className="toolbar">
        <input className="search-input" placeholder="Search by API name or label…" value={search} onChange={e => setSearch(e.target.value)} />
        <span className="toolbar-count">{filtered.length} of {scored.length}</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>No fields match the current filters.</EmptyState>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Origin</th>
              <th onClick={() => toggleSort('pctSinceCreation')}>% Pop (since creation)</th>
              <th onClick={() => toggleSort('age')}>Age (d)</th>
              <th onClick={() => toggleSort('totalRefs')}>Refs</th>
              <th onClick={() => toggleSort('healthScore')}>Health</th>
              <th>Band</th>
              <th>Classification</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => (
              <tr key={f.apiName} onClick={() => setSelected(f)}>
                <td>
                  <div>{f.label}</div>
                  <div className="cell-mono">{f.apiName}</div>
                </td>
                <td className="cell-muted">{f.origin}</td>
                <td>{f.formula === 'Yes' ? <span className="cell-muted">n/a</span> : pct(f.pctSinceCreation)}</td>
                <td className="cell-muted">{dash(f.age)}</td>
                <td className="cell-muted">{num0(f.totalRefs)}</td>
                <td style={{ minWidth: 92 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600, color: 'var(--navy)', width: 30 }}>{f.healthScore}</span>
                    <ProgressBar value={f.healthScore} />
                  </div>
                </td>
                <td>
                  <Pill>{f.band}</Pill>
                </td>
                <td className="cell-muted">{f.classification}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <FieldDrawer field={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
