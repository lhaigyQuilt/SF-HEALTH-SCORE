export default function SaveBar({ dirty, onSave, onReset, label = 'You have unsaved changes.' }) {
  if (!dirty) return null;
  return (
    <div className="save-bar">
      <span>{label}</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-plain" type="button" onClick={onReset}>
          Discard
        </button>
        <button className="btn btn-primary" type="button" onClick={onSave}>
          Save
        </button>
      </div>
    </div>
  );
}
