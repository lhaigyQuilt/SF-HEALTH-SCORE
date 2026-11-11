import { Navigate } from 'react-router-dom';
import { useOrg } from '../state/OrgContext';

export default function RequireAdmin({ children }) {
  const { isAdminAuthenticated } = useOrg();
  if (!isAdminAuthenticated) return <Navigate to="/admin/login" replace />;
  return children;
}
