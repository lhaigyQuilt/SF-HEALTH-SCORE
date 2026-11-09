import { useMemo, useState } from 'react';
import { FIELD_COLUMNS, COLUMN_BY_KEY, OPERATORS_BY_TYPE, defaultOperator, distinctValuesFor } from '../lib/columns';

function ValueInput({ col, op, value, onChange, rows }) {
  if (op === 'is' && col.type === 'yesno') {
    return (
      <select className="field-select" value={value} onChange={e => onChange(e.target.value)}>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>
    );
  }
  if (col.type === 'select') {
    const options = distinctValuesFor(rows, col.key);
    return (
      <select className="field-select" value={value} onChange={e => onChange(e.target.value)}>
        <option value="" disabled>
          choose…
        </option>
        {options.map(o => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  if (col.type === 'number') {
    return <input className="field-input" type="number" value={value} onChange={e => onChange(e.target.value)} style={{ width: 100 }} />;
  }
  return <input className="field-input" type="text" value={value} onChange={e => onChange(e.target.value)} style={{ width: 160 }} />;
}

export default function FilterBuilder({ rows, filtersByKey, onAdd, onRemove, onClearAll }) {
  const [open, setOpen] = useState(false);
  const [draftKey, setDraftKey] = useState(FIELD_COLUMNS[0].key);
  const draftCol = COLUMN_BY_KEY[draftKey];
  const [draftOp, setDraftOp] = useState(defaultOperator(draftCol.type));
  const [draftValue, setDraftValue] = useState('');

  const activeChips = useMemo(
    () =>
      Object.entries(filtersByKey).map(([key, f]) => {
        const col = COLUMN_BY_KEY[key];
        const opLabel = OPERATORS_BY_TYPE[col.type].find(o => o.value === f.op)?.label ?? f.op;
        return { key, text: `${col.label} ${opLabel} ${f.value}` };
      }),
    [filtersByKey]
  );

  function startDraft() {
    const col = FIELD_COLUMNS[0];
    setDraftKey(col.key);
    setDraftOp(defaultOperator(col.type));
    setDraftValue(col.type === 'yesno' ? 'Yes' : '');
    setOpen(true);
  }

  function changeColumn(key) {
    const col = COLUMN_BY_KEY[key];
    setDraftKey(key);
    setDraftOp(defaultOperator(col.type));
    setDraftValue(col.type === 'yesno' ? 'Yes' : '');
  }

  function commit() {
    if (draftValue === '' && draftCol.type !== 'yesno') return;
    onAdd(draftKey, draftOp, draftValue);
    setOpen(false);
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div className="chip-row" style={{ marginBottom: open ? 8 : activeChips.length ? 8 : 0 }}>
        {activeChips.map(c => (
          <span className="chip active" key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'default' }}>
            {c.text}
            <button
              type="button"
              onClick={() => onRemove(c.key)}
              aria-label="Remove filter"
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}
            >
              ×
            </button>
          </span>
        ))}
        {activeChips.length > 0 && (
          <button className="btn-plain" type="button" onClick={onClearAll}>
            Clear all
          </button>
        )}
        {!open && (
          <button className="chip" type="button" onClick={startDraft}>
            + Add filter
          </button>
        )}
      </div>

      {open && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select className="field-select" value={draftKey} onChange={e => changeColumn(e.target.value)}>
            {FIELD_COLUMNS.map(c => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <select className="field-select" value={draftOp} onChange={e => setDraftOp(e.target.value)}>
            {OPERATORS_BY_TYPE[draftCol.type].map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ValueInput col={draftCol} op={draftOp} value={draftValue} onChange={setDraftValue} rows={rows} />
          <button className="btn btn-primary" type="button" onClick={commit}>
            Add
          </button>
          <button className="btn-plain" type="button" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
