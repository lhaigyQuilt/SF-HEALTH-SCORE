import { useMemo, useState } from 'react';
import { useOrg } from '../state/OrgContext';
import { PageHeader, Pill, EmptyState } from '../components/ui';
import SaveBar from '../components/SaveBar';
import { retireCandidates } from '../lib/derive';

export default function AdditionalNotes() {
  const { org, scored, notes, setNote, notesDirty, saveNotes, resetNotes } = useOrg();
  const [search, setSearch] = useState('');
  const rows = useMemo(() => {
    let r = retireCandidates(scored);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter(f => f.apiName.toLowerCase().includes(q) || (f.label || '').toLowerCase().includes(q));
    }
    return r;
  }, [scored, search]);

  return (
    <div>
      <PageHeader
        title="Additional Notes"
        subtitle={`${org} — seeded with every retire candidate this analysis found. Add your own notes per field.`}
      />

      <div className="toolbar">
        <input className="search-input" placeholder="Search by API name or label…" value={search} onChange={e => setSearch(e.target.value)} />
        <span className="toolbar-count">{rows.length} fields</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState>No retire-candidate fields match.</EmptyState>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Data type</th>
              <th>Band</th>
              <th>Classification</th>
              <th>Action</th>
              <th style={{ width: 260 }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(f => (
              <tr key={f.apiName} style={{ cursor: 'default' }}>
                <td>
                  <div>{f.label}</div>
                  <div className="cell-mono">{f.apiName}</div>
                </td>
                <td className="cell-muted">{f.dataType}</td>
                <td>
                  <Pill>{f.band}</Pill>
                </td>
                <td className="cell-muted">{f.classification}</td>
                <td className="cell-muted">{f.action}</td>
                <td>
                  <input
                    className={`field-input${notes[f.apiName] ? ' is-edited' : ''}`}
                    placeholder="Add a note…"
                    value={notes[f.apiName] ?? ''}
                    onChange={e => setNote(f.apiName, e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <SaveBar dirty={notesDirty} onSave={saveNotes} onReset={resetNotes} label="Notes have unsaved changes." />
    </div>
  );
}
