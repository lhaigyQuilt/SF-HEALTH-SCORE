import { FIELD_COLUMNS } from '../lib/columns';

export default function ExportColumnsModal({ open, selected, onToggle, onSelectAll, onSelectNone, onClose, onExport, rowCount }) {
  if (!open) return null;
  const count = selected.size;
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <button className="drawer-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h1 className="page-title" style={{ fontSize: 17, marginBottom: 4 }}>
          Export to Excel
        </h1>
        <p className="cell-muted" style={{ marginBottom: 14 }}>
          Choose which columns to include. Exports the {rowCount} field{rowCount === 1 ? '' : 's'} currently shown — after your search and filters.
        </p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <button className="btn-plain" type="button" onClick={onSelectAll}>
            Select all
          </button>
          <button className="btn-plain" type="button" onClick={onSelectNone}>
            Select none
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '52vh', overflowY: 'auto', paddingRight: 4 }}>
          {FIELD_COLUMNS.map(col => (
            <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={selected.has(col.key)} onChange={() => onToggle(col.key)} />
              {col.label}
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button className="btn-plain" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="button" onClick={onExport} disabled={count === 0}>
            Export {count} column{count === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </>
  );
}
