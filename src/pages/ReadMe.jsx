import { useOrg } from '../state/OrgContext';
import { PageHeader } from '../components/ui';

export default function ReadMe() {
  const { base, org } = useOrg();
  const rows = base?.readMe ?? [];
  const [title, ...rest] = rows;

  return (
    <div>
      <PageHeader title={title?.a ?? 'Read Me'} subtitle={`Opportunity Field Health & Tech Debt Analysis — ${org}`} />
      <div>
        {rest.map((r, i) =>
          r.b ? (
            <div className="readme-row" key={i}>
              <div className="readme-row-label">{r.a}</div>
              <div className="readme-row-body">{r.b}</div>
            </div>
          ) : (
            <div className="readme-heading" key={i}>
              {r.a}
            </div>
          )
        )}
      </div>
    </div>
  );
}
