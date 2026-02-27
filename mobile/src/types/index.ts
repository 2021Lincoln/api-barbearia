export interface Usuario {
  id: number;
  nome: string;
  email: string;
  celular: string;
  foto_url?: string;
  created_at?: string;
}

export interface Empresa {
  id: number;
  nome_fantasia: string;
  cnpj: string;
  email: string;
  telefone: string;
}

export interface Barbearia {
  id: number;
  nome: string;
  slug: string;
  endereco_completo: string;
  cidade?: string;
  bairro?: string;
  latitude: number;
  longitude: number;
  foto_url?: string;
  horario_abertura: string;
  horario_fechamento: string;
  avaliacao: number;
  ativo: boolean;
  aberta_agora: boolean;
  empresa_id: number;
  barbeiros?: Barbeiro[];
  servicos?: Servico[];
}

export interface Pagamento {
  id: number;
  agendamento_id: number;
  valor_total: number;
  valor_estornado: number;
  status: string;
  descricao?: string;
  created_at?: string;
}

export interface Barbeiro {
  id: number;
  nome: string;
  foto_url?: string;
  especialidade?: string;
  servico_ids?: number[];
  ativo: boolean;
  barbearia_id: number;
}

export interface Servico {
  id: number;
  nome: string;
  descricao?: string;
  preco: number;
  duracao_minutos: number;
  barbearia_id: number;
}

export interface Agendamento {
  id: number;
  data: string;
  hora: string;
  status: 'pendente' | 'confirmado' | 'concluido' | 'cancelado';
  observacao?: string;
  created_at?: string;
  cliente_id: number;
  barbearia_id: number;
  barbeiro_id: number;
  servico_id: number;
  servico_ids?: number[];
  cliente?: Usuario;
  barbearia?: Barbearia;
  barbeiro?: Barbeiro;
  servico?: Servico;
  servicos?: Servico[];
}

// ─── Navegação ────────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Login: undefined;
  Registro: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  MeusAgendamentos: undefined;
  Perfil: undefined;
};

export type HomeStackParamList = {
  HomeList: undefined;
  BarbeariaDetalhe: { barbearia_id: number };
  Agendamento: {
    barbearia_id: number;
    barbeiro?: Barbeiro;
    servico?: Servico;
    servicos?: Servico[];
  };
  Reagendar: {
    agendamento: Agendamento;
  };
  Confirmacao: { agendamento_id: number };
};
