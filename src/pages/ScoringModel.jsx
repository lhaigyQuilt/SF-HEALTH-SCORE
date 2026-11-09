import { useOrg } from '../state/OrgContext';
import { PageHeader, SectionCard } from '../components/ui';
import SaveBar from '../components/SaveBar';

function NumberRow({ label, desc, value, onChange, step = 1 }) {
  return (
    <tr>
      <td className="sm-label">{label}</td>
      <td className="sm-input">
        <input
          type="number"
          step={step}
          className="sm-input-box"
          value={value}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      </td>
      <td className="sm-desc">{desc}</td>
    </tr>
  );
}

export default function ScoringModelPage() {
  const { org, scoringModel, updateScoringModel, scoringDirty, saveScoringModel, resetScoringModel, restoreScoringDefaults } = useOrg();
  if (!scoringModel) return null;
  const sm = scoringModel;
  const set = key => value => updateScoringModel({ [key]: value });

  const weightTotal =
    Number(sm.weightPopulation || 0) +
    Number(sm.weightRecency || 0) +
    Number(sm.weightTrend || 0) +
    Number(sm.weightInfo || 0) +
    Number(sm.weightIntegration || 0) +
    Number(sm.weightDoc || 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <PageHeader
          title="Scoring Model"
          subtitle={`Editable inputs — ${org}. Change a weight or threshold and Field Health recalculates immediately.`}
        />
        <button className="btn-plain" type="button" onClick={restoreScoringDefaults}>
          Restore original values
        </button>
      </div>

      <SectionCard title="Component weights" count={`total ${weightTotal} ${weightTotal === 100 ? '' : '(should be 100)'}`}>
        <table className="sm-table">
          <tbody>
            <NumberRow
              label="Weight: Population"
              desc="Share of eligible records carrying a value (% TRUE for checkboxes). n/a for formula fields."
              value={sm.weightPopulation}
              onChange={set('weightPopulation')}
            />
            <NumberRow
              label="Weight: Recency"
              desc="Whether the field is still being populated on new opportunities. n/a for formula fields."
              value={sm.weightRecency}
              onChange={set('weightRecency')}
            />
            <NumberRow
              label="Weight: Trend"
              desc="Last-90-day rate vs. rate since creation — growing or decaying. n/a for formula fields."
              value={sm.weightTrend}
              onChange={set('weightTrend')}
            />
            <NumberRow
              label="Weight: Information content"
              desc="Distinct values. A field with one value carries no information."
              value={sm.weightInfo}
              onChange={set('weightInfo')}
            />
            <NumberRow
              label="Weight: System integration"
              desc="Count of references across flows, formulas, layouts, field updates and Apex."
              value={sm.weightIntegration}
              onChange={set('weightIntegration')}
            />
            <NumberRow
              label="Weight: Documentation"
              desc="Help text and description present. Undocumented fields are themselves tech debt."
              value={sm.weightDoc}
              onChange={set('weightDoc')}
            />
          </tbody>
        </table>
      </SectionCard>

      <SectionCard title="Thresholds">
        <table className="sm-table">
          <tbody>
            <NumberRow
              label="Population: full-credit %"
              desc="Population scoring is log-scaled to this value, so modest real usage still earns credit."
              value={sm.popFullCreditPct}
              onChange={set('popFullCreditPct')}
            />
            <NumberRow
              label="Recency: months to zero credit"
              desc="Months since last populated at which recency credit reaches zero."
              value={sm.recencyMonthsZero}
              onChange={set('recencyMonthsZero')}
            />
            <NumberRow
              label="Info: distinct values for full credit"
              desc="Distinct values needed for full information-content credit."
              value={sm.infoDistinctFull}
              onChange={set('infoDistinctFull')}
            />
            <NumberRow
              label="Integration: references for full credit"
              desc="Total references needed for full integration credit."
              value={sm.integrationRefsFull}
              onChange={set('integrationRefsFull')}
            />
            <NumberRow
              label="New-field grace period (days)"
              desc="Fields younger than this are banded Too New - Provisional and excluded from retire lists."
              value={sm.graceDays}
              onChange={set('graceDays')}
            />
            <NumberRow
              label="Trend window (days)"
              desc="A field younger than this cannot have a meaningful trend, so Trend scores n/a."
              value={sm.trendWindowDays}
              onChange={set('trendWindowDays')}
            />
            <NumberRow
              label="Min eligible records for evidence"
              desc="Below this many eligible records, the field is banded Insufficient Data regardless of age."
              value={sm.minEligible}
              onChange={set('minEligible')}
            />
            <NumberRow
              label="Dormancy threshold (months)"
              desc="Months with no population before a field is classed Dormant."
              value={sm.dormancyMonths}
              onChange={set('dormancyMonths')}
            />
          </tbody>
        </table>
      </SectionCard>

      <SectionCard title="Classification bands (score ≥)">
        <table className="sm-table">
          <tbody>
            <NumberRow label="Healthy" desc="Keep. Actively used and well integrated." value={sm.bandHealthy} onChange={set('bandHealthy')} />
            <NumberRow label="Monitor" desc="Fine for now; re-check next cycle." value={sm.bandMonitor} onChange={set('bandMonitor')} />
            <NumberRow
              label="Review"
              desc="Investigate: consolidate, fix adoption, or plan removal."
              value={sm.bandReview}
              onChange={set('bandReview')}
            />
            <NumberRow
              label="Likely Debt"
              desc="Strong removal candidate pending dependency check."
              value={sm.bandLikelyDebt}
              onChange={set('bandLikelyDebt')}
            />
            <NumberRow label="Retire" desc="Below Likely Debt: no measurable value." value={sm.bandRetire} onChange={set('bandRetire')} />
          </tbody>
        </table>
      </SectionCard>

      <SectionCard title="Classification thresholds">
        <table className="sm-table">
          <tbody>
            <NumberRow
              label="Active: since-creation population % at least"
              desc="Non-formula fields at or above this % populated since creation are classed Active; below it, Rarely Used."
              value={sm.activePct}
              onChange={set('activePct')}
              step={0.1}
            />
            <NumberRow
              label="Growing: last-90d multiple of since-creation rate"
              desc="A last-90-day rate at least this multiple of the since-creation rate classes the field Growing."
              value={sm.growingMultiple}
              onChange={set('growingMultiple')}
              step={0.1}
            />
          </tbody>
        </table>
      </SectionCard>

      <SaveBar dirty={scoringDirty} onSave={saveScoringModel} onReset={resetScoringModel} label="Scoring model has unsaved changes." />
    </div>
  );
}
