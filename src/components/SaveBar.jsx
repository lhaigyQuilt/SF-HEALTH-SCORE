export default function SaveBar({ dirty, onSave, onReset, saving, error, label = 'You have unsaved changes.' }) {
  if (!dirty && !error) return null;
  return (
    <div className={`save-bar${error ? ' save-bar--error' : ''}`}>
      <span>{error ? error : label}</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-plain" type="button" onClick={onReset} disabled={saving}>
          Discard
        </button>
        <button className="btn btn-primary" type="button" onClick={onSave} disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
