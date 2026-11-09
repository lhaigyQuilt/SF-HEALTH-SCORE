import { NavLink } from 'react-router-dom';
import Logo from './Logo';
import { useOrg } from '../state/OrgContext';
import { retireCandidates, verifyFormulaUsage, dataQualityFlags } from '../lib/derive';
import { useMemo } from 'react';

const USER_EMAIL = 'lisahaigy@gmail.com';

function NavItem({ to, label, count }) {
  return (
    <NavLink to={to} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
      <span>{label}</span>
      {count !== undefined && <span className="sidebar-link-count">{count}</span>}
    </NavLink>
  );
}

export default function Sidebar() {
  const { org, setOrg, objectKey, setObjectKey, object, objects, scored, base } = useOrg();

  const counts = useMemo(() => {
    if (!scored.length) return {};
    return {
      fieldHealth: scored.length,
      additionalNotes: base?.additionalNotes?.rows?.length ?? 0,
      retire: retireCandidates(scored).length,
      verify: verifyFormulaUsage(scored).length,
      dq: dataQualityFlags(scored).length,
      na: base?.notAssessable?.rows?.length ?? 0,
    };
  }, [scored, base]);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Logo />
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">Quilt Software</span>
          <span className="sidebar-brand-sub">Sales Ops</span>
        </div>
      </div>

      <div className="sidebar-org">
        <div className="sidebar-org-switch">
          {objects.map(o => (
            <button key={o.key} className={`sidebar-org-btn${objectKey === o.key ? ' active' : ''}`} onClick={() => setObjectKey(o.key)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-org">
        <div className="sidebar-org-switch">
          {['SBU', 'XBU'].map(o => (
            <button key={o} className={`sidebar-org-btn${org === o ? ' active' : ''}`} onClick={() => setOrg(o)}>
              {o}
            </button>
          ))}
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Overview</div>
        <NavItem to="/" label="Read Me" />
        <NavItem to="/scoring-model" label="Scoring Model" />

        <div className="sidebar-section-label">{object.label} fields</div>
        <NavItem to="/field-health" label="Field Health" count={counts.fieldHealth} />
        <NavItem to="/additional-notes" label="Additional Notes" count={counts.additionalNotes} />
        <NavItem to="/retire-candidates" label="Retire Candidates" count={counts.retire} />
        <NavItem to="/verify-formula-usage" label="Verify Formula Usage" count={counts.verify} />
        <NavItem to="/data-quality-flags" label="Data Quality Flags" count={counts.dq} />
        <NavItem to="/not-assessable" label="Not Assessable" count={counts.na} />
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-signed-in">Signed in as</div>
        <div className="sidebar-footer-email">{USER_EMAIL}</div>
        <button className="sidebar-signout" type="button">
          Sign out
        </button>
      </div>
    </aside>
  );
}
