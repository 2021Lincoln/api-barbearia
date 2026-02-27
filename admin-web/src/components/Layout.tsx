import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '📊', exact: true },
  { to: '/agendamentos', label: 'Agendamentos', icon: '📅' },
  { to: '/pagamentos', label: 'Pagamentos', icon: '💳' },
  { to: '/barbeiros', label: 'Barbeiros', icon: '💈' },
  { to: '/servicos', label: 'Serviços', icon: '✂️' },
  { to: '/barbearia', label: 'Barbearia', icon: '🏪' },
]

export function Layout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ─── Sidebar ─── */}
      <aside
        style={{
          width: 'var(--sidebar-width)',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          zIndex: 100,
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: '20px 16px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent)' }}>
            ✂️ BarberApp
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
            Painel Administrativo
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                marginBottom: '4px',
                fontSize: '14px',
                fontWeight: 500,
                color: isActive ? 'white' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent)' : 'transparent',
                transition: 'all 0.2s',
              })}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: 2 }}>
            {usuario?.nome}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 10 }}>
            {usuario?.email}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center' }}>
            Sair
          </button>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <main
        style={{
          marginLeft: 'var(--sidebar-width)',
          flex: 1,
          padding: '32px',
          minHeight: '100vh',
          background: 'var(--bg-primary)',
        }}
      >
        <Outlet />
      </main>
    </div>
  )
}
