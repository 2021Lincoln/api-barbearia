import { useEffect, useState, FormEvent } from 'react'
import { adminApi } from '../api/client'
import { Barbearia } from '../types'
import { useToast } from '../contexts/ToastContext'

export function BarbeariaPage() {
  const { showToast } = useToast()
  const [barbearia, setBarbearia] = useState<Barbearia | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [togglingStatus, setTogglingStatus] = useState(false)
  const [geocoding, setGeocoding] = useState(false)

  const [form, setForm] = useState({
    nome: '',
    slug: '',
    endereco_completo: '',
    cidade: '',
    bairro: '',
    latitude: '',
    longitude: '',
    foto_url: '',
    horario_abertura: '',
    horario_fechamento: '',
  })

  useEffect(() => {
    adminApi.getBarbearia()
      .then((res) => {
        const b: Barbearia = res.data
        setBarbearia(b)
        setForm({
          nome: b.nome,
          slug: b.slug,
          endereco_completo: b.endereco_completo,
          cidade: b.cidade ?? '',
          bairro: b.bairro ?? '',
          latitude: String(b.latitude),
          longitude: String(b.longitude),
          foto_url: b.foto_url ?? '',
          horario_abertura: b.horario_abertura,
          horario_fechamento: b.horario_fechamento,
        })
      })
      .finally(() => setLoading(false))
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleToggleStatus() {
    if (!barbearia) return
    setTogglingStatus(true)
    try {
      const novoStatus = !barbearia.aberta_agora
      await adminApi.toggleBarbeariaStatus(novoStatus)
      setBarbearia((prev) => prev ? { ...prev, aberta_agora: novoStatus } : prev)
      showToast(novoStatus ? 'Barbearia aberta!' : 'Barbearia fechada!')
    } catch {
      showToast('Erro ao atualizar status.', 'error')
    } finally {
      setTogglingStatus(false)
    }
  }

  async function preencherLatLng() {
    const endereco = `${form.endereco_completo}, ${form.bairro}, ${form.cidade}`.trim()
    if (!form.endereco_completo || !form.cidade) {
      showToast('Preencha endereço e cidade para buscar coordenadas.', 'error')
      return
    }
    setGeocoding(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(endereco)}`
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      })
      const data = await res.json() as Array<{ lat: string; lon: string }>
      if (!data.length) {
        showToast('Endereço não encontrado. Ajuste os dados e tente novamente.', 'error')
        return
      }
      setForm((prev) => ({
        ...prev,
        latitude: String(parseFloat(data[0].lat)),
        longitude: String(parseFloat(data[0].lon)),
      }))
      showToast('Coordenadas preenchidas automaticamente!')
    } catch {
      showToast('Falha ao consultar coordenadas.', 'error')
    } finally {
      setGeocoding(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await adminApi.updateBarbearia({
        nome: form.nome,
        slug: form.slug,
        endereco_completo: form.endereco_completo,
        cidade: form.cidade || null,
        bairro: form.bairro || null,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        foto_url: form.foto_url || null,
        horario_abertura: form.horario_abertura,
        horario_fechamento: form.horario_fechamento,
      })
      showToast('Barbearia atualizada com sucesso!')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Erro ao salvar.'
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="loading">Carregando dados da barbearia...</div>
  }

  if (!barbearia) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🏪</div>
        <p>Barbearia não encontrada.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{barbearia.nome}</h1>
          <p className="page-subtitle">Edite as informações da barbearia</p>
        </div>
      </div>

      {/* Toggle aberta agora */}
      <div className="card" style={{ maxWidth: 700, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Status da Barbearia</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Controle se a barbearia está recebendo agendamentos agora
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggleStatus}
          disabled={togglingStatus}
          style={{
            padding: '8px 20px',
            borderRadius: 20,
            border: 'none',
            cursor: togglingStatus ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            background: barbearia.aberta_agora ? 'var(--success)' : 'var(--danger)',
            color: '#fff',
            minWidth: 110,
            transition: 'background 0.2s',
          }}
        >
          {togglingStatus ? '...' : barbearia.aberta_agora ? '🟢 Aberta' : '🔴 Fechada'}
        </button>
      </div>

      <div className="card" style={{ maxWidth: 700 }}>
        <form onSubmit={handleSubmit}>
          <div className="auth-section-title" style={{ marginTop: 0 }}>Informações Gerais</div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome da Barbearia</label>
              <input
                className="form-input"
                name="nome"
                value={form.nome}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Slug (URL)</label>
              <input
                className="form-input"
                name="slug"
                value={form.slug}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Endereço Completo</label>
            <input
              className="form-input"
              name="endereco_completo"
              value={form.endereco_completo}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Cidade</label>
              <input
                className="form-input"
                name="cidade"
                value={form.cidade}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Bairro</label>
              <input
                className="form-input"
                name="bairro"
                value={form.bairro}
                onChange={handleChange}
                required
              />
            </div>
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
          </div>

          <div className="auth-section-title">Localização</div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Latitude</label>
              <input
                className="form-input"
                name="latitude"
                type="number"
                step="any"
                value={form.latitude}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Longitude</label>
              <input
                className="form-input"
                name="longitude"
                type="number"
                step="any"
                value={form.longitude}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div style={{ marginTop: -6, marginBottom: 12 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={preencherLatLng}
              disabled={geocoding}
            >
              {geocoding ? 'Buscando...' : 'Preencher lat/lng automaticamente'}
            </button>
          </div>

          <div className="auth-section-title">Horários</div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Horário de Abertura</label>
              <input
                className="form-input"
                name="horario_abertura"
                type="time"
                value={form.horario_abertura}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Horário de Fechamento</label>
              <input
                className="form-input"
                name="horario_fechamento"
                type="time"
                value={form.horario_fechamento}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div style={{ marginTop: '8px' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>

        {/* Info apenas leitura */}
        <div className="divider" />
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 4 }}>Avaliação</div>
            <div style={{ fontWeight: 600 }}>⭐ {barbearia.avaliacao.toFixed(1)}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 4 }}>Status</div>
            <div style={{ fontWeight: 600, color: barbearia.ativo ? 'var(--success)' : 'var(--danger)' }}>
              {barbearia.ativo ? '✅ Ativa' : '❌ Inativa'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 4 }}>ID</div>
            <div style={{ fontWeight: 600 }}>#{barbearia.id}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

