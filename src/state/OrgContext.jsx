import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadOrgData } from '../lib/loadOrg';
import { scoreFields } from '../lib/scoring';

const OrgContext = createContext(null);

const ORG_STORAGE_KEY = 'ofh:org';
const NOTES_KEY = org => `ofh:${org}:notes`;

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
  const [base, setBase] = useState(null); // { scoringModel, fields, notAssessable, readMe } from file, as shipped
  const [savedNotes, setSavedNotes] = useState({});
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    writeLocal(ORG_STORAGE_KEY, org);
  }, [org]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadOrgData(org).then(data => {
      if (cancelled) return;
      setBase(data);
      const n = readLocal(NOTES_KEY(org), {});
      setSavedNotes(n);
      setNotes(n);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [org]);

  const notesDirty = useMemo(() => JSON.stringify(savedNotes) !== JSON.stringify(notes), [savedNotes, notes]);

  const saveNotes = useCallback(() => {
    writeLocal(NOTES_KEY(org), notes);
    setSavedNotes(notes);
  }, [org, notes]);

  const discardNotes = useCallback(() => {
    setNotes(savedNotes);
  }, [savedNotes]);

  const setNote = useCallback((apiName, text) => {
    setNotes(prev => ({ ...prev, [apiName]: text }));
  }, []);

  const scored = useMemo(() => {
    if (!base) return [];
    return scoreFields(base.fields, base.scoringModel);
  }, [base]);

  const setOrg = useCallback(next => setOrgState(next), []);

  const value = {
    org,
    setOrg,
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
