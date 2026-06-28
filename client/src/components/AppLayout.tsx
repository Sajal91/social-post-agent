import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>SocialPostAgent</h1>
          <p className="subtitle">Multi-tenant content automation</p>
        </div>
        <div className="header-actions">
          <span className="user-badge">
            {user?.name} ({user?.role})
          </span>
          {user?.role === 'admin' ? (
            <>
              <Link to="/admin">Admin</Link>
              <Link to="/dashboard">Runs</Link>
            </>
          ) : (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/settings">Settings</Link>
            </>
          )}
          <button type="button" className="btn-link" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <Outlet />
    </div>
  )
}
