import { useMemo, useState } from 'react';
import { useOrg } from '../state/OrgContext';
import { PageHeader, EmptyState, FilterChip, Tag } from '../components/ui';
import FieldDrawer from '../components/FieldDrawer';
import { dataQualityFlags } from '../lib/derive';
import { pct, num0, dash, dateShort } from '../lib/format';

const FLAG_FILTERS = ['Required but not populated', 'Adopted', 'Undocumented'];

export default function DataQualityFlags() {
  const { org, object, scored } = useOrg();
  const [search, setSearch] = useState('');
  const [flagFilter, setFlagFilter] = useState(null);
  const [selected, setSelected] = useState(null);

  const allFlagged = useMemo(() => dataQualityFlags(scored), [scored]);

  const rows = useMemo(() => {
    let r = allFlagged;
    if (flagFilter) r = r.filter(f => f.flag.includes(flagFilter));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter(f => f.apiName.toLowerCase().includes(q) || (f.label || '').toLowerCase().includes(q));
    }
    return r;
  }, [allFlagged, flagFilter, search]);

  const flagCounts = useMemo(() => {
    const c = { 'Required but not populated': 0, Adopted: 0, Undocumented: 0 };
    for (const f of allFlagged) {
      if (f.flag.includes('Required but not populated')) c['Required but not populated']++;
      if (f.flag.includes('Adopted')) c.Adopted++;
      if (f.flag.includes('Undocumented')) c.Undocumented++;
    }
    return c;
  }, [allFlagged]);

  return (
    <div>
      <PageHeader
        title="Data Quality Flags"
        subtitle={`${object.label} — ${org} — required fields not actually populated, fields adopted more than a year after creation, and fields with no help text or description.`}
      />

      <div className="chip-row">
        {FLAG_FILTERS.map(fl => (
          <FilterChip key={fl} active={flagFilter === fl} onClick={() => setFlagFilter(flagFilter === fl ? null : fl)}>
            {fl} ({flagCounts[fl]})
          </FilterChip>
        ))}
      </div>

      <div className="toolbar">
        <input className="search-input" placeholder="Search by API name or label…" value={search} onChange={e => setSearch(e.target.value)} />
        <span className="toolbar-count">{rows.length} fields</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState>No fields match the current filters.</EmptyState>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Flag</th>
              <th>Created</th>
              <th>Required?</th>
              <th>% populated (all)</th>
              <th>Records populated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(f => (
              <tr key={f.apiName} onClick={() => setSelected(f)}>
                <td>
                  <div>{f.label}</div>
                  <div className="cell-mono">{f.apiName}</div>
                </td>
                <td>
                  <Tag>{f.flag}</Tag>
                </td>
                <td className="cell-muted">{dateShort(f.createdDate)}</td>
                <td className="cell-muted">{dash(f.required)}</td>
                <td className="cell-muted">{pct(f.pctAll)}</td>
                <td className="cell-muted">{num0(f.recordsPopulated)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <FieldDrawer field={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
