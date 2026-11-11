// Allow-list of emails permitted to edit shared notes via /api/notes.
// This is a client-stated email check, not real authentication — anyone who
// knows a listed address can claim it. Acceptable for this internal tool.
const ADMIN_EMAILS = new Set(['lhaigy@quiltsoftware.com', 'mwike@quiltsoftware.com']);

export function isAdminEmail(email) {
  return typeof email === 'string' && ADMIN_EMAILS.has(email.trim().toLowerCase());
}
