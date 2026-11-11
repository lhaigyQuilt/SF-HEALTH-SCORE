export async function fetchSharedNotes(objectKey, org) {
  const r = await fetch(`/api/notes?object=${encodeURIComponent(objectKey)}&org=${encodeURIComponent(org)}`);
  if (!r.ok) return {};
  const data = await r.json().catch(() => ({}));
  return data.notes ?? {};
}

export async function saveSharedNotes(objectKey, org, email, notes) {
  const r = await fetch(`/api/notes?object=${encodeURIComponent(objectKey)}&org=${encodeURIComponent(org)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, notes }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Failed to save notes.');
  return data;
}

export async function checkAdminEmail(email) {
  const r = await fetch('/api/admin-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!r.ok) return false;
  const data = await r.json().catch(() => ({}));
  return !!data.ok;
}
