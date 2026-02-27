import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV_ITEMS = [
  { to: '/master', label: 'Visão Geral', icon: '🌐', exact: true },
  { to: '/master/empresas', label: 'Empresas', icon: '🏢' },
]

export function MasterLayout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 'var(--sidebar-width)',
          background: '#0d1b2a',
          borderRight: '1px solid #1a3a5c',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0, left: 0,
          height: '100vh',
          zIndex: 100,
        }}
      >
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #1a3a5c' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#e94560' }}>
            ✂️ BarberApp
          </div>
          <div style={{
            fontSize: '11px', marginTop: 4, padding: '2px 8px',
            background: '#e9456022', color: '#e94560',
            borderRadius: 10, display: 'inline-block', fontWeight: 700,
          }}>
            SUPER ADMIN
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
                color: isActive ? 'white' : '#8899aa',
                background: isActive ? '#e94560' : 'transparent',
                transition: 'all 0.2s',
                textDecoration: 'none',
              })}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div style={{ padding: '16px', borderTop: '1px solid #1a3a5c' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: 2, color: '#fff' }}>
            {usuario?.nome}
          </div>
          <div style={{ fontSize: '11px', color: '#8899aa', marginBottom: 10 }}>
            {usuario?.email}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleLogout}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
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
