import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadDataset } from '../lib/loadOrg';
import { fetchSharedNotes, saveSharedNotes, checkAdminEmail } from '../lib/notesApi';
import { scoreFields } from '../lib/scoring';
import { OBJECTS, OBJECT_BY_KEY } from '../lib/objects';

const OrgContext = createContext(null);

const ORG_STORAGE_KEY = 'ofh:org';
const OBJECT_STORAGE_KEY = 'ofh:object';
const FIELD_HEALTH_FILTERS_KEY = 'ofh:fieldHealthFilters';
const ADMIN_EMAIL_KEY = 'ofh:adminEmail';

function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore (private window / quota) */
  }
}

export function OrgProvider({ children }) {
  const [org, setOrgState] = useState(() => readLocal(ORG_STORAGE_KEY, 'SBU'));
  const [objectKey, setObjectKeyState] = useState(() => readLocal(OBJECT_STORAGE_KEY, OBJECTS[0].key));
  const [base, setBase] = useState(null); // { scoringModel, fields, additionalNotes, notAssessable, readMe } from file, as shipped
  const [notes, setNotes] = useState({}); // shared per-field notes, loaded from /api/notes
  const [savedNotes, setSavedNotes] = useState({});
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesError, setNotesError] = useState('');
  const [loading, setLoading] = useState(true);
  const [fieldHealthFilters, setFieldHealthFiltersState] = useState(() => readLocal(FIELD_HEALTH_FILTERS_KEY, {}));
  const [adminEmail, setAdminEmail] = useState(() => readLocal(ADMIN_EMAIL_KEY, null));

  const object = OBJECT_BY_KEY[objectKey] ?? OBJECTS[0];
  const effectiveOrg = object.orgs.includes(org) ? org : object.orgs[0];

  useEffect(() => {
    writeLocal(ORG_STORAGE_KEY, org);
  }, [org]);

  useEffect(() => {
    writeLocal(OBJECT_STORAGE_KEY, objectKey);
  }, [objectKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotesError('');
    Promise.all([loadDataset(objectKey, effectiveOrg), fetchSharedNotes(objectKey, effectiveOrg)]).then(([data, sharedNotes]) => {
      if (cancelled) return;
      setBase(data);
      setNotes(sharedNotes);
      setSavedNotes(sharedNotes);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [objectKey, effectiveOrg]);

  const scored = useMemo(() => {
    if (!base) return [];
    return scoreFields(base.fields, base.scoringModel);
  }, [base]);

  const setOrg = useCallback(next => setOrgState(next), []);
  const setObjectKey = useCallback(next => setObjectKeyState(next), []);

  const notesDirty = useMemo(() => JSON.stringify(savedNotes) !== JSON.stringify(notes), [savedNotes, notes]);

  const setNote = useCallback((apiName, text) => {
    setNotes(prev => ({ ...prev, [apiName]: text }));
  }, []);

  const saveNotes = useCallback(async () => {
    setNotesSaving(true);
    setNotesError('');
    try {
      await saveSharedNotes(objectKey, effectiveOrg, adminEmail, notes);
      setSavedNotes(notes);
    } catch (e) {
      setNotesError(e.message || 'Failed to save notes.');
    } finally {
      setNotesSaving(false);
    }
  }, [objectKey, effectiveOrg, adminEmail, notes]);

  const resetNotes = useCallback(() => {
    setNotes(savedNotes);
    setNotesError('');
  }, [savedNotes]);

  const loginAdmin = useCallback(async email => {
    const ok = await checkAdminEmail(email);
    if (ok) {
      const normalized = email.trim().toLowerCase();
      writeLocal(ADMIN_EMAIL_KEY, normalized);
      setAdminEmail(normalized);
    }
    return ok;
  }, []);

  const logoutAdmin = useCallback(() => {
    try {
      localStorage.removeItem(ADMIN_EMAIL_KEY);
    } catch {
      /* ignore */
    }
    setAdminEmail(null);
  }, []);

  const setFieldHealthFilters = useCallback(next => {
    setFieldHealthFiltersState(prev => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      writeLocal(FIELD_HEALTH_FILTERS_KEY, resolved);
      return resolved;
    });
  }, []);

  const value = {
    org: effectiveOrg,
    setOrg,
    objectKey,
    setObjectKey,
    object,
    objects: OBJECTS,
    loading,
    base,
    scoringModel: base?.scoringModel ?? null,
    notes,
    setNote,
    notesDirty,
    notesSaving,
    notesError,
    saveNotes,
    resetNotes,
    scored,
    fieldHealthFilters,
    setFieldHealthFilters,
    adminEmail,
    isAdminAuthenticated: !!adminEmail,
    loginAdmin,
    logoutAdmin,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within OrgProvider');
  return ctx;
}
