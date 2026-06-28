import { type FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { login } from '../api/client'
import { useAuth } from '../context/AuthContext'

export function Login() {
  const { user, loginSuccess } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (user && (user.status === 'active' || user.role === 'admin')) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />
  }

  if (user?.status === 'pending') {
    return <Navigate to="/pending" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await login(email, password)
      loginSuccess(data.token, data.user)
      if (data.user.role === 'admin') {
        navigate('/admin')
      } else if (data.user.status === 'active') {
        navigate('/dashboard')
      } else {
        navigate('/pending')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Sign in</h1>
        <p className="subtitle">SocialPostAgent SaaS</p>

        {error && <div className="banner error">{error}</div>}

        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="auth-footer">
          No account? <Link to="/register">Create one</Link>
        </p>
      </form>
    </div>
  )
}
