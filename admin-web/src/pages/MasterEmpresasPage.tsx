import { useEffect, useState } from 'react'
import { masterApi } from '../api/client'
import { Modal } from '../components/Modal'
import { useToast } from '../contexts/ToastContext'

interface EmpresaMasterRead {
  id: number
  nome_fantasia: string
  cnpj: string
  email: string
  telefone: string
  aprovado: boolean
  ativo: boolean
  plano_expira_em: string | null
  created_at: string | null
  barbearia_nome: string | null
  admin_nome: string | null
  total_agendamentos: number
  total_receita: number
}

function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: '12px', fontWeight: 600,
      background: ativo ? 'var(--success)22' : 'var(--danger)22',
      color: ativo ? 'var(--success)' : 'var(--danger)',
      border: `1px solid ${ativo ? 'var(--success)' : 'var(--danger)'}44`,
    }}>
      {ativo ? 'Ativa' : 'Suspensa'}
    </span>
  )
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function MasterEmpresasPage() {
  const { showToast } = useToast()
  const [empresas, setEmpresas] = useState<EmpresaMasterRead[]>([])
  const [loading, setLoading] = useState(true)
  const [empresaModal, setEmpresaModal] = useState<EmpresaMasterRead | null>(null)
  const [novoAtivo, setNovoAtivo] = useState(true)
  const [novoPlano, setNovoPlano] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await masterApi.getEmpresas()
      setEmpresas(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const pendentes = empresas.filter((e) => !e.aprovado)
  const aprovadas = empresas.filter((e) => e.aprovado)

  function openModal(empresa: EmpresaMasterRead) {
    setEmpresaModal(empresa)
    setNovoAtivo(empresa.ativo)
    setNovoPlano(empresa.plano_expira_em ? empresa.plano_expira_em.split('T')[0] : '')
  }

  async function handleSalvar() {
    if (!empresaModal) return
    setSaving(true)
    try {
      await masterApi.updateEmpresaStatus(
        empresaModal.id,
        novoAtivo,
        novoPlano ? `${novoPlano}T23:59:59` : null,
      )
      showToast('Empresa atualizada com sucesso!')
      setEmpresaModal(null)
      await load()
    } catch {
      showToast('Erro ao atualizar empresa.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function aprovar(id: number) {
    setActionId(id)
    try {
      await masterApi.aprovarEmpresa(id)
      showToast('Empresa aprovada! O admin já pode fazer login.')
      await load()
    } catch {
      showToast('Erro ao aprovar empresa.', 'error')
    } finally {
      setActionId(null)
    }
  }

  async function rejeitar(empresa: EmpresaMasterRead) {
    if (!confirm(`Rejeitar e excluir "${empresa.nome_fantasia}"? Esta ação não pode ser desfeita.`)) return
    setActionId(empresa.id)
    try {
      await masterApi.rejeitarEmpresa(empresa.id)
      showToast('Cadastro rejeitado e removido.')
      await load()
    } catch {
      showToast('Erro ao rejeitar empresa.', 'error')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Empresas</h1>
          <p className="page-subtitle">Gerencie todas as empresas cadastradas na plataforma</p>
        </div>
      </div>

      {loading ? (
        <div className="loading">Carregando empresas...</div>
      ) : (
        <>
          {/* ── Pendentes ─────────────────────────────────────────── */}
          {pendentes.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
              }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--warning)', margin: 0 }}>
                  Aguardando Aprovação
                </h2>
                <span style={{
                  background: 'var(--warning)', color: '#000', borderRadius: 20,
                  padding: '2px 10px', fontSize: '12px', fontWeight: 700,
                }}>
                  {pendentes.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pendentes.map((e) => (
                  <div key={e.id} style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--warning)44',
                    borderLeft: '4px solid var(--warning)',
                    borderRadius: 12, padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
                  }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: 4 }}>
                        {e.nome_fantasia}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span>CNPJ: {e.cnpj}</span>
                        <span>Admin: {e.admin_nome ?? '—'}</span>
                        <span>Barbearia: {e.barbearia_nome ?? '—'}</span>
                        <span>Cadastrado em: {formatDate(e.created_at)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-sm"
                        style={{
                          background: 'var(--success)', color: '#fff', border: 'none',
                          opacity: actionId === e.id ? 0.6 : 1,
                        }}
                        disabled={actionId === e.id}
                        onClick={() => aprovar(e.id)}
                      >
                        {actionId === e.id ? '...' : '✓ Aprovar'}
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        disabled={actionId === e.id}
                        onClick={() => rejeitar(e)}
                      >
                        ✕ Rejeitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Aprovadas ─────────────────────────────────────────── */}
          {aprovadas.length === 0 ? (
            pendentes.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">🏢</div>
                <p>Nenhuma empresa cadastrada.</p>
              </div>
            )
          ) : (
            <>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 14 }}>
                Empresas Ativas / Suspensas
              </h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Barbearia</th>
                      <th>Admin</th>
                      <th>Agendamentos</th>
                      <th>Receita</th>
                      <th>Plano expira</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aprovadas.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{e.nome_fantasia}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{e.cnpj}</div>
                        </td>
                        <td>{e.barbearia_nome ?? '—'}</td>
                        <td>
                          <div>{e.admin_nome ?? '—'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{e.email}</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>{e.total_agendamentos}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                          R$ {e.total_receita.toFixed(2)}
                        </td>
                        <td>
                          {e.plano_expira_em ? (
                            <span style={{
                              color: new Date(e.plano_expira_em) < new Date()
                                ? 'var(--danger)' : 'var(--text-primary)',
                            }}>
                              {formatDate(e.plano_expira_em)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--success)', fontSize: '12px' }}>Sem expiração</span>
                          )}
                        </td>
                        <td><StatusBadge ativo={e.ativo} /></td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => openModal(e)}>
                            Gerenciar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* Modal gerenciar empresa aprovada */}
      {empresaModal && (
        <Modal title={`Gerenciar — ${empresaModal.nome_fantasia}`} onClose={() => setEmpresaModal(null)}>
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 10,
            padding: '12px 16px', marginBottom: 20,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
          }}>
            <InfoItem label="CNPJ" value={empresaModal.cnpj} />
            <InfoItem label="Telefone" value={empresaModal.telefone} />
            <InfoItem label="Barbearia" value={empresaModal.barbearia_nome ?? '—'} />
            <InfoItem label="Admin" value={empresaModal.admin_nome ?? '—'} />
            <InfoItem label="Agendamentos" value={String(empresaModal.total_agendamentos)} />
            <InfoItem label="Receita total" value={`R$ ${empresaModal.total_receita.toFixed(2)}`} />
          </div>

          <div className="form-group">
            <label className="form-label">Status da Empresa</label>
            <div style={{ display: 'flex', gap: 12 }}>
              {[true, false].map((val) => (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => setNovoAtivo(val)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 10, border: '2px solid',
                    cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                    borderColor: novoAtivo === val
                      ? (val ? 'var(--success)' : 'var(--danger)') : 'var(--border)',
                    background: novoAtivo === val
                      ? (val ? 'var(--success)22' : 'var(--danger)22') : 'transparent',
                    color: novoAtivo === val
                      ? (val ? 'var(--success)' : 'var(--danger)') : 'var(--text-muted)',
                  }}
                >
                  {val ? '✅ Ativa' : '🚫 Suspensa'}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Validade do Plano (vazio = sem expiração)</label>
            <input
              type="date"
              className="form-input"
              value={novoPlano}
              onChange={(e) => setNovoPlano(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setEmpresaModal(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSalvar} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: 500 }}>{value}</div>
    </div>
  )
}
