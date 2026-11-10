import { useOrg } from '../state/OrgContext';
import { PageHeader } from '../components/ui';

export default function ReadMe() {
  const { base } = useOrg();
  const rows = base?.readMe ?? [];
  const [title, ...rest] = rows;

  return (
    <div>
      <PageHeader title="Read Me" subtitle={title?.a} />
      <div>
        <div className="readme-row">
          <div className="readme-row-label">Bands in this app</div>
          <div className="readme-row-body">
            Standard fields are banded "Standard Field" and managed-package fields "Managed Package" on every object,
            instead of a Healthy-to-Retire rating, because neither can be deleted. Their Health Score still shows, for
            reference only. All other scoring follows the workbook formulas.
          </div>
        </div>
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
