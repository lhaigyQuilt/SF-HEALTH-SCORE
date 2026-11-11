import { useMemo, useState } from 'react';
import { useOrg } from '../state/OrgContext';
import { PageHeader, StatTile, FilterChip, Pill, ProgressBar, EmptyState } from '../components/ui';
import FieldDrawer from '../components/FieldDrawer';
import FilterBuilder from '../components/FilterBuilder';
import ExportColumnsModal from '../components/ExportColumnsModal';
import { pct, num0, dash, dateShort } from '../lib/format';
import { BAND_ORDER, bandCounts } from '../lib/derive';
import { matchesFilters, FIELD_COLUMNS } from '../lib/columns';
import { toCsv, downloadCsv } from '../lib/exportCsv';

const ORIGINS = ['Custom', 'Standard', 'Managed Package'];
const EXPORT_COLUMNS_KEY = 'ofh:exportColumns';
const DATE_COLUMN_KEYS = new Set(['createdDate', 'lastModified']);

function readExportSelection() {
  try {
    const raw = localStorage.getItem(EXPORT_COLUMNS_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return new Set(FIELD_COLUMNS.map(c => c.key));
}

function formatForExport(col, value) {
  if (value === null || value === undefined || value === '') return '';
  if (DATE_COLUMN_KEYS.has(col.key)) return dateShort(value);
  return String(value);
}

export default function FieldHealth() {
  const { org, object, scored, fieldHealthFilters: filtersByKey, setFieldHealthFilters: setFiltersByKey } = useOrg();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('healthScore');
  const [sortDir, setSortDir] = useState('asc');
  const [selected, setSelected] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportColumns, setExportColumns] = useState(readExportSelection);

  const counts = useMemo(() => bandCounts(scored), [scored]);
  const avgHealth = useMemo(() => {
    if (!scored.length) return 0;
    return Math.round((scored.reduce((s, f) => s + f.healthScore, 0) / scored.length) * 10) / 10;
  }, [scored]);

  function toggleQuickFilter(key, value) {
    setFiltersByKey(prev => {
      if (prev[key]?.value === value) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { op: 'is', value } };
    });
  }

  function addFilter(key, op, value) {
    setFiltersByKey(prev => ({ ...prev, [key]: { op, value } }));
  }

  function removeFilter(key) {
    setFiltersByKey(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  const filtered = useMemo(() => {
    let rows = scored.filter(f => matchesFilters(f, filtersByKey));
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
  }, [scored, filtersByKey, search, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function persistExportColumns(next) {
    setExportColumns(next);
    try {
      localStorage.setItem(EXPORT_COLUMNS_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore (private window / quota) */
    }
  }

  function toggleExportColumn(key) {
    const next = new Set(exportColumns);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    persistExportColumns(next);
  }

  function handleExport() {
    const columns = FIELD_COLUMNS.filter(c => exportColumns.has(c.key));
    const header = columns.map(c => c.label);
    const rows = filtered.map(f => columns.map(c => formatForExport(c, f[c.key])));
    const filename = `${object.label}_Field_Health_${org}_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(filename, toCsv(header, rows));
    setExportOpen(false);
  }

  return (
    <div>
      <PageHeader title="Field Health" subtitle={`One row per assessed ${object.label} field — ${org}. ${scored.length} fields.`} />

      <div className="stat-row">
        <StatTile number={scored.length} label="Fields assessed" />
        <StatTile number={avgHealth} label="Avg health score" />
        <StatTile number={counts.Healthy ?? 0} label="Healthy" />
        <StatTile number={counts.Retire ?? 0} label="Retire" />
        <StatTile number={(counts['Likely Debt'] ?? 0) + (counts.Review ?? 0)} label="Review / Likely Debt" />
      </div>

      <div className="chip-row">
        {BAND_ORDER.filter(b => counts[b]).map(b => (
          <FilterChip key={b} active={filtersByKey.band?.value === b} onClick={() => toggleQuickFilter('band', b)}>
            {b} ({counts[b]})
          </FilterChip>
        ))}
      </div>
      <div className="chip-row">
        {ORIGINS.map(o => (
          <FilterChip key={o} active={filtersByKey.origin?.value === o} onClick={() => toggleQuickFilter('origin', o)} plum>
            {o}
          </FilterChip>
        ))}
      </div>

      <FilterBuilder
        rows={scored}
        filtersByKey={filtersByKey}
        onAdd={addFilter}
        onRemove={removeFilter}
        onClearAll={() => setFiltersByKey({})}
      />

      <div className="toolbar">
        <input className="search-input" placeholder="Search by API name or label…" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="toolbar-right">
          <span className="toolbar-count">
            {filtered.length} of {scored.length}
          </span>
          <button className="btn btn-primary" type="button" onClick={() => setExportOpen(true)}>
            Export to Excel
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>No fields match the current filters.</EmptyState>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Origin</th>
              <th onClick={() => toggleSort('createdDate')}>Created</th>
              <th onClick={() => toggleSort('lastModified')}>Last Modified</th>
              <th onClick={() => toggleSort('pctSinceCreation')}>% Pop (since creation)</th>
              <th onClick={() => toggleSort('age')}>Age (d)</th>
              <th onClick={() => toggleSort('lastPopulated')}>Last Populated</th>
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
                <td className="cell-muted">{dateShort(f.createdDate)}</td>
                <td className="cell-muted">{dateShort(f.lastModified)}</td>
                <td>{f.formula === 'Yes' ? <span className="cell-muted">n/a</span> : pct(f.pctSinceCreation)}</td>
                <td className="cell-muted">{dash(f.age)}</td>
                <td className="cell-muted">{dash(f.lastPopulated)}</td>
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

      <ExportColumnsModal
        open={exportOpen}
        selected={exportColumns}
        onToggle={toggleExportColumn}
        onSelectAll={() => persistExportColumns(new Set(FIELD_COLUMNS.map(c => c.key)))}
        onSelectNone={() => persistExportColumns(new Set())}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        rowCount={filtered.length}
      />
    </div>
  );
}
