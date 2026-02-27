export interface Usuario {
  id: number
  nome: string
  email: string
  celular: string
  foto_url: string | null
  tipo: string
  empresa_id: number | null
  created_at: string | null
}

export interface Empresa {
  id: number
  nome_fantasia: string
  cnpj: string
  email: string
  telefone: string
}

export interface Barbearia {
  id: number
  nome: string
  slug: string
  endereco_completo: string
  cidade: string | null
  bairro: string | null
  latitude: number
  longitude: number
  foto_url: string | null
  horario_abertura: string
  horario_fechamento: string
  avaliacao: number
  ativo: boolean
  aberta_agora: boolean
  empresa_id: number
}

export interface Barbeiro {
  id: number
  nome: string
  foto_url: string | null
  especialidade: string | null
  servico_ids: number[]
  ativo: boolean
  barbearia_id: number
}

export interface BarbeiroDisponibilidade {
  id: number
  dia_semana: number  // 0=segunda…6=domingo
  hora_inicio: string
  hora_fim: string
}

export interface BarbeiroBloqueio {
  id: number
  barbeiro_id: number
  data: string
  hora_inicio: string | null
  hora_fim: string | null
  motivo: string | null
  created_at: string | null
}

export interface Servico {
  id: number
  nome: string
  descricao: string | null
  preco: number
  duracao_minutos: number
  barbearia_id: number
}

export interface Agendamento {
  id: number
  data: string
  hora: string
  status: string
  observacao: string | null
  created_at: string | null
  cliente_id: number
  barbearia_id: number
  barbeiro_id: number
  servico_id: number
  cliente?: Usuario
  barbeiro?: Barbeiro
  servico?: Servico
  barbearia?: Barbearia
}

export interface Pagamento {
  id: number
  agendamento_id: number
  valor_total: number
  valor_estornado: number
  status: string
  descricao: string | null
  created_at: string | null
}

export interface DashboardStats {
  agendamentos_hoje: number
  agendamentos_pendentes: number
  receita_hoje: number
  receita_mes: number
  agendamentos_semana: number
  receita_semana: number
  barbeiros_ativos: number
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
