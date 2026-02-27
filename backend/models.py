from sqlmodel import SQLModel, Field, Relationship
from typing import List, Optional
from datetime import date, datetime


# ─── Usuário (Cliente) ────────────────────────────────────────────────────────
class Usuario(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nome: str
    email: str = Field(unique=True, index=True)
    celular: str
    senha_hash: str
    foto_url: Optional[str] = None
    tipo: str = Field(default="cliente")          # "cliente" | "admin" | "super_admin"
    empresa_id: Optional[int] = Field(default=None, foreign_key="empresa.id")
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    agendamentos: List["Agendamento"] = Relationship(back_populates="cliente")


# ─── Empresa (Dono / Franquia) ────────────────────────────────────────────────
class Empresa(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nome_fantasia: str
    cnpj: str = Field(unique=True, index=True)
    email: str
    telefone: str
    aprovado: bool = Field(default=False)           # False = aguardando aprovação do super_admin
    ativo: bool = Field(default=True)               # False = suspensa pelo super_admin
    plano_expira_em: Optional[datetime] = None      # None = sem expiração definida
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    barbearias: List["Barbearia"] = Relationship(back_populates="empresa")


# ─── Barbearia (Unidade) ──────────────────────────────────────────────────────
class Barbearia(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nome: str
    slug: str = Field(unique=True, index=True)
    endereco_completo: str
    cidade: Optional[str] = None
    bairro: Optional[str] = None
    latitude: float
    longitude: float
    foto_url: Optional[str] = None
    horario_abertura: str = "08:00"
    horario_fechamento: str = "20:00"
    avaliacao: float = 5.0
    ativo: bool = True
    aberta_agora: bool = Field(default=True)        # toggle manual pelo admin

    empresa_id: int = Field(foreign_key="empresa.id")
    empresa: Optional[Empresa] = Relationship(back_populates="barbearias")
    barbeiros: List["Barbeiro"] = Relationship(back_populates="barbearia")
    servicos: List["Servico"] = Relationship(back_populates="barbearia")
    agendamentos: List["Agendamento"] = Relationship(back_populates="barbearia")


class BarbeiroServico(SQLModel, table=True):
    barbeiro_id: int = Field(foreign_key="barbeiro.id", primary_key=True)
    servico_id: int = Field(foreign_key="servico.id", primary_key=True)

class AgendamentoServico(SQLModel, table=True):
    agendamento_id: int = Field(foreign_key="agendamento.id", primary_key=True)
    servico_id: int = Field(foreign_key="servico.id", primary_key=True)


# ─── Barbeiro ─────────────────────────────────────────────────────────────────
class Barbeiro(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nome: str
    foto_url: Optional[str] = None
    especialidade: Optional[str] = None
    ativo: bool = True

    barbearia_id: int = Field(foreign_key="barbearia.id")
    barbearia: Optional[Barbearia] = Relationship(back_populates="barbeiros")
    agendamentos: List["Agendamento"] = Relationship(back_populates="barbeiro")
    disponibilidades: List["BarbeiroDisponibilidade"] = Relationship(back_populates="barbeiro")
    bloqueios: List["BarbeiroBloqueio"] = Relationship(back_populates="barbeiro")
    servicos: List["Servico"] = Relationship(back_populates="barbeiros", link_model=BarbeiroServico)

    @property
    def servico_ids(self) -> List[int]:
        return [s.id for s in self.servicos if s.id is not None]


# ─── Disponibilidade do Barbeiro (dias/horários de trabalho) ──────────────────
class BarbeiroDisponibilidade(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    barbeiro_id: int = Field(foreign_key="barbeiro.id")
    dia_semana: int   # 0=segunda, 1=terça, ..., 6=domingo
    hora_inicio: str  # "09:00"
    hora_fim: str     # "18:00"

    barbeiro: Optional[Barbeiro] = Relationship(back_populates="disponibilidades")


# ─── Bloqueio pontual do Barbeiro (folgas, feriados, etc.) ────────────────────
class BarbeiroBloqueio(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    barbeiro_id: int = Field(foreign_key="barbeiro.id")
    data: date
    hora_inicio: Optional[str] = None  # None = dia inteiro bloqueado
    hora_fim: Optional[str] = None
    motivo: Optional[str] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    barbeiro: Optional[Barbeiro] = Relationship(back_populates="bloqueios")


# ─── Serviço ──────────────────────────────────────────────────────────────────
class Servico(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nome: str
    descricao: Optional[str] = None
    preco: float
    duracao_minutos: int

    barbearia_id: int = Field(foreign_key="barbearia.id")
    barbearia: Optional[Barbearia] = Relationship(back_populates="servicos")
    agendamentos: List["Agendamento"] = Relationship(back_populates="servico")
    barbeiros: List[Barbeiro] = Relationship(back_populates="servicos", link_model=BarbeiroServico)
    agendamentos_multi: List["Agendamento"] = Relationship(back_populates="servicos", link_model=AgendamentoServico)


# ─── Agendamento ──────────────────────────────────────────────────────────────
class Agendamento(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    data: date
    hora: str                # Ex: "09:00"
    status: str = "pendente" # pendente | confirmado | concluido | cancelado
    observacao: Optional[str] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    cliente_id: int = Field(foreign_key="usuario.id")
    barbearia_id: int = Field(foreign_key="barbearia.id")
    barbeiro_id: int = Field(foreign_key="barbeiro.id")
    servico_id: int = Field(foreign_key="servico.id")

    cliente: Optional[Usuario] = Relationship(back_populates="agendamentos")
    barbearia: Optional[Barbearia] = Relationship(back_populates="agendamentos")
    barbeiro: Optional[Barbeiro] = Relationship(back_populates="agendamentos")
    servico: Optional[Servico] = Relationship(back_populates="agendamentos")
    servicos: List[Servico] = Relationship(back_populates="agendamentos_multi", link_model=AgendamentoServico)
    pagamentos: List["Pagamento"] = Relationship(back_populates="agendamento")

    @property
    def servico_ids(self) -> List[int]:
        return [s.id for s in self.servicos if s.id is not None]


# ─── Pagamento (mock simulado) ────────────────────────────────────────────────
class Pagamento(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    agendamento_id: int = Field(foreign_key="agendamento.id")
    valor_total: float
    valor_estornado: float = 0.0
    status: str = "pago"   # "pago" | "estornado" | "estornado_parcial"
    descricao: Optional[str] = None  # ex: "Pagamento", "Taxa de reagendamento"
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    agendamento: Optional[Agendamento] = Relationship(back_populates="pagamentos")


class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: Optional[int] = Field(default=None, foreign_key="usuario.id")
    acao: str
    entidade: str
    entidade_id: Optional[int] = None
    detalhes: Optional[str] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
