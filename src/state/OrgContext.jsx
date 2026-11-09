import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadDataset } from '../lib/loadOrg';
import { scoreFields } from '../lib/scoring';
import { OBJECTS, OBJECT_BY_KEY } from '../lib/objects';

const OrgContext = createContext(null);

const ORG_STORAGE_KEY = 'ofh:org';
const OBJECT_STORAGE_KEY = 'ofh:object';
const NOTES_KEY = (objectKey, org) => `ofh:${objectKey}:${org}:notes`;

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
  const [savedNotes, setSavedNotes] = useState({});
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);

  const object = OBJECT_BY_KEY[objectKey] ?? OBJECTS[0];

  useEffect(() => {
    writeLocal(ORG_STORAGE_KEY, org);
  }, [org]);

  useEffect(() => {
    writeLocal(OBJECT_STORAGE_KEY, objectKey);
  }, [objectKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadDataset(objectKey, org).then(data => {
      if (cancelled) return;
      setBase(data);
      const n = readLocal(NOTES_KEY(objectKey, org), {});
      setSavedNotes(n);
      setNotes(n);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [objectKey, org]);

  const notesDirty = useMemo(() => JSON.stringify(savedNotes) !== JSON.stringify(notes), [savedNotes, notes]);

  const saveNotes = useCallback(() => {
    writeLocal(NOTES_KEY(objectKey, org), notes);
    setSavedNotes(notes);
  }, [objectKey, org, notes]);

  const discardNotes = useCallback(() => {
    setNotes(savedNotes);
  }, [savedNotes]);

  const setNote = useCallback((apiName, text) => {
    setNotes(prev => ({ ...prev, [apiName]: text }));
  }, []);

  const scored = useMemo(() => {
    if (!base) return [];
    return scoreFields(base.fields, base.scoringModel, { hasManagedPackageBand: object.hasManagedPackageBand });
  }, [base, object.hasManagedPackageBand]);

  const setOrg = useCallback(next => setOrgState(next), []);
  const setObjectKey = useCallback(next => setObjectKeyState(next), []);

  const value = {
    org,
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
    saveNotes,
    resetNotes: discardNotes,
    scored,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within OrgProvider');
  return ctx;
}
