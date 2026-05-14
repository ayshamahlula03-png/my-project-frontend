import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Login from './components/Login'
import PlannerDashboard from './components/PlannerDashboard'
import DesignerDashboard from './components/DesignerDashboard'
import AdminDashboard from './components/AdminDashboard'

function getRolePath(role) {
  if (role === 'admin') return '/admin'
  if (role === 'planner') return '/planner'
  if (role === 'designer') return '/designer'
  return '/'
}

// ✅ FIX: token + user rendu irundha mathum redirect — user null-a irundha Login show pannu
function PublicRoute({ children }) {
  const { user, token } = useAuth()
  if (token && user?.role) {
    return <Navigate to={getRolePath(user.role)} replace />
  }
  return children
}

function PrivateRoute({ children, allowedRoles }) {
  const { user, token } = useAuth()

  if (!token) return <Navigate to="/" replace />

  // ✅ FIX: user load aagala-na wait pannu (token irukku but user null — shouldn't happen now)
  if (!user) return <Navigate to="/" replace />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Wrong role — correct dashboard ku anuppu
    return <Navigate to={getRolePath(user.role)} replace />
  }

  return children
}

function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        flexDirection: 'column',
        gap: 12,
      }}>
        <div style={{ fontSize: 32 }}>📋</div>
        <p style={{ color: '#94a3b8', fontWeight: 500 }}>Loading...</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />

        <Route path="/planner" element={
          <PrivateRoute allowedRoles={['planner']}>
            <PlannerDashboard />
          </PrivateRoute>
        } />

        <Route path="/designer" element={
          <PrivateRoute allowedRoles={['designer']}>
            <DesignerDashboard />
          </PrivateRoute>
        } />

        <Route path="/admin" element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App