import { BAND_STATUS } from '../lib/derive';

export function Pill({ children, status }) {
  const color = status || BAND_STATUS[children] || 'gray';
  return <span className={`pill pill-${color}`}>{children}</span>;
}

export function Tag({ children }) {
  return <span className="tag">{children}</span>;
}

export function StatTile({ number, label }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-number">{number}</div>
      <div className="stat-tile-label">{label}</div>
    </div>
  );
}

export function FilterChip({ active, onClick, children, plum }) {
  return (
    <button type="button" className={`chip${active ? ` active${plum ? ' plum' : ''}` : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

export function SectionCard({ title, count, children }) {
  return (
    <div className="section-card">
      <div className="section-card-header">
        <h2 className="section-title">{title}</h2>
        {count !== undefined && <span className="section-card-count">{count}</span>}
      </div>
      <div className="section-card-body">{children}</div>
    </div>
  );
}

export function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ children }) {
  return <div className="empty-state">{children}</div>;
}

export function PageHeader({ title, subtitle }) {
  return (
    <>
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </>
  );
}
