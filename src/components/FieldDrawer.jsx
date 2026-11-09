import { Pill, Tag } from './ui';
import { pct, num0, dash, dateShort, scoreOrNA } from '../lib/format';

function Row({ label, value }) {
  return (
    <div>
      <div className="drawer-field-label">{label}</div>
      <div className="drawer-field-value">{value}</div>
    </div>
  );
}

export default function FieldDrawer({ field, onClose }) {
  if (!field) return null;
  const f = field;
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <button className="drawer-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div style={{ marginBottom: 6 }}>
          <Tag>{f.dataType}</Tag> <Tag>{f.origin}</Tag>
          {f.required === 'Yes' && <Tag>Required</Tag>}
          {f.formula === 'Yes' && <Tag>Formula</Tag>}
          {f.checkbox === 'Yes' && <Tag>Checkbox</Tag>}
        </div>
        <h1 className="page-title" style={{ fontSize: 17, marginBottom: 2 }}>
          {f.label}
        </h1>
        <div className="cell-mono" style={{ marginBottom: 10 }}>
          {f.apiName}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
          <Pill>{f.band}</Pill>
          <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{f.healthScore}</span>
          <span className="cell-muted">health score</span>
        </div>
        <div className="cell-muted" style={{ marginBottom: 2 }}>
          {f.classification}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 10 }}>{f.action}</div>

        <div className="drawer-section-title">Identity</div>
        <div className="drawer-grid">
          <Row label="Created" value={dateShort(f.createdDate)} />
          <Row label="Age (days)" value={dash(f.age)} />
          <Row label="Created by" value={dash(f.createdBy)} />
          <Row label="Last modified" value={dateShort(f.lastModified)} />
          <Row label="Effective age (days)" value={dash(f.effectiveAge)} />
          <Row label="Before export window" value={dash(f.createdBeforeWindow)} />
        </div>

        <div className="drawer-section-title">Population</div>
        <div className="drawer-grid">
          <Row label="Records populated" value={num0(f.recordsPopulated)} />
          <Row label="% populated (all)" value={pct(f.pctAll)} />
          <Row label="Eligible since creation" value={num0(f.eligibleSinceCreation)} />
          <Row label="% populated since creation" value={pct(f.pctSinceCreation)} />
          <Row label="% populated last 90d" value={pct(f.pct90d)} />
          <Row label="% populated last 365d" value={pct(f.pct365d)} />
          <Row label="First populated" value={dash(f.firstPopulated)} />
          <Row label="Last populated" value={dash(f.lastPopulated)} />
          <Row label="Months since last populated" value={dash(f.monthsSinceLast)} />
          <Row label="Distinct values" value={num0(f.distinctValues)} />
          <Row label="Adoption onset" value={dash(f.adoptionOnset)} />
          <Row label="Adoption lag (days)" value={dash(f.adoptionLag)} />
        </div>

        <div className="drawer-section-title">References</div>
        <div className="drawer-grid">
          <Row label="Flows" value={num0(f.flows)} />
          <Row label="Formula refs" value={num0(f.formulaRefs)} />
          <Row label="Layouts" value={num0(f.layouts)} />
          <Row label="Other refs" value={num0(f.otherRefs)} />
          <Row label="Total references" value={num0(f.totalRefs)} />
          <Row label="Reference types" value={num0(f.refTypes)} />
        </div>

        <div className="drawer-section-title">Documentation &amp; cross-check</div>
        <div className="drawer-grid">
          <Row label="Help text?" value={dash(f.helpText)} />
          <Row label="Description?" value={dash(f.description)} />
          <Row label="Source records populated" value={num0(f.sourceRecordsPopulated)} />
          <Row label="Variance vs source" value={dash(f.varianceVsSource)} />
        </div>

        <div className="drawer-section-title">Scoring</div>
        <div className="drawer-grid">
          <Row label="Population score" value={scoreOrNA(f.populationScore)} />
          <Row label="Recency score" value={scoreOrNA(f.recencyScore)} />
          <Row label="Trend score" value={scoreOrNA(f.trendScore)} />
          <Row label="Info score" value={scoreOrNA(f.infoScore)} />
          <Row label="Integration score" value={scoreOrNA(f.integrationScore)} />
          <Row label="Doc score" value={scoreOrNA(f.docScore)} />
        </div>
      </div>
    </>
  );
}
