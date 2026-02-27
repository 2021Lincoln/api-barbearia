import { useEffect, useState } from 'react'
import { adminApi } from '../api/client'
import { Servico } from '../types'
import { Modal } from '../components/Modal'
import { useToast } from '../contexts/ToastContext'

interface ServicoForm {
  nome: string
  descricao: string
  preco: string
  duracao_minutos: string
}

const EMPTY_FORM: ServicoForm = { nome: '', descricao: '', preco: '', duracao_minutos: '' }

export function ServicosPage() {
  const { showToast } = useToast()
  const [servicos, setServicos] = useState<Servico[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Servico | null>(null)
  const [form, setForm] = useState<ServicoForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await adminApi.getServicos()
      setServicos(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditando(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(s: Servico) {
    setEditando(s)
    setForm({
      nome: s.nome,
      descricao: s.descricao ?? '',
      preco: String(s.preco),
      duracao_minutos: String(s.duracao_minutos),
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditando(null)
    setForm(EMPTY_FORM)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSave() {
    if (!form.nome.trim() || !form.preco || !form.duracao_minutos) return
    setSaving(true)
    try {
      const data = {
        nome: form.nome,
        descricao: form.descricao || null,
        preco: parseFloat(form.preco),
        duracao_minutos: parseInt(form.duracao_minutos),
      }
      if (editando) {
        await adminApi.updateServico(editando.id, data)
        showToast('Serviço atualizado!')
      } else {
        await adminApi.createServico(data)
        showToast('Serviço criado!')
      }
      closeModal()
      await load()
    } catch {
      showToast('Erro ao salvar serviço.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(s: Servico) {
    if (!confirm(`Excluir "${s.nome}" permanentemente?`)) return
    setDeleting(s.id)
    try {
      await adminApi.deleteServico(s.id)
      showToast('Serviço excluído.')
      await load()
    } catch {
      showToast('Erro ao excluir serviço.', 'error')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Serviços</h1>
          <p className="page-subtitle">Gerencie os serviços oferecidos</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Novo Serviço
        </button>
      </div>

      {loading ? (
        <div className="loading">Carregando serviços...</div>
      ) : servicos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✂️</div>
          <p>Nenhum serviço cadastrado ainda.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Preço</th>
                <th>Duração</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {servicos.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.nome}</strong>
                    {s.descricao && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                        {s.descricao}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                      R$ {s.preco.toFixed(2)}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {s.duracao_minutos} min
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>
                        Editar
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(s)}
                        disabled={deleting === s.id}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editando ? 'Editar Serviço' : 'Novo Serviço'}
          onClose={closeModal}
        >
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input
              className="form-input"
              name="nome"
              placeholder="Ex: Corte Degradê"
              value={form.nome}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <input
              className="form-input"
              name="descricao"
              placeholder="Descrição do serviço"
              value={form.descricao}
              onChange={handleChange}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Preço (R$) *</label>
              <input
                className="form-input"
                name="preco"
                type="number"
                min="0"
                step="0.01"
                placeholder="45.00"
                value={form.preco}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Duração (min) *</label>
              <input
                className="form-input"
                name="duracao_minutos"
                type="number"
                min="1"
                placeholder="45"
                value={form.duracao_minutos}
                onChange={handleChange}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={closeModal}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !form.nome.trim() || !form.preco || !form.duracao_minutos}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
