import { Routes, Route, Link } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import StockDetail from './pages/StockDetail'

function TopBar() {
  const { session, signOut } = useAuth()

  return (
    <div className="top-bar">
      <Link to="/" className="brand">
        <span className="brand-eyebrow">Personal Portfolio</span>
        Ledger
      </Link>
      {session && (
        <button className="sign-out-btn" onClick={signOut}>
          Sign out
        </button>
      )}
    </div>
  )
}

export default function App() {
  return (
    <div className="app-shell">
      <TopBar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock/:id"
          element={
            <ProtectedRoute>
              <StockDetail />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  )
}
