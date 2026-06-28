import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminStats, fetchAdminUsers, type AdminUserListItem } from '../api/client'
import { StatusBadge } from '../components/StatusBadge'

export function AdminDashboard() {
  const [users, setUsers] = useState<AdminUserListItem[]>([])
  const [stats, setStats] = useState<{
    totalUsers: number
    pendingUsers: number
    activeUsers: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [userList, overview] = await Promise.all([fetchAdminUsers(), fetchAdminStats()])
        setUsers(userList)
        setStats(overview)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load admin data')
      }
    }
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <main className="admin-page">
      <div className="page-header">
        <h2>Admin overview</h2>
        <Link to="/admin/users/new" className="btn-primary">
          Add user
        </Link>
      </div>

      {error && <div className="banner error">{error}</div>}

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <span>Total users</span>
            <strong>{stats.totalUsers}</strong>
          </div>
          <div className="stat-card">
            <span>Active</span>
            <strong>{stats.activeUsers}</strong>
          </div>
          <div className="stat-card">
            <span>Pending approval</span>
            <strong>{stats.pendingUsers}</strong>
          </div>
        </div>
      )}

      <section className="panel">
        <h3>Users</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <StatusBadge status={user.status as 'active' | 'pending' | 'failed'} />
                </td>
                <td>
                  <Link to={`/admin/users/${user.id}`}>Manage</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}
