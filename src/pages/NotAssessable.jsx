import { useOrg } from '../state/OrgContext';
import { PageHeader, EmptyState } from '../components/ui';
import { dash } from '../lib/format';

export default function NotAssessable() {
  const { org, object, base } = useOrg();
  const notAssessable = base?.notAssessable ?? { columns: [], rows: [] };

  return (
    <div>
      <PageHeader title="Not Assessable" subtitle={`${object.label} — ${org}. Fields excluded from measurement.`} />
      {notAssessable.rows.length === 0 ? (
        <EmptyState>Nothing excluded for this object/org.</EmptyState>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              {notAssessable.columns.map(c => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {notAssessable.rows.map((row, i) => (
              <tr key={row[notAssessable.columns[0]] ?? i} style={{ cursor: 'default' }}>
                {notAssessable.columns.map(c => (
                  <td key={c} className={c === notAssessable.columns[0] ? 'cell-mono' : 'cell-muted'}>
                    {dash(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
