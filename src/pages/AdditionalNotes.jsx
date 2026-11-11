import { useMemo, useState } from 'react';
import { useOrg } from '../state/OrgContext';
import { PageHeader, EmptyState } from '../components/ui';
import SaveBar from '../components/SaveBar';
import { dash } from '../lib/format';

export default function AdditionalNotes({ editable = false }) {
  const { org, object, base, scored, notes, setNote, notesDirty, notesSaving, notesError, saveNotes, resetNotes } = useOrg();
  const [search, setSearch] = useState('');

  const additionalNotes = base?.additionalNotes ?? { columns: [], rows: [] };
  const apiCol = additionalNotes.columns.includes('API Name') ? 'API Name' : additionalNotes.columns[0];

  // Band / Classification / Action come from the live scoring, so they always agree with Field
  // Health. Rows for fields no longer assessed (e.g. deleted from the org) keep their saved text.
  const rows = useMemo(() => {
    const byApi = Object.fromEntries(scored.map(f => [f.apiName, f]));
    let r = additionalNotes.rows.map(row => {
      const f = byApi[row[apiCol]];
      if (!f) return row;
      const live = { ...row };
      if ('Band' in row) live.Band = f.band;
      if ('Classification' in row) live.Classification = f.classification;
      if ('Action' in row) live.Action = f.action;
      return live;
    });
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter(row => Object.values(row).some(v => (v ?? '').toString().toLowerCase().includes(q)));
    }
    return r;
  }, [additionalNotes.rows, apiCol, scored, search]);

  return (
    <div>
      <PageHeader
        title="Additional Notes"
        subtitle={
          editable
            ? `${object.label} — ${org}. Hand-written per-field decisions from this analysis, plus shared notes everyone sees.`
            : `${object.label} — ${org}. Hand-written per-field decisions from this analysis. Read-only — filter or search to find a field.`
        }
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
                  {editable ? (
                    <td>
                      <input
                        className={`field-input${notes[apiName] ? ' is-edited' : ''}`}
                        placeholder="Add a note…"
                        value={notes[apiName] ?? ''}
                        onChange={e => setNote(apiName, e.target.value)}
                      />
                    </td>
                  ) : (
                    <td className="cell-muted">{dash(notes[apiName])}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {editable && (
        <SaveBar
          dirty={notesDirty}
          saving={notesSaving}
          error={notesError}
          onSave={saveNotes}
          onReset={resetNotes}
          label="Notes have unsaved changes."
        />
      )}
    </div>
  );
}
