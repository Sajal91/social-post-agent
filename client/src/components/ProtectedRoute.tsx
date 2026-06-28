import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({
  adminOnly = false,
  activeOnly = false,
  pendingOnly = false,
}: {
  adminOnly?: boolean
  activeOnly?: boolean
  pendingOnly?: boolean
}) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="center-page">Loading…</div>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (pendingOnly) {
    if (user.role === 'admin' || user.status !== 'pending') {
      return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />
    }
    return <Outlet />
  }

  if (user.role !== 'admin' && user.status === 'pending') {
    return <Navigate to="/pending" replace />
  }

  if (user.role !== 'admin' && user.status === 'rejected') {
    return (
      <div className="center-page">
        <h2>Account rejected</h2>
        <p>Contact your administrator for access.</p>
      </div>
    )
  }

  if (activeOnly && user.role !== 'admin' && user.status !== 'active') {
    return <Navigate to="/pending" replace />
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
