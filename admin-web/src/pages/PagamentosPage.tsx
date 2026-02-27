import { useEffect, useState } from 'react'
import { adminApi } from '../api/client'
import { Pagamento, Agendamento } from '../types'

interface PagamentoDetalhado extends Pagamento {
  agendamento?: Agendamento & {
    cliente?: { nome: string; email: string }
    servico?: { nome: string; preco: number }
    barbeiro?: { nome: string }
  }
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pago:              { label: 'Pago',             color: 'var(--success)' },
  estornado_parcial: { label: 'Estorno parcial',  color: 'var(--warning)' },
  estornado:         { label: 'Estornado',         color: 'var(--danger)'  },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status] ?? { label: status, color: 'var(--text-muted)' }
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: '12px', fontWeight: 600,
      background: `${cfg.color}22`, color: cfg.color, border: `1px solid ${cfg.color}44`,
    }}>
      {cfg.label}
    </span>
  )
}

function DescricaoBadge({ descricao }: { descricao?: string | null }) {
  const taxa = descricao?.toLowerCase().includes('taxa')
  if (!descricao) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 12,
      fontSize: '11px', fontWeight: 600,
      background: taxa ? 'var(--warning)22' : 'var(--info)22',
      color: taxa ? 'var(--warning)' : 'var(--info)',
    }}>
      {taxa ? 'Taxa' : 'Pagamento'}
    </span>
  )
}

export function PagamentosPage() {
  const [pagamentos, setPagamentos] = useState<PagamentoDetalhado[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFiltro, setStatusFiltro] = useState('todos')

  async function load() {
    setLoading(true)
    try {
      const params: { status?: string } = {}
      if (statusFiltro !== 'todos') params.status = statusFiltro
      const res = await adminApi.getPagamentos(params)
      setPagamentos(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFiltro])

  // Totais
  const receitaBruta = pagamentos.reduce((s, p) => s + p.valor_total, 0)
  const totalEstornado = pagamentos.reduce((s, p) => s + p.valor_estornado, 0)
  const receitaLiquida = receitaBruta - totalEstornado

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pagamentos</h1>
          <p className="page-subtitle">Histórico financeiro da barbearia</p>
        </div>
      </div>

      {/* Cards de totais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <SummaryCard label="Receita Bruta" value={`R$ ${receitaBruta.toFixed(2)}`} color="var(--success)" />
        <SummaryCard label="Total Estornado" value={`R$ ${totalEstornado.toFixed(2)}`} color="var(--warning)" />
        <SummaryCard label="Receita Líquida" value={`R$ ${receitaLiquida.toFixed(2)}`} color="var(--info)" />
        <SummaryCard label="Transações" value={pagamentos.length} color="var(--accent)" />
      </div>

      {/* Filtro de status */}
      <div style={{ marginBottom: 20 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Status</label>
          <select
            className="form-input"
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="todos">Todos</option>
            <option value="pago">Pago</option>
            <option value="estornado_parcial">Estorno parcial</option>
            <option value="estornado">Estornado</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Carregando pagamentos...</div>
      ) : pagamentos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💳</div>
          <p>Nenhum pagamento encontrado.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Barbeiro</th>
                <th>Serviço</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Estornado</th>
                <th>Líquido</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pagamentos.map((p) => {
                const ag = p.agendamento
                const liquido = p.valor_total - p.valor_estornado
                return (
                  <tr key={p.id}>
                    <td>
                      {ag ? (
                        <>
                          <strong>{ag.hora}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>
                          {p.created_at
                            ? new Date(p.created_at).toLocaleDateString('pt-BR')
                            : '—'}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>
                        {ag?.cliente?.nome ?? '—'}
                      </div>
                      {ag?.cliente?.email && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {ag.cliente.email}
                        </div>
                      )}
                    </td>
                    <td>{ag?.barbeiro?.nome ?? '—'}</td>
                    <td>{ag?.servico?.nome ?? '—'}</td>
                    <td><DescricaoBadge descricao={p.descricao} /></td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                      R$ {p.valor_total.toFixed(2)}
                    </td>
                    <td style={{ color: p.valor_estornado > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                      {p.valor_estornado > 0 ? `R$ ${p.valor_estornado.toFixed(2)}` : '—'}
                    </td>
                    <td style={{ fontWeight: 600, color: liquido >= 0 ? 'var(--info)' : 'var(--danger)' }}>
                      R$ {liquido.toFixed(2)}
                    </td>
                    <td><StatusBadge status={p.status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: `${color}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '20px', flexShrink: 0,
      }}>
        💳
      </div>
      <div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: '22px', fontWeight: 700, color }}>{value}</div>
      </div>
    </div>
  )
}
