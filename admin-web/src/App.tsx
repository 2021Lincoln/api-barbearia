import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { Layout } from './components/Layout'
import { MasterLayout } from './components/MasterLayout'
import { LoginPage } from './pages/LoginPage'
import { RegistroPage } from './pages/RegistroPage'
import { DashboardPage } from './pages/DashboardPage'
import { AgendamentosPage } from './pages/AgendamentosPage'
import { BarbeirosPage } from './pages/BarbeirosPage'
import { ServicosPage } from './pages/ServicosPage'
import { BarbeariaPage } from './pages/BarbeariaPage'
import { PagamentosPage } from './pages/PagamentosPage'
import { MasterDashboardPage } from './pages/MasterDashboardPage'
import { MasterEmpresasPage } from './pages/MasterEmpresasPage'
import { ReactNode } from 'react'
import { ActivityIndicator } from './components/ActivityIndicator'

// Redireciona para login se não autenticado;
// se autenticado como super_admin tenta acessar rota de admin → redireciona para /master e vice-versa
function PrivateRoute({ children, require }: { children: ReactNode; require: 'admin' | 'super_admin' }) {
  const { usuario, userType, loading } = useAuth()

  if (loading) return <ActivityIndicator />
  if (!usuario) return <Navigate to="/login" replace />
  if (require === 'admin' && userType === 'super_admin') return <Navigate to="/master" replace />
  if (require === 'super_admin' && userType === 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegistroPage />} />

            {/* Painel do Admin (dono de barbearia) */}
            <Route
              path="/"
              element={
                <PrivateRoute require="admin">
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="agendamentos" element={<AgendamentosPage />} />
              <Route path="pagamentos" element={<PagamentosPage />} />
              <Route path="barbeiros" element={<BarbeirosPage />} />
              <Route path="servicos" element={<ServicosPage />} />
              <Route path="barbearia" element={<BarbeariaPage />} />
            </Route>

            {/* Painel do Super Admin (dono da plataforma) */}
            <Route
              path="/master"
              element={
                <PrivateRoute require="super_admin">
                  <MasterLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<MasterDashboardPage />} />
              <Route path="empresas" element={<MasterEmpresasPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
