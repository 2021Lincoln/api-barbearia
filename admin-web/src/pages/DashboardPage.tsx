import { useEffect, useState } from 'react'
import { adminApi } from '../api/client'
import { DashboardStats } from '../types'

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color?: string }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: `${color ?? 'var(--accent)'}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          flexShrink: 0,
        }}
      >
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

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.dashboard()
      .then((res) => setStats(res.data))
      .finally(() => setLoading(false))
  }, [])

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>{today}</p>
        </div>
      </div>

      {loading ? (
        <div className="loading">Carregando estatísticas...</div>
      ) : stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <StatCard
            icon="📅"
            label="Agendamentos Hoje"
            value={stats.agendamentos_hoje}
            color="var(--info)"
          />
          <StatCard
            icon="⏳"
            label="Pendentes"
            value={stats.agendamentos_pendentes}
            color="var(--warning)"
          />
          <StatCard
            icon="💰"
            label="Receita Hoje"
            value={`R$ ${stats.receita_hoje.toFixed(2)}`}
            color="var(--success)"
          />
          <StatCard
            icon="📈"
            label="Receita do Mês"
            value={`R$ ${stats.receita_mes.toFixed(2)}`}
            color="var(--success)"
          />
          <StatCard
            icon="📊"
            label="Agendamentos Semana"
            value={stats.agendamentos_semana}
            color="var(--info)"
          />
          <StatCard
            icon="💹"
            label="Receita da Semana"
            value={`R$ ${stats.receita_semana.toFixed(2)}`}
            color="var(--success)"
          />
          <StatCard
            icon="💈"
            label="Barbeiros Ativos"
            value={stats.barbeiros_ativos}
            color="var(--accent)"
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
