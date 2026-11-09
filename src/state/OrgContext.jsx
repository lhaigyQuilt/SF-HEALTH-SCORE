import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadOrgData } from '../lib/loadOrg';
import { scoreFields } from '../lib/scoring';

const OrgContext = createContext(null);

const ORG_STORAGE_KEY = 'ofh:org';
const SM_KEY = org => `ofh:${org}:scoringModel`;
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
  const [savedScoringModel, setSavedScoringModel] = useState(null); // last value written to localStorage
  const [scoringModel, setScoringModel] = useState(null); // live editable value
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
      const smOverride = readLocal(SM_KEY(org), null);
      const sm = smOverride ? { ...data.scoringModel, ...smOverride } : { ...data.scoringModel };
      setSavedScoringModel(sm);
      setScoringModel(sm);
      const n = readLocal(NOTES_KEY(org), {});
      setSavedNotes(n);
      setNotes(n);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [org]);

  const scoringDirty = useMemo(() => {
    if (!savedScoringModel || !scoringModel) return false;
    return JSON.stringify(savedScoringModel) !== JSON.stringify(scoringModel);
  }, [savedScoringModel, scoringModel]);

  const notesDirty = useMemo(() => JSON.stringify(savedNotes) !== JSON.stringify(notes), [savedNotes, notes]);

  const saveScoringModel = useCallback(() => {
    writeLocal(SM_KEY(org), scoringModel);
    setSavedScoringModel(scoringModel);
  }, [org, scoringModel]);

  const discardScoringModel = useCallback(() => {
    setScoringModel(savedScoringModel);
  }, [savedScoringModel]);

  const restoreScoringDefaults = useCallback(() => {
    if (!base) return;
    setScoringModel({ ...base.scoringModel });
  }, [base]);

  const updateScoringModel = useCallback(patch => {
    setScoringModel(prev => ({ ...prev, ...patch }));
  }, []);

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
    if (!base || !scoringModel) return [];
    return scoreFields(base.fields, scoringModel);
  }, [base, scoringModel]);

  const setOrg = useCallback(next => setOrgState(next), []);

  const value = {
    org,
    setOrg,
    loading,
    base,
    scoringModel,
    updateScoringModel,
    scoringDirty,
    saveScoringModel,
    resetScoringModel: discardScoringModel,
    restoreScoringDefaults,
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
