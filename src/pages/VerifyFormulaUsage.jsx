import { useMemo, useState } from 'react';
import { useOrg } from '../state/OrgContext';
import { PageHeader, EmptyState, Tag } from '../components/ui';
import FieldDrawer from '../components/FieldDrawer';
import { verifyFormulaUsage } from '../lib/derive';
import { pct, num0, dash, dateShort } from '../lib/format';

export default function VerifyFormulaUsage() {
  const { org, object, scored } = useOrg();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const rows = useMemo(() => {
    let r = verifyFormulaUsage(scored);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter(f => f.apiName.toLowerCase().includes(q) || (f.label || '').toLowerCase().includes(q));
    }
    return r;
  }, [scored, search]);

  return (
    <div>
      <PageHeader
        title="Verify Formula Usage"
        subtitle={`${object.label} — ${org} — formulas with no measurable usage signal: no metadata references, or a single constant value. Dependency data can't see reports, dashboards or external integrations — check those before deleting anything here.`}
      />

      <div className="toolbar">
        <input className="search-input" placeholder="Search by API name or label…" value={search} onChange={e => setSearch(e.target.value)} />
        <span className="toolbar-count">{rows.length} fields</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState>No unverified formula fields match.</EmptyState>
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
              <th>Distinct</th>
              <th>Classification</th>
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
                <td className="cell-muted">{num0(f.distinctValues)}</td>
                <td>
                  <Tag>{f.classification}</Tag>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <FieldDrawer field={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
