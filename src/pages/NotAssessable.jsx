import { useOrg } from '../state/OrgContext';
import { PageHeader, EmptyState, Tag } from '../components/ui';
import { dash } from '../lib/format';

export default function NotAssessable() {
  const { org, base } = useOrg();
  const rows = base?.notAssessable ?? [];

  return (
    <div>
      <PageHeader title="Not Assessable" subtitle={`${org} — fields excluded from measurement.`} />
      {rows.length === 0 ? (
        <EmptyState>Nothing excluded for this org.</EmptyState>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Data type</th>
              <th>Why not assessable</th>
              <th>Help text?</th>
              <th>Description?</th>
              <th>Required?</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(f => (
              <tr key={f.apiName} style={{ cursor: 'default' }}>
                <td>
                  <div>{f.label}</div>
                  <div className="cell-mono">{f.apiName}</div>
                </td>
                <td className="cell-muted">{dash(f.dataType)}</td>
                <td className="cell-muted">{dash(f.why)}</td>
                <td>
                  <Tag>{dash(f.helpText)}</Tag>
                </td>
                <td>
                  <Tag>{dash(f.description)}</Tag>
                </td>
                <td>
                  <Tag>{dash(f.required)}</Tag>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
