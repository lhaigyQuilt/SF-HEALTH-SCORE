import { get, put } from '@vercel/blob';
import { isAdminEmail } from '../server/adminEmails.js';

function notesPath(object, org) {
  const safe = v => String(v).toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return `notes/${safe(object)}/${safe(org)}.json`;
}

async function readNotes(pathname) {
  const result = await get(pathname, { access: 'private' });
  if (!result || !result.stream) return {};
  const text = await new Response(result.stream).text();
  return JSON.parse(text);
}

export default async function handler(req, res) {
  const { object, org } = req.query;
  if (!object || !org) {
    res.status(400).json({ error: 'object and org query params are required' });
    return;
  }
  const pathname = notesPath(object, org);

  if (req.method === 'GET') {
    const notes = await readNotes(pathname);
    res.status(200).json({ notes });
    return;
  }

  if (req.method === 'POST') {
    const { email, notes } = req.body || {};
    if (!isAdminEmail(email)) {
      res.status(403).json({ error: 'Not authorized to edit notes.' });
      return;
    }
    if (typeof notes !== 'object' || notes === null || Array.isArray(notes)) {
      res.status(400).json({ error: 'notes must be an object of apiName -> text' });
      return;
    }
    await put(pathname, JSON.stringify(notes), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });
    res.status(200).json({ ok: true });
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'Method not allowed' });
}
