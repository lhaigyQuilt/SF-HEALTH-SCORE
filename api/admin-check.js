import { isAdminEmail } from '../server/adminEmails.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { email } = req.body || {};
  res.status(200).json({ ok: isAdminEmail(email) });
}
