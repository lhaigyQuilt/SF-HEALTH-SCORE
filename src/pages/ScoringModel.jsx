import { useOrg } from '../state/OrgContext';
import { PageHeader, SectionCard } from '../components/ui';

function ValueRow({ label, desc, value }) {
  return (
    <tr>
      <td className="sm-label">{label}</td>
      <td className="sm-input">
        <span className="sm-value">{value}</span>
      </td>
      <td className="sm-desc">{desc}</td>
    </tr>
  );
}

export default function ScoringModelPage() {
  const { org, object, scoringModel } = useOrg();
  if (!scoringModel) return null;
  const sm = scoringModel;

  const weightTotal =
    Number(sm.weightPopulation || 0) +
    Number(sm.weightRecency || 0) +
    Number(sm.weightTrend || 0) +
    Number(sm.weightInfo || 0) +
    Number(sm.weightIntegration || 0) +
    Number(sm.weightDoc || 0);

  return (
    <div>
      <PageHeader
        title="Scoring Model"
        subtitle={`Reference inputs — ${object.label} — ${org}. These weights and thresholds drive every score on Field Health and are fixed for this analysis.`}
      />

      <SectionCard title="Component weights" count={`total ${weightTotal}`}>
        <table className="sm-table">
          <tbody>
            <ValueRow
              label="Weight: Population"
              desc="Share of eligible records carrying a value (% TRUE for checkboxes). n/a for formula fields."
              value={sm.weightPopulation}
            />
            <ValueRow
              label="Weight: Recency"
              desc="Whether the field is still being populated on new opportunities. n/a for formula fields."
              value={sm.weightRecency}
            />
            <ValueRow
              label="Weight: Trend"
              desc="Last-90-day rate vs. rate since creation — growing or decaying. n/a for formula fields."
              value={sm.weightTrend}
            />
            <ValueRow
              label="Weight: Information content"
              desc="Distinct values. A field with one value carries no information."
              value={sm.weightInfo}
            />
            <ValueRow
              label="Weight: System integration"
              desc="Count of references across flows, formulas, layouts, field updates and Apex."
              value={sm.weightIntegration}
            />
            <ValueRow
              label="Weight: Documentation"
              desc="Help text and description present. Undocumented fields are themselves tech debt."
              value={sm.weightDoc}
            />
          </tbody>
        </table>
      </SectionCard>

      <SectionCard title="Thresholds">
        <table className="sm-table">
          <tbody>
            <ValueRow
              label="Population: full-credit %"
              desc="Population scoring is log-scaled to this value, so modest real usage still earns credit."
              value={sm.popFullCreditPct}
            />
            <ValueRow
              label="Recency: months to zero credit"
              desc="Months since last populated at which recency credit reaches zero."
              value={sm.recencyMonthsZero}
            />
            <ValueRow
              label="Info: distinct values for full credit"
              desc="Distinct values needed for full information-content credit."
              value={sm.infoDistinctFull}
            />
            <ValueRow
              label="Integration: references for full credit"
              desc="Total references needed for full integration credit."
              value={sm.integrationRefsFull}
            />
            <ValueRow
              label="New-field grace period (days)"
              desc="Fields younger than this are banded Too New - Provisional and excluded from retire lists."
              value={sm.graceDays}
            />
            <ValueRow
              label="Trend window (days)"
              desc="A field younger than this cannot have a meaningful trend, so Trend scores n/a."
              value={sm.trendWindowDays}
            />
            <ValueRow
              label="Min eligible records for evidence"
              desc="Below this many eligible records, the field is banded Insufficient Data regardless of age."
              value={sm.minEligible}
            />
            <ValueRow
              label="Dormancy threshold (months)"
              desc="Months with no population before a field is classed Dormant."
              value={sm.dormancyMonths}
            />
          </tbody>
        </table>
      </SectionCard>

      <SectionCard title="Classification bands (score ≥)">
        <table className="sm-table">
          <tbody>
            <ValueRow label="Healthy" desc="Keep. Actively used and well integrated." value={sm.bandHealthy} />
            <ValueRow label="Monitor" desc="Fine for now; re-check next cycle." value={sm.bandMonitor} />
            <ValueRow label="Review" desc="Investigate: consolidate, fix adoption, or plan removal." value={sm.bandReview} />
            <ValueRow label="Likely Debt" desc="Strong removal candidate pending dependency check." value={sm.bandLikelyDebt} />
            <ValueRow label="Retire" desc="Below Likely Debt: no measurable value." value={sm.bandRetire} />
          </tbody>
        </table>
      </SectionCard>

      <SectionCard title="Classification thresholds">
        <table className="sm-table">
          <tbody>
            <ValueRow
              label="Active: since-creation population % at least"
              desc="Non-formula fields at or above this % populated since creation are classed Active; below it, Rarely Used."
              value={sm.activePct}
            />
            <ValueRow
              label="Growing: last-90d multiple of since-creation rate"
              desc="A last-90-day rate at least this multiple of the since-creation rate classes the field Growing."
              value={sm.growingMultiple}
            />
          </tbody>
        </table>
      </SectionCard>

      <SectionCard title="Analysis as-of date">
        <table className="sm-table">
          <tbody>
            <ValueRow
              label="As-of date"
              desc="The date the record measures were taken. Effective Age on Field Health is computed from this date."
              value={new Date(sm.asOfDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            />
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
