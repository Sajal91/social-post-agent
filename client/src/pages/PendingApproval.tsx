import { useAuth } from '../context/AuthContext'

export function PendingApproval() {
  const { user, logout } = useAuth()

  return (
    <div className="center-page">
      <h2>Pending admin approval</h2>
      <p>
        Hi {user?.name}, your account is registered. An administrator must approve it and
        configure your API credentials before you can use WhatsApp workflows.
      </p>
      <button type="button" onClick={logout}>
        Sign out
      </button>
    </div>
  )
}
