import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth()

  if (loading) {
    return <div className="loading">Carregando...</div>
  }

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
