import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../api/client'

export function RegistroPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sucesso, setSucesso] = useState(false)

  const [form, setForm] = useState({
    nome: '',
    email: '',
    celular: '',
    senha: '',
    empresa_nome: '',
    empresa_cnpj: '',
    empresa_email: '',
    empresa_telefone: '',
    barbearia_nome: '',
    barbearia_slug: '',
    endereco_completo: '',
    latitude: '',
    longitude: '',
    horario_abertura: '08:00',
    horario_fechamento: '20:00',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await adminApi.registro({
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
      })
      setSucesso(true)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Erro ao criar conta.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Tela de sucesso
  if (sucesso) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: '56px', marginBottom: 16 }}>⏳</div>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>
            Cadastro enviado!
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
            Sua conta está <strong style={{ color: 'var(--warning)' }}>aguardando aprovação</strong> do administrador da plataforma.
            <br /><br />
            Você receberá acesso ao painel assim que o cadastro for aprovado.
            <br />
            Tente fazer login em alguns instantes.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ display: 'inline-block' }}>
            Ir para o Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container" style={{ alignItems: 'flex-start', paddingTop: '40px' }}>
      <div className="auth-card" style={{ maxWidth: 600 }}>
        <div className="auth-logo">
          <h1>✂️ BarberApp</h1>
          <p>Cadastro de Dono de Barbearia</p>
        </div>

        <div style={{
          background: 'var(--warning)11', border: '1px solid var(--warning)44',
          borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: '13px',
          color: 'var(--warning)',
        }}>
          Após o cadastro, o acesso ao painel será liberado somente após aprovação do administrador da plataforma.
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* ─── Dados pessoais ─── */}
          <div className="auth-section-title">Dados do Administrador</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome</label>
              <input className="form-input" name="nome" placeholder="Seu nome" value={form.nome} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Celular</label>
              <input className="form-input" name="celular" placeholder="(11) 99999-9999" value={form.celular} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" name="email" placeholder="seu@email.com" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input className="form-input" type="password" name="senha" placeholder="Mínimo 6 caracteres" value={form.senha} onChange={handleChange} required minLength={6} />
            </div>
          </div>

          {/* ─── Empresa ─── */}
          <div className="auth-section-title">Dados da Empresa</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome Fantasia</label>
              <input className="form-input" name="empresa_nome" placeholder="Grupo Premium Barbearias" value={form.empresa_nome} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">CNPJ</label>
              <input className="form-input" name="empresa_cnpj" placeholder="00.000.000/0001-00" value={form.empresa_cnpj} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">E-mail da Empresa</label>
              <input className="form-input" type="email" name="empresa_email" placeholder="contato@empresa.com" value={form.empresa_email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Telefone da Empresa</label>
              <input className="form-input" name="empresa_telefone" placeholder="(11) 3333-3333" value={form.empresa_telefone} onChange={handleChange} required />
            </div>
          </div>

          {/* ─── Barbearia ─── */}
          <div className="auth-section-title">Dados da Barbearia</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome da Barbearia</label>
              <input className="form-input" name="barbearia_nome" placeholder="Barbearia Premium" value={form.barbearia_nome} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Slug (URL única)</label>
              <input className="form-input" name="barbearia_slug" placeholder="barbearia-premium" value={form.barbearia_slug} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Endereço Completo</label>
            <input className="form-input" name="endereco_completo" placeholder="Rua das Flores, 123 - Centro, São Paulo - SP" value={form.endereco_completo} onChange={handleChange} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Latitude</label>
              <input className="form-input" name="latitude" type="number" step="any" placeholder="-23.5505" value={form.latitude} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Longitude</label>
              <input className="form-input" name="longitude" type="number" step="any" placeholder="-46.6333" value={form.longitude} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Horário de Abertura</label>
              <input className="form-input" name="horario_abertura" type="time" value={form.horario_abertura} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Horário de Fechamento</label>
              <input className="form-input" name="horario_fechamento" type="time" value={form.horario_fechamento} onChange={handleChange} required />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? 'Enviando cadastro...' : 'Enviar Cadastro para Aprovação'}
          </button>
        </form>

        <div className="auth-footer">
          Já tem conta? <Link to="/login">Fazer login</Link>
        </div>
      </div>
    </div>
  )
}
