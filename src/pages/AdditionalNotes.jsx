import { useMemo, useState } from 'react';
import { useOrg } from '../state/OrgContext';
import { PageHeader, EmptyState } from '../components/ui';
import SaveBar from '../components/SaveBar';
import { dash } from '../lib/format';

export default function AdditionalNotes() {
  const { org, object, base, notes, setNote, notesDirty, saveNotes, resetNotes } = useOrg();
  const [search, setSearch] = useState('');

  const additionalNotes = base?.additionalNotes ?? { columns: [], rows: [] };
  const apiCol = additionalNotes.columns[0];

  const rows = useMemo(() => {
    let r = additionalNotes.rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter(row => Object.values(row).some(v => (v ?? '').toString().toLowerCase().includes(q)));
    }
    return r;
  }, [additionalNotes.rows, search]);

  return (
    <div>
      <PageHeader
        title="Additional Notes"
        subtitle={`${object.label} — ${org}. Hand-written per-field decisions from this analysis, plus your own notes.`}
      />

      <div className="toolbar">
        <input className="search-input" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
        <span className="toolbar-count">{rows.length} fields</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState>No additional notes for this object/org.</EmptyState>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              {additionalNotes.columns.map(c => (
                <th key={c}>{c}</th>
              ))}
              <th style={{ width: 240 }}>My Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const apiName = row[apiCol];
              return (
                <tr key={apiName ?? i} style={{ cursor: 'default' }}>
                  {additionalNotes.columns.map(c => (
                    <td key={c} className={c === apiCol ? 'cell-mono' : 'cell-muted'}>
                      {dash(row[c])}
                    </td>
                  ))}
                  <td>
                    <input
                      className={`field-input${notes[apiName] ? ' is-edited' : ''}`}
                      placeholder="Add a note…"
                      value={notes[apiName] ?? ''}
                      onChange={e => setNote(apiName, e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <SaveBar dirty={notesDirty} onSave={saveNotes} onReset={resetNotes} label="Notes have unsaved changes." />
    </div>
  );
}
