import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { PendingApproval } from './pages/PendingApproval'
import { UserDashboard } from './pages/UserDashboard'
import { Settings } from './pages/Settings'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminUserDetail, AdminUserNew } from './pages/AdminUserDetail'
import './App.css'

function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <div className="center-page">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'admin') return <Navigate to="/admin" replace />
  if (user.status === 'pending') return <Navigate to="/pending" replace />
  return <Navigate to="/dashboard" replace />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute pendingOnly />}>
            <Route path="/pending" element={<PendingApproval />} />
          </Route>

          <Route element={<ProtectedRoute activeOnly />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute adminOnly />}>
            <Route element={<AppLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users/new" element={<AdminUserNew />} />
              <Route path="/admin/users/:id" element={<AdminUserDetail />} />
            </Route>
          </Route>

          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
