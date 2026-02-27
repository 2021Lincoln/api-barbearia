import { useEffect, useState } from 'react'
import { masterApi } from '../api/client'

interface PlatformStats {
  total_empresas: number
  empresas_ativas: number
  total_barbearias: number
  total_usuarios_clientes: number
  total_agendamentos: number
  receita_total_plataforma: number
}

function StatCard({ icon, label, value, color }: {
  icon: string; label: string; value: string | number; color?: string
}) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: `${color ?? 'var(--accent)'}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '24px', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: color ?? 'var(--text-primary)' }}>
          {value}
        </div>
      </div>
    </div>
  )
}

export function MasterDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    masterApi.getStats()
      .then((res) => setStats(res.data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Visão Geral da Plataforma</h1>
          <p className="page-subtitle">Estatísticas consolidadas de todas as empresas</p>
        </div>
      </div>

      {loading ? (
        <div className="loading">Carregando estatísticas...</div>
      ) : stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <StatCard icon="🏢" label="Total de Empresas"      value={stats.total_empresas}             color="var(--info)" />
          <StatCard icon="✅" label="Empresas Ativas"        value={stats.empresas_ativas}            color="var(--success)" />
          <StatCard icon="🏪" label="Barbearias"             value={stats.total_barbearias}           color="var(--accent)" />
          <StatCard icon="👤" label="Clientes Cadastrados"   value={stats.total_usuarios_clientes}    color="var(--warning)" />
          <StatCard icon="📅" label="Total de Agendamentos"  value={stats.total_agendamentos}         color="var(--info)" />
          <StatCard icon="💰" label="Receita Total"
            value={`R$ ${stats.receita_total_plataforma.toFixed(2)}`}
            color="var(--success)"
          />
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <p>Não foi possível carregar as estatísticas.</p>
        </div>
      )}
    </div>
  )
}
