import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '../state/OrgContext';
import { PageHeader } from '../components/ui';

export default function AdminLogin() {
  const { loginAdmin } = useOrg();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setChecking(true);
    try {
      const ok = await loginAdmin(email);
      if (ok) navigate('/admin', { replace: true });
      else setError('That email is not on the admin list.');
    } catch {
      setError('Could not verify admin access. Try again.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto 0' }}>
      <PageHeader title="Admin Sign-In" subtitle="Enter your Quilt Software email to edit shared notes." />
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        <input
          className="field-input"
          type="email"
          required
          autoFocus
          placeholder="you@quiltsoftware.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={checking}>
          {checking ? 'Checking…' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
