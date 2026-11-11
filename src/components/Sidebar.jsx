import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { useOrg } from '../state/OrgContext';
import { retireCandidates, verifyFormulaUsage, dataQualityFlags } from '../lib/derive';
import { useMemo } from 'react';

const USER_EMAIL = 'lisahaigy@gmail.com';

function NavItem({ to, label, count }) {
  return (
    <NavLink to={to} end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
      <span>{label}</span>
      {count !== undefined && <span className="sidebar-link-count">{count}</span>}
    </NavLink>
  );
}

export default function Sidebar() {
  const { org, setOrg, objectKey, setObjectKey, object, objects, scored, base, isAdminAuthenticated, adminEmail, logoutAdmin } = useOrg();
  const location = useLocation();
  const navigate = useNavigate();
  const inAdminSection = location.pathname.startsWith('/admin');
  const basePath = inAdminSection ? '/admin' : '';

  function signOutAdmin() {
    logoutAdmin();
    navigate('/');
  }

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
        <div className="sidebar-switch-label">Org</div>
        <div className="sidebar-org-switch">
          {object.orgs.map(o => (
            <button key={o} className={`sidebar-org-btn${org === o ? ' active' : ''}`} onClick={() => setOrg(o)}>
              {o}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-org">
        <div className="sidebar-switch-label">Object</div>
        <div className="sidebar-org-switch sidebar-org-switch--wrap">
          {objects.map(o => (
            <button key={o.key} className={`sidebar-org-btn${objectKey === o.key ? ' active' : ''}`} onClick={() => setObjectKey(o.key)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {inAdminSection && <div className="admin-banner">Admin mode — editing is live for everyone</div>}

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Overview</div>
        <NavItem to={basePath || '/'} label="Read Me" />
        <NavItem to={`${basePath}/scoring-model`} label="Scoring Model" />

        <div className="sidebar-section-label">{object.label} fields</div>
        <NavItem to={`${basePath}/field-health`} label="Field Health" count={counts.fieldHealth} />
        <NavItem to={`${basePath}/additional-notes`} label="Additional Notes" count={counts.additionalNotes} />
        <NavItem to={`${basePath}/retire-candidates`} label="Retire Candidates" count={counts.retire} />
        <NavItem to={`${basePath}/verify-formula-usage`} label="Verify Formula Usage" count={counts.verify} />
        <NavItem to={`${basePath}/data-quality-flags`} label="Data Quality Flags" count={counts.dq} />
        <NavItem to={`${basePath}/not-assessable`} label="Not Assessable" count={counts.na} />
      </nav>

      <div className="sidebar-footer">
        {inAdminSection ? (
          <>
            <div className="sidebar-footer-signed-in">Editing as admin</div>
            <div className="sidebar-footer-email">{adminEmail}</div>
            <button className="sidebar-signout" type="button" onClick={signOutAdmin}>
              Exit admin
            </button>
          </>
        ) : (
          <>
            <div className="sidebar-footer-signed-in">Signed in as</div>
            <div className="sidebar-footer-email">{USER_EMAIL}</div>
            <NavLink className="sidebar-signout" to={isAdminAuthenticated ? '/admin' : '/admin/login'}>
              Admin
            </NavLink>
          </>
        )}
      </div>
    </aside>
  );
}
