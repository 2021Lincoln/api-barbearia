export function ActivityIndicator() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-primary)',
    }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '16px' }}>Carregando...</div>
    </div>
  )
}
