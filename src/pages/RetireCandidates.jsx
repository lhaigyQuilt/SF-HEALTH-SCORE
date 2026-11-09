import { useMemo, useState } from 'react';
import { useOrg } from '../state/OrgContext';
import { PageHeader, EmptyState } from '../components/ui';
import FieldDrawer from '../components/FieldDrawer';
import { retireCandidates } from '../lib/derive';
import { pct, num0, dash, dateShort } from '../lib/format';

export default function RetireCandidates() {
  const { org, scored } = useOrg();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const rows = useMemo(() => {
    let r = retireCandidates(scored);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter(f => f.apiName.toLowerCase().includes(q) || (f.label || '').toLowerCase().includes(q));
    }
    return r;
  }, [scored, search]);

  return (
    <div>
      <PageHeader
        title="Retire Candidates"
        subtitle={`${org} — custom, non-required fields past the grace period with no measurable current value. Verify against reports, dashboards and integrations before deleting anything.`}
      />

      <div className="toolbar">
        <input className="search-input" placeholder="Search by API name or label…" value={search} onChange={e => setSearch(e.target.value)} />
        <span className="toolbar-count">{rows.length} fields</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState>No retire-candidate fields match.</EmptyState>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Created</th>
              <th>Age (d)</th>
              <th>Created by</th>
              <th>Records populated</th>
              <th>% pop since creation</th>
              <th>Months dormant</th>
              <th>Distinct</th>
              <th>Total refs</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(f => (
              <tr key={f.apiName} onClick={() => setSelected(f)}>
                <td>
                  <div>{f.label}</div>
                  <div className="cell-mono">{f.apiName}</div>
                </td>
                <td className="cell-muted">{dateShort(f.createdDate)}</td>
                <td className="cell-muted">{dash(f.age)}</td>
                <td className="cell-muted">{dash(f.createdBy)}</td>
                <td className="cell-muted">{num0(f.recordsPopulated)}</td>
                <td className="cell-muted">{pct(f.pctSinceCreation)}</td>
                <td className="cell-muted">{dash(f.monthsSinceLast)}</td>
                <td className="cell-muted">{num0(f.distinctValues)}</td>
                <td className="cell-muted">{num0(f.totalRefs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <FieldDrawer field={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
