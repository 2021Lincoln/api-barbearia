import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
})

// Injeta token JWT em todas as requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redireciona para login se 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// ─── Auth ──────────────────────────────────────────────────────────────────
export const adminApi = {
  login: (email: string, senha: string) =>
    api.post('/admin/login', { email, senha }),

  registro: (data: Record<string, unknown>) =>
    api.post('/admin/registro', data),

  me: () => api.get('/admin/me'),

  // Dashboard
  dashboard: () => api.get('/admin/dashboard'),

  // Barbearia
  getBarbearia: () => api.get('/admin/barbearia'),
  updateBarbearia: (data: Record<string, unknown>) =>
    api.put('/admin/barbearia', data),

  // Barbeiros
  getBarbeiros: () => api.get('/admin/barbeiros'),
  createBarbeiro: (data: Record<string, unknown>) =>
    api.post('/admin/barbeiros', data),
  updateBarbeiro: (id: number, data: Record<string, unknown>) =>
    api.put(`/admin/barbeiros/${id}`, data),
  deleteBarbeiro: (id: number) => api.delete(`/admin/barbeiros/${id}`),

  // Serviços
  getServicos: () => api.get('/admin/servicos'),
  createServico: (data: Record<string, unknown>) =>
    api.post('/admin/servicos', data),
  updateServico: (id: number, data: Record<string, unknown>) =>
    api.put(`/admin/servicos/${id}`, data),
  deleteServico: (id: number) => api.delete(`/admin/servicos/${id}`),

  // Agendamentos
  getAgendamentos: (params?: { data?: string; status?: string }) =>
    api.get('/admin/agendamentos', { params }),
  updateAgendamentoStatus: (id: number, status: string) =>
    api.patch(`/admin/agendamentos/${id}/status`, { status }),

  // Disponibilidade e Bloqueios
  getBarbeiroDisponibilidade: (id: number) =>
    api.get(`/admin/barbeiros/${id}/disponibilidade`),
  updateBarbeiroDisponibilidade: (id: number, data: unknown[]) =>
    api.put(`/admin/barbeiros/${id}/disponibilidade`, data),
  getBarbeiroBloqueios: (id: number) =>
    api.get(`/admin/barbeiros/${id}/bloqueios`),
  createBarbeiroBloqueio: (id: number, data: Record<string, unknown>) =>
    api.post(`/admin/barbeiros/${id}/bloqueios`, data),
  deleteBarbeiroBloqueio: (bloqueioId: number) =>
    api.delete(`/admin/barbeiros/bloqueios/${bloqueioId}`),

  // Status da Barbearia
  toggleBarbeariaStatus: (aberta_agora: boolean) =>
    api.patch('/admin/barbearia/status', { aberta_agora }),

  // Pagamentos
  getPagamentos: (params?: { status?: string }) =>
    api.get('/admin/pagamentos', { params }),
}

// ─── Master (Super Admin) ───────────────────────────────────────────────────
export const masterApi = {
  login: (email: string, senha: string) =>
    api.post('/master/login', { email, senha }),

  me: () => api.get('/master/me'),

  getStats: () => api.get('/master/stats'),

  getEmpresas: () => api.get('/master/empresas'),

  updateEmpresaStatus: (id: number, ativo: boolean, plano_expira_em?: string | null) =>
    api.patch(`/master/empresas/${id}/status`, { ativo, plano_expira_em }),

  aprovarEmpresa: (id: number) =>
    api.post(`/master/empresas/${id}/aprovar`),

  rejeitarEmpresa: (id: number) =>
    api.delete(`/master/empresas/${id}`),
}
