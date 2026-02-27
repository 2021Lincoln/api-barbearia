import { useEffect, useState } from 'react'
import { adminApi } from '../api/client'
import { Agendamento } from '../types'
import { Badge } from '../components/Badge'
import { useToast } from '../contexts/ToastContext'

const STATUS_OPTIONS = ['todos', 'pendente', 'confirmado', 'concluido', 'cancelado']

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function AgendamentosPage() {
  const { showToast } = useToast()
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(todayStr())
  const [statusFiltro, setStatusFiltro] = useState('todos')
  const [updating, setUpdating] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    try {
      const params: { data?: string; status?: string } = {}
      if (data) params.data = data
      if (statusFiltro !== 'todos') params.status = statusFiltro
      const res = await adminApi.getAgendamentos(params)
      setAgendamentos(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [data, statusFiltro])

  async function changeStatus(id: number, status: string) {
    setUpdating(id)
    try {
      await adminApi.updateAgendamentoStatus(id, status)
      showToast(`Status atualizado para "${status}"`)
      await load()
    } catch {
      showToast('Erro ao atualizar status.', 'error')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Agendamentos</h1>
          <p className="page-subtitle">Gerencie os agendamentos da barbearia</p>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Data</label>
          <input
            className="form-input"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            style={{ width: 'auto' }}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Status</label>
          <select
            className="form-input"
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            style={{ width: 'auto' }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Carregando agendamentos...</div>
      ) : agendamentos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <p>Nenhum agendamento encontrado para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Horário</th>
                <th>Cliente</th>
                <th>Barbeiro</th>
                <th>Serviço</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {agendamentos.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.hora}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(a.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td>{a.cliente?.nome ?? `Cliente #${a.cliente_id}`}</td>
                  <td>{a.barbeiro?.nome ?? `Barbeiro #${a.barbeiro_id}`}</td>
                  <td>
                    {a.servico?.nome ?? `Serviço #${a.servico_id}`}
                    {a.servico && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {a.servico.duracao_minutos} min
                      </div>
                    )}
                  </td>
                  <td>
                    {a.servico ? `R$ ${a.servico.preco.toFixed(2)}` : '—'}
                  </td>
                  <td><Badge status={a.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {a.status === 'pendente' && (
                        <button
                          className="btn btn-sm btn-secondary"
                          disabled={updating === a.id}
                          onClick={() => changeStatus(a.id, 'confirmado')}
                        >
                          Confirmar
                        </button>
                      )}
                      {(a.status === 'pendente' || a.status === 'confirmado') && (
                        <button
                          className="btn btn-sm btn-secondary"
                          disabled={updating === a.id}
                          onClick={() => changeStatus(a.id, 'concluido')}
                        >
                          Concluir
                        </button>
                      )}
                      {a.status !== 'cancelado' && a.status !== 'concluido' && (
                        <button
                          className="btn btn-sm btn-danger"
                          disabled={updating === a.id}
                          onClick={() => changeStatus(a.id, 'cancelado')}
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
