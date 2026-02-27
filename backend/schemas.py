import re
from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional, List
from datetime import date, datetime


# ─── Auth ─────────────────────────────────────────────────────────────────────
class RegistroRequest(BaseModel):
    nome: str
    email: str
    celular: str
    senha: str

    @field_validator("senha")
    @classmethod
    def validar_senha_forte(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Senha deve ter no minimo 8 caracteres.")
        if not re.search(r"[A-Z]", value):
            raise ValueError("Senha deve conter ao menos uma letra maiuscula.")
        if not re.search(r"[a-z]", value):
            raise ValueError("Senha deve conter ao menos uma letra minuscula.")
        if not re.search(r"\d", value):
            raise ValueError("Senha deve conter ao menos um numero.")
        return value


class LoginRequest(BaseModel):
    email: str
    senha: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ─── Usuário ──────────────────────────────────────────────────────────────────
class UsuarioRead(BaseModel):
    id: int
    nome: str
    email: str
    celular: str
    foto_url: Optional[str]
    tipo: str = "cliente"
    empresa_id: Optional[int] = None
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Empresa ──────────────────────────────────────────────────────────────────
class EmpresaCreate(BaseModel):
    nome_fantasia: str
    cnpj: str
    email: str
    telefone: str


class EmpresaRead(EmpresaCreate):
    id: int
    aprovado: bool
    ativo: bool
    plano_expira_em: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RegistroAdminResponse(BaseModel):
    message: str


# ─── Barbearia ────────────────────────────────────────────────────────────────
class BarbeariaCreate(BaseModel):
    nome: str
    slug: str
    endereco_completo: str
    cidade: Optional[str] = None
    bairro: Optional[str] = None
    latitude: float
    longitude: float
    foto_url: Optional[str] = None
    horario_abertura: str = "08:00"
    horario_fechamento: str = "20:00"
    empresa_id: int

    @field_validator("slug")
    @classmethod
    def validar_slug(cls, value: str) -> str:
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", value):
            raise ValueError("Slug deve conter apenas letras minúsculas, números e hífen.")
        return value

    @field_validator("cidade", "bairro", "nome", "endereco_completo", mode="before")
    @classmethod
    def limpar_textos(cls, value):
        if value is None:
            return value
        texto = str(value).strip()
        return texto if texto else None

    @model_validator(mode="after")
    def validar_horarios(self):
        if self.horario_abertura >= self.horario_fechamento:
            raise ValueError("Horario de abertura deve ser menor que o de fechamento.")
        return self


class BarbeariaRead(BaseModel):
    id: int
    nome: str
    slug: str
    endereco_completo: str
    cidade: Optional[str]
    bairro: Optional[str]
    latitude: float
    longitude: float
    foto_url: Optional[str]
    horario_abertura: str
    horario_fechamento: str
    avaliacao: float
    ativo: bool
    aberta_agora: bool = True
    empresa_id: int

    class Config:
        from_attributes = True


class BarbeariaDetalhada(BarbeariaRead):
    barbeiros: List["BarbeiroRead"] = []
    servicos: List["ServicoRead"] = []


# ─── Barbeiro ─────────────────────────────────────────────────────────────────
class BarbeiroCreate(BaseModel):
    nome: str
    foto_url: Optional[str] = None
    especialidade: Optional[str] = None
    servico_ids: Optional[List[int]] = None
    barbearia_id: int


class BarbeiroRead(BaseModel):
    id: int
    nome: str
    foto_url: Optional[str]
    especialidade: Optional[str]
    servico_ids: List[int] = []
    ativo: bool
    barbearia_id: int

    class Config:
        from_attributes = True


# ─── Serviço ──────────────────────────────────────────────────────────────────
class ServicoCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    preco: float
    duracao_minutos: int
    barbearia_id: int


class ServicoRead(BaseModel):
    id: int
    nome: str
    descricao: Optional[str]
    preco: float
    duracao_minutos: int
    barbearia_id: int

    class Config:
        from_attributes = True


# ─── Agendamento ──────────────────────────────────────────────────────────────
class AgendamentoCreate(BaseModel):
    data: date
    hora: str
    barbearia_id: int
    barbeiro_id: int
    servico_id: Optional[int] = None
    servico_ids: Optional[List[int]] = None
    observacao: Optional[str] = None


class AgendamentoRead(BaseModel):
    id: int
    data: date
    hora: str
    status: str
    observacao: Optional[str]
    created_at: Optional[datetime]
    cliente_id: int
    barbearia_id: int
    barbeiro_id: int
    servico_id: int
    servico_ids: List[int] = []

    class Config:
        from_attributes = True


class AgendamentoDetalhado(AgendamentoRead):
    cliente: Optional[UsuarioRead] = None
    barbearia: Optional[BarbeariaRead] = None
    barbeiro: Optional[BarbeiroRead] = None
    servico: Optional[ServicoRead] = None
    servicos: List[ServicoRead] = []


class AgendamentoStatusUpdate(BaseModel):
    status: str  # confirmado | concluido | cancelado


# Resolve forward references
BarbeariaDetalhada.model_rebuild()


# ─── Admin ────────────────────────────────────────────────────────────────────
class AdminRegistroRequest(BaseModel):
    # Dados do usuário admin
    nome: str
    email: str
    celular: str
    senha: str
    # Dados da empresa
    empresa_nome: str
    empresa_cnpj: str
    empresa_email: str
    empresa_telefone: str
    # Dados da barbearia
    barbearia_nome: str
    barbearia_slug: str
    endereco_completo: str
    latitude: float
    longitude: float
    horario_abertura: str = "08:00"
    horario_fechamento: str = "20:00"

    @field_validator("celular", "empresa_telefone")
    @classmethod
    def validar_telefone(cls, value: str) -> str:
        digits = re.sub(r"\D", "", value)
        if len(digits) < 10:
            raise ValueError("Telefone deve ter ao menos 10 dígitos.")
        return value

    @field_validator("barbearia_slug")
    @classmethod
    def validar_slug_admin(cls, value: str) -> str:
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", value):
            raise ValueError("Slug deve conter apenas letras minúsculas, números e hífen.")
        return value

    @field_validator("senha")
    @classmethod
    def validar_senha_admin(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Senha deve ter no minimo 8 caracteres.")
        if not re.search(r"[A-Z]", value):
            raise ValueError("Senha deve conter ao menos uma letra maiuscula.")
        if not re.search(r"[a-z]", value):
            raise ValueError("Senha deve conter ao menos uma letra minuscula.")
        if not re.search(r"\d", value):
            raise ValueError("Senha deve conter ao menos um numero.")
        return value

    @model_validator(mode="after")
    def validar_horarios_admin(self):
        if self.horario_abertura >= self.horario_fechamento:
            raise ValueError("Horario de abertura deve ser menor que o de fechamento.")
        return self


class BarbeariaUpdate(BaseModel):
    nome: Optional[str] = None
    slug: Optional[str] = None
    endereco_completo: Optional[str] = None
    cidade: Optional[str] = None
    bairro: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    foto_url: Optional[str] = None
    horario_abertura: Optional[str] = None
    horario_fechamento: Optional[str] = None

    @field_validator("slug")
    @classmethod
    def validar_slug_update(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", value):
            raise ValueError("Slug deve conter apenas letras minúsculas, números e hífen.")
        return value

    @field_validator("cidade", "bairro", "nome", "endereco_completo", mode="before")
    @classmethod
    def limpar_textos_update(cls, value):
        if value is None:
            return value
        texto = str(value).strip()
        return texto if texto else None


class BarbeariaStatusToggle(BaseModel):
    aberta_agora: bool


class BarbeiroCreateAdmin(BaseModel):
    nome: str
    foto_url: Optional[str] = None
    especialidade: Optional[str] = None
    servico_ids: Optional[List[int]] = None


class BarbeiroUpdate(BaseModel):
    nome: Optional[str] = None
    foto_url: Optional[str] = None
    especialidade: Optional[str] = None
    servico_ids: Optional[List[int]] = None
    ativo: Optional[bool] = None


class ServicoCreateAdmin(BaseModel):
    nome: str
    descricao: Optional[str] = None
    preco: float
    duracao_minutos: int


class ServicoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    preco: Optional[float] = None
    duracao_minutos: Optional[int] = None


class DashboardStats(BaseModel):
    agendamentos_hoje: int
    agendamentos_pendentes: int
    receita_hoje: float
    receita_mes: float
    agendamentos_semana: int
    receita_semana: float
    barbeiros_ativos: int


# ─── Master (Super Admin) ──────────────────────────────────────────────────────
class EmpresaStatusUpdate(BaseModel):
    ativo: bool
    plano_expira_em: Optional[datetime] = None  # None = não altera


class EmpresaMasterRead(BaseModel):
    """Visão enriquecida de uma empresa para o super admin."""
    id: int
    nome_fantasia: str
    cnpj: str
    email: str
    telefone: str
    aprovado: bool
    ativo: bool
    plano_expira_em: Optional[datetime]
    created_at: Optional[datetime]
    # Dados agregados
    barbearia_nome: Optional[str]       # Nome da primeira barbearia
    admin_nome: Optional[str]           # Nome do admin da empresa
    total_agendamentos: int
    total_receita: float

    class Config:
        from_attributes = True


class PlatformStats(BaseModel):
    total_empresas: int
    empresas_ativas: int
    total_barbearias: int
    total_usuarios_clientes: int
    total_agendamentos: int
    receita_total_plataforma: float


class AuditLogRead(BaseModel):
    id: int
    usuario_id: Optional[int]
    acao: str
    entidade: str
    entidade_id: Optional[int]
    detalhes: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Disponibilidade e Bloqueio de Barbeiro ───────────────────────────────────
class BarbeiroDisponibilidadeCreate(BaseModel):
    dia_semana: int   # 0=segunda … 6=domingo
    hora_inicio: str  # "09:00"
    hora_fim: str     # "18:00"


class BarbeiroDisponibilidadeRead(BarbeiroDisponibilidadeCreate):
    id: int

    class Config:
        from_attributes = True


class BarbeiroBloqueioCreate(BaseModel):
    data: date
    hora_inicio: Optional[str] = None  # None = dia inteiro
    hora_fim: Optional[str] = None
    motivo: Optional[str] = None


class BarbeiroBloqueioRead(BarbeiroBloqueioCreate):
    id: int
    barbeiro_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Pagamento ────────────────────────────────────────────────────────────────
class PagamentoRead(BaseModel):
    id: int
    agendamento_id: int
    valor_total: float
    valor_estornado: float
    status: str
    descricao: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class PagamentoDetalhado(PagamentoRead):
    agendamento: Optional["AgendamentoDetalhado"] = None


# ─── Reagendamento ────────────────────────────────────────────────────────────
class AgendamentoReagendar(BaseModel):
    nova_data: date
    nova_hora: str


class AgendamentoReagendarResponse(BaseModel):
    agendamento: AgendamentoRead
    taxa_cobrada: bool
    valor_taxa: float
    pagamento_taxa: Optional[PagamentoRead] = None


# Resolve forward references de schemas com referências circulares
PagamentoDetalhado.model_rebuild()
