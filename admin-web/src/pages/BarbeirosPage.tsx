import { useEffect, useState } from 'react'
import { adminApi } from '../api/client'
import { Barbeiro, BarbeiroDisponibilidade, BarbeiroBloqueio, Servico } from '../types'
import { Modal } from '../components/Modal'
import { useToast } from '../contexts/ToastContext'

const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

interface BarbeiroForm {
  nome: string
  especialidade: string
  foto_url: string
}

interface DiaConfig {
  ativo: boolean
  hora_inicio: string
  hora_fim: string
}

const EMPTY_FORM: BarbeiroForm = { nome: '', especialidade: '', foto_url: '' }
const EMPTY_DIA: DiaConfig = { ativo: false, hora_inicio: '09:00', hora_fim: '18:00' }

// ─── Modal de Horários ────────────────────────────────────────────────────────
function ModalHorarios({
  barbeiro,
  onClose,
}: {
  barbeiro: Barbeiro
  onClose: () => void
}) {
  const { showToast } = useToast()
  const [aba, setAba] = useState<'disponibilidade' | 'bloqueios'>('disponibilidade')

  // Disponibilidade
  const [dias, setDias] = useState<DiaConfig[]>(
    DIAS_SEMANA.map(() => ({ ...EMPTY_DIA }))
  )
  const [savingDisp, setSavingDisp] = useState(false)

  // Bloqueios
  const [bloqueios, setBloqueios] = useState<BarbeiroBloqueio[]>([])
  const [loadingBloqueios, setLoadingBloqueios] = useState(false)
  const [novoData, setNovoData] = useState('')
  const [novoHoraInicio, setNovoHoraInicio] = useState('')
  const [novoHoraFim, setNovoHoraFim] = useState('')
  const [novoMotivo, setNovoMotivo] = useState('')
  const [diaInteiro, setDiaInteiro] = useState(true)
  const [savingBloqueio, setSavingBloqueio] = useState(false)

  // Carrega disponibilidade ao abrir
  useEffect(() => {
    adminApi.getBarbeiroDisponibilidade(barbeiro.id).then((res) => {
      const dispList: BarbeiroDisponibilidade[] = res.data
      setDias((prev) => {
        const novo = prev.map((d) => ({ ...d }))
        dispList.forEach((d) => {
          novo[d.dia_semana] = { ativo: true, hora_inicio: d.hora_inicio, hora_fim: d.hora_fim }
        })
        return novo
      })
    })
  }, [barbeiro.id])

  // Carrega bloqueios quando muda de aba
  useEffect(() => {
    if (aba === 'bloqueios') {
      setLoadingBloqueios(true)
      adminApi.getBarbeiroBloqueios(barbeiro.id)
        .then((res) => setBloqueios(res.data))
        .finally(() => setLoadingBloqueios(false))
    }
  }, [aba, barbeiro.id])

  function toggleDia(idx: number) {
    setDias((prev) => {
      const novo = [...prev]
      novo[idx] = { ...novo[idx], ativo: !novo[idx].ativo }
      return novo
    })
  }

  function setDiaHora(idx: number, field: 'hora_inicio' | 'hora_fim', val: string) {
    setDias((prev) => {
      const novo = [...prev]
      novo[idx] = { ...novo[idx], [field]: val }
      return novo
    })
  }

  async function salvarDisponibilidade() {
    setSavingDisp(true)
    try {
      const payload = dias
        .map((d, i) => ({ dia_semana: i, hora_inicio: d.hora_inicio, hora_fim: d.hora_fim, ativo: d.ativo }))
        .filter((d) => d.ativo)
        .map(({ dia_semana, hora_inicio, hora_fim }) => ({ dia_semana, hora_inicio, hora_fim }))

      await adminApi.updateBarbeiroDisponibilidade(barbeiro.id, payload)
      showToast('Disponibilidade salva!')
    } catch {
      showToast('Erro ao salvar disponibilidade.', 'error')
    } finally {
      setSavingDisp(false)
    }
  }

  async function adicionarBloqueio() {
    if (!novoData) return
    setSavingBloqueio(true)
    try {
      await adminApi.createBarbeiroBloqueio(barbeiro.id, {
        data: novoData,
        hora_inicio: diaInteiro ? null : novoHoraInicio || null,
        hora_fim: diaInteiro ? null : novoHoraFim || null,
        motivo: novoMotivo || null,
      })
      showToast('Bloqueio adicionado!')
      setNovoData('')
      setNovoHoraInicio('')
      setNovoHoraFim('')
      setNovoMotivo('')
      setDiaInteiro(true)
      const res = await adminApi.getBarbeiroBloqueios(barbeiro.id)
      setBloqueios(res.data)
    } catch {
      showToast('Erro ao adicionar bloqueio.', 'error')
    } finally {
      setSavingBloqueio(false)
    }
  }

  async function removerBloqueio(id: number) {
    try {
      await adminApi.deleteBarbeiroBloqueio(id)
      setBloqueios((prev) => prev.filter((b) => b.id !== id))
      showToast('Bloqueio removido.')
    } catch {
      showToast('Erro ao remover bloqueio.', 'error')
    }
  }

  return (
    <Modal title={`Horários — ${barbeiro.nome}`} onClose={onClose}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {(['disponibilidade', 'bloqueios'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setAba(tab)}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px 18px',
              cursor: 'pointer',
              fontWeight: aba === tab ? 700 : 400,
              color: aba === tab ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: aba === tab ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
              fontSize: '14px',
            }}
          >
            {tab === 'disponibilidade' ? 'Dias de Trabalho' : 'Folgas / Bloqueios'}
          </button>
        ))}
      </div>

      {aba === 'disponibilidade' && (
        <div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 12 }}>
            Marque os dias e defina o horário de trabalho do barbeiro.
          </p>
          {DIAS_SEMANA.map((nome, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 0',
                borderBottom: '1px solid var(--border)',
                opacity: dias[idx].ativo ? 1 : 0.5,
              }}
            >
              <input
                type="checkbox"
                checked={dias[idx].ativo}
                onChange={() => toggleDia(idx)}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
              />
              <span style={{ width: 70, fontWeight: 500, fontSize: '14px' }}>{nome}</span>
              <input
                type="time"
                value={dias[idx].hora_inicio}
                disabled={!dias[idx].ativo}
                onChange={(e) => setDiaHora(idx, 'hora_inicio', e.target.value)}
                className="form-input"
                style={{ maxWidth: 110, padding: '4px 8px', fontSize: '13px' }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>até</span>
              <input
                type="time"
                value={dias[idx].hora_fim}
                disabled={!dias[idx].ativo}
                onChange={(e) => setDiaHora(idx, 'hora_fim', e.target.value)}
                className="form-input"
                style={{ maxWidth: 110, padding: '4px 8px', fontSize: '13px' }}
              />
            </div>
          ))}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-primary"
              onClick={salvarDisponibilidade}
              disabled={savingDisp}
            >
              {savingDisp ? 'Salvando...' : 'Salvar Disponibilidade'}
            </button>
          </div>
        </div>
      )}

      {aba === 'bloqueios' && (
        <div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 12 }}>
            Adicione folgas ou bloqueios pontuais (feriados, férias, etc.).
          </p>

          {/* Form novo bloqueio */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '14px' }}>Novo Bloqueio</div>
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Data *</label>
                <input
                  type="date"
                  className="form-input"
                  value={novoData}
                  onChange={(e) => setNovoData(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Motivo</label>
                <input
                  className="form-input"
                  placeholder="Férias, feriado..."
                  value={novoMotivo}
                  onChange={(e) => setNovoMotivo(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <input
                type="checkbox"
                id="diaInteiro"
                checked={diaInteiro}
                onChange={(e) => setDiaInteiro(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              <label htmlFor="diaInteiro" style={{ fontSize: '14px', cursor: 'pointer' }}>
                Dia inteiro
              </label>
            </div>
            {!diaInteiro && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Hora início</label>
                  <input
                    type="time"
                    className="form-input"
                    value={novoHoraInicio}
                    onChange={(e) => setNovoHoraInicio(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hora fim</label>
                  <input
                    type="time"
                    className="form-input"
                    value={novoHoraFim}
                    onChange={(e) => setNovoHoraFim(e.target.value)}
                  />
                </div>
              </div>
            )}
            <button
              className="btn btn-primary btn-sm"
              onClick={adicionarBloqueio}
              disabled={savingBloqueio || !novoData}
            >
              {savingBloqueio ? 'Adicionando...' : '+ Adicionar Bloqueio'}
            </button>
          </div>

          {/* Lista de bloqueios */}
          {loadingBloqueios ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Carregando...</div>
          ) : bloqueios.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Nenhum bloqueio cadastrado.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bloqueios.map((b) => (
                <div
                  key={b.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-secondary)',
                    borderRadius: 8,
                    padding: '10px 14px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{b.data}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {b.hora_inicio
                        ? `${b.hora_inicio} – ${b.hora_fim ?? '?'}`
                        : 'Dia inteiro'}
                      {b.motivo ? ` · ${b.motivo}` : ''}
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--danger)' }}
                    onClick={() => removerBloqueio(b.id)}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export function BarbeirosPage() {
  const { showToast } = useToast()
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Barbeiro | null>(null)
  const [form, setForm] = useState<BarbeiroForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [servicoIdsSelecionados, setServicoIdsSelecionados] = useState<number[]>([])
  const [barbeiroHorarios, setBarbeiroHorarios] = useState<Barbeiro | null>(null)
  const [erroFoto, setErroFoto] = useState<Record<number, boolean>>({})

  async function load() {
    setLoading(true)
    try {
      const [resBarbeiros, resServicos] = await Promise.all([
        adminApi.getBarbeiros(),
        adminApi.getServicos(),
      ])
      setBarbeiros(resBarbeiros.data)
      setServicos(resServicos.data)
      setErroFoto({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditando(null)
    setForm(EMPTY_FORM)
    setServicoIdsSelecionados([])
    setModalOpen(true)
  }

  function openEdit(b: Barbeiro) {
    setEditando(b)
    setForm({ nome: b.nome, especialidade: b.especialidade ?? '', foto_url: b.foto_url ?? '' })
    setServicoIdsSelecionados(b.servico_ids ?? [])
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditando(null)
    setForm(EMPTY_FORM)
    setServicoIdsSelecionados([])
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('Selecione um arquivo de imagem válido.', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setForm((prev) => ({ ...prev, foto_url: result }))
    }
    reader.onerror = () => showToast('Erro ao ler a imagem.', 'error')
    reader.readAsDataURL(file)
  }

  function toggleServico(id: number) {
    setServicoIdsSelecionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSave() {
    if (!form.nome.trim()) return
    setSaving(true)
    try {
      const data = {
        nome: form.nome,
        especialidade: form.especialidade.trim() || 'Todas',
        foto_url: form.foto_url || null,
        servico_ids: servicoIdsSelecionados,
      }
      if (editando) {
        await adminApi.updateBarbeiro(editando.id, data)
        showToast('Barbeiro atualizado!')
      } else {
        await adminApi.createBarbeiro(data)
        showToast('Barbeiro criado!')
      }
      closeModal()
      await load()
    } catch {
      showToast('Erro ao salvar barbeiro.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleAtivo(b: Barbeiro) {
    try {
      if (b.ativo) {
        await adminApi.deleteBarbeiro(b.id)
        showToast(`${b.nome} desativado.`)
      } else {
        await adminApi.updateBarbeiro(b.id, { ativo: true })
        showToast(`${b.nome} reativado!`)
      }
      await load()
    } catch {
      showToast('Erro ao alterar status.', 'error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Barbeiros</h1>
          <p className="page-subtitle">Gerencie a equipe da sua barbearia</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Novo Barbeiro
        </button>
      </div>

      {loading ? (
        <div className="loading">Carregando barbeiros...</div>
      ) : barbeiros.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💈</div>
          <p>Nenhum barbeiro cadastrado ainda.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Especialidade</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {barbeiros.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {b.foto_url && !erroFoto[b.id] ? (
                        <img
                          src={b.foto_url}
                          alt={b.nome}
                          style={{
                            width: 36, height: 36, borderRadius: '50%',
                            objectFit: 'cover', flexShrink: 0,
                            border: '2px solid var(--border)',
                          }}
                          onError={() => setErroFoto((prev) => ({ ...prev, [b.id]: true }))}
                        />
                      ) : (
                        <div
                          style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'var(--border)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: '16px', flexShrink: 0,
                          }}
                        >
                          💈
                        </div>
                      )}
                      <strong>{b.nome}</strong>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {b.especialidade?.trim() || 'Todas'}
                  </td>
                  <td>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={b.ativo}
                        onChange={() => toggleAtivo(b)}
                      />
                      <span className="switch-slider" />
                    </label>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(b)}>
                        Editar
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--info)' }}
                        onClick={() => setBarbeiroHorarios(b)}
                      >
                        Horários
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal criar/editar barbeiro */}
      {modalOpen && (
        <Modal
          title={editando ? 'Editar Barbeiro' : 'Novo Barbeiro'}
          onClose={closeModal}
        >
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input
              className="form-input"
              name="nome"
              placeholder="Nome do barbeiro"
              value={form.nome}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Especialidade</label>
            <input
              className="form-input"
              name="especialidade"
              placeholder="Ex: Degradê moderno"
              value={form.especialidade}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label className="form-label">URL da Foto</label>
            <input
              className="form-input"
              name="foto_url"
              placeholder="https://..."
              value={form.foto_url}
              onChange={handleChange}
            />
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ marginTop: 8 }}
            />
            {form.foto_url && (
              <div style={{ marginTop: 10 }}>
                <img
                  src={form.foto_url}
                  alt="Prévia da foto"
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid var(--border)',
                  }}
                />
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Serviços que este barbeiro faz</label>
            {servicos.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Cadastre serviços primeiro.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 170, overflowY: 'auto' }}>
                {servicos.map((s) => (
                  <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={servicoIdsSelecionados.includes(s.id)}
                      onChange={() => toggleServico(s.id)}
                    />
                    <span>{s.nome}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={closeModal}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !form.nome.trim() || servicoIdsSelecionados.length === 0}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal de horários */}
      {barbeiroHorarios && (
        <ModalHorarios
          barbeiro={barbeiroHorarios}
          onClose={() => setBarbeiroHorarios(null)}
        />
      )}
    </div>
  )
}
