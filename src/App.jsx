import { Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import RequireAdmin from './components/RequireAdmin';
import { useOrg } from './state/OrgContext';
import ReadMe from './pages/ReadMe';
import ScoringModelPage from './pages/ScoringModel';
import FieldHealth from './pages/FieldHealth';
import AdditionalNotes from './pages/AdditionalNotes';
import RetireCandidates from './pages/RetireCandidates';
import VerifyFormulaUsage from './pages/VerifyFormulaUsage';
import DataQualityFlags from './pages/DataQualityFlags';
import NotAssessable from './pages/NotAssessable';
import AdminLogin from './pages/AdminLogin';

// Same page set, mounted twice: read-only at "/" and, when edits are allowed, under "/admin".
function ObjectRoutes({ editable = false }) {
  return (
    <Routes>
      <Route index element={<ReadMe />} />
      <Route path="scoring-model" element={<ScoringModelPage />} />
      <Route path="field-health" element={<FieldHealth />} />
      <Route path="additional-notes" element={<AdditionalNotes editable={editable} />} />
      <Route path="retire-candidates" element={<RetireCandidates />} />
      <Route path="verify-formula-usage" element={<VerifyFormulaUsage />} />
      <Route path="data-quality-flags" element={<DataQualityFlags />} />
      <Route path="not-assessable" element={<NotAssessable />} />
    </Routes>
  );
}

export default function App() {
  const { loading } = useOrg();

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        {loading ? (
          <p className="cell-muted">Loading…</p>
        ) : (
          <Routes>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin/*"
              element={
                <RequireAdmin>
                  <ObjectRoutes editable />
                </RequireAdmin>
              }
            />
            <Route path="/*" element={<ObjectRoutes />} />
          </Routes>
        )}
      </main>
    </div>
  );
}
