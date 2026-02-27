from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date, datetime, timedelta
import json

from backend.database import get_session
from backend.models import Usuario, Empresa, Barbearia, Barbeiro, Servico, Agendamento, Pagamento, AuditLog
from backend.schemas import (
    AdminRegistroRequest, LoginRequest, TokenResponse, RegistroAdminResponse,
    UsuarioRead, BarbeariaRead, BarbeariaUpdate, BarbeariaStatusToggle,
    BarbeiroRead, BarbeiroCreateAdmin, BarbeiroUpdate,
    BarbeiroDisponibilidadeCreate, BarbeiroDisponibilidadeRead,
    BarbeiroBloqueioCreate, BarbeiroBloqueioRead,
    ServicoRead, ServicoCreateAdmin, ServicoUpdate,
    AgendamentoDetalhado, AgendamentoStatusUpdate,
    DashboardStats, PagamentoDetalhado,
)
from backend.models import BarbeiroDisponibilidade, BarbeiroBloqueio
from backend.auth import hash_senha, verificar_senha, criar_token, get_usuario_atual
from backend.rate_limit import check_rate_limit

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── Helpers ──────────────────────────────────────────────────────────────────
def _verificar_empresa_ativa(empresa_id: Optional[int], session: Session) -> None:
    """Levanta 403 se a empresa estiver bloqueada ou com plano expirado."""
    if empresa_id is None:
        return
    empresa = session.get(Empresa, empresa_id)
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    if not empresa.aprovado:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta aguardando aprovação do administrador da plataforma.",
        )
    if not empresa.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Empresa suspensa. Entre em contato com o suporte.",
        )
    if empresa.plano_expira_em and empresa.plano_expira_em < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Plano expirado. Renove sua assinatura para continuar.",
        )


# ─── Dependency: apenas admins ────────────────────────────────────────────────
def get_admin_atual(
    usuario: Usuario = Depends(get_usuario_atual),
    session: Session = Depends(get_session),
) -> Usuario:
    if usuario.tipo != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores.",
        )
    _verificar_empresa_ativa(usuario.empresa_id, session)
    return usuario


def get_barbearia_do_admin(
    admin: Usuario = Depends(get_admin_atual),
    session: Session = Depends(get_session),
) -> Barbearia:
    barbearia = session.exec(
        select(Barbearia).where(Barbearia.empresa_id == admin.empresa_id)
    ).first()
    if not barbearia:
        raise HTTPException(status_code=404, detail="Barbearia não encontrada.")
    return barbearia


def _resolver_servicos_barbeiro(
    session: Session,
    barbearia_id: int,
    servico_ids: Optional[List[int]],
) -> List[Servico]:
    servicos_barbearia = session.exec(
        select(Servico).where(Servico.barbearia_id == barbearia_id)
    ).all()
    if servico_ids is None:
        return servicos_barbearia

    ids_unicos = list(dict.fromkeys(servico_ids))
    servicos_validos = [s for s in servicos_barbearia if s.id in ids_unicos]
    if len(servicos_validos) != len(ids_unicos):
        raise HTTPException(status_code=400, detail="Servico invalido para esta barbearia.")
    return servicos_validos


def _auditar(
    session: Session,
    admin: Usuario,
    acao: str,
    entidade: str,
    entidade_id: Optional[int] = None,
    detalhes: Optional[dict] = None,
) -> None:
    log = AuditLog(
        usuario_id=admin.id,
        acao=acao,
        entidade=entidade,
        entidade_id=entidade_id,
        detalhes=json.dumps(detalhes, ensure_ascii=False) if detalhes else None,
    )
    session.add(log)


# ─── Auth ─────────────────────────────────────────────────────────────────────
@router.post("/registro", response_model=RegistroAdminResponse, status_code=201)
def registro_admin(
    body: AdminRegistroRequest,
    request: Request,
    session: Session = Depends(get_session),
):
    """Cria conta admin + empresa + barbearia. Fica pendente ate aprovacao do super_admin."""
    check_rate_limit(request, scope="admin_register", max_attempts=10, window_seconds=60)
    if session.exec(select(Usuario).where(Usuario.email == body.email)).first():
        raise HTTPException(status_code=400, detail="E-mail já cadastrado.")

    slug_existente = session.exec(
        select(Barbearia).where(Barbearia.slug == body.barbearia_slug)
    ).first()
    if slug_existente:
        raise HTTPException(status_code=400, detail="Slug da barbearia já está em uso.")

    # Cria empresa
    empresa = Empresa(
        nome_fantasia=body.empresa_nome,
        cnpj=body.empresa_cnpj,
        email=body.empresa_email,
        telefone=body.empresa_telefone,
    )
    session.add(empresa)
    session.commit()
    session.refresh(empresa)

    # Cria barbearia
    barbearia = Barbearia(
        nome=body.barbearia_nome,
        slug=body.barbearia_slug,
        endereco_completo=body.endereco_completo,
        latitude=body.latitude,
        longitude=body.longitude,
        horario_abertura=body.horario_abertura,
        horario_fechamento=body.horario_fechamento,
        empresa_id=empresa.id,
    )
    session.add(barbearia)
    session.commit()
    session.refresh(barbearia)

    # Cria usuário admin
    usuario = Usuario(
        nome=body.nome,
        email=body.email,
        celular=body.celular,
        senha_hash=hash_senha(body.senha),
        tipo="admin",
        empresa_id=empresa.id,
    )
    session.add(usuario)
    session.commit()

    return RegistroAdminResponse(
        message="Cadastro realizado com sucesso! Aguarde a aprovação do administrador da plataforma para acessar o painel."
    )


@router.post("/login", response_model=TokenResponse)
def login_admin(body: LoginRequest, request: Request, session: Session = Depends(get_session)):
    check_rate_limit(request, scope="admin_login")
    usuario = session.exec(select(Usuario).where(Usuario.email == body.email)).first()
    if not usuario or not verificar_senha(body.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")
    if usuario.tipo != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")
    # Bloqueia login se empresa estiver suspensa/expirada
    _verificar_empresa_ativa(usuario.empresa_id, session)
    token = criar_token({"sub": str(usuario.id)})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UsuarioRead)
def admin_me(admin: Usuario = Depends(get_admin_atual)):
    return admin


@router.post("/refresh", response_model=TokenResponse)
def refresh_token_admin(admin: Usuario = Depends(get_admin_atual)):
    token = criar_token({"sub": str(admin.id)})
    return TokenResponse(access_token=token)


# ─── Dashboard ────────────────────────────────────────────────────────────────
@router.get("/dashboard", response_model=DashboardStats)
def dashboard(
    admin: Usuario = Depends(get_admin_atual),
    session: Session = Depends(get_session),
):
    barbearia = get_barbearia_do_admin(admin, session)
    hoje = date.today()
    mes_atual = hoje.month
    ano_atual = hoje.year
    inicio_semana = hoje - timedelta(days=hoje.weekday())  # segunda-feira

    todos_agendamentos = session.exec(
        select(Agendamento)
        .options(selectinload(Agendamento.servico))
        .where(Agendamento.barbearia_id == barbearia.id)
    ).all()

    agendamentos_hoje_list = [
        a for a in todos_agendamentos
        if a.data == hoje and a.status != "cancelado"
    ]
    agendamentos_mes_list = [
        a for a in todos_agendamentos
        if a.data.month == mes_atual and a.data.year == ano_atual and a.status == "concluido"
    ]
    agendamentos_semana_list = [
        a for a in todos_agendamentos
        if inicio_semana <= a.data <= hoje and a.status != "cancelado"
    ]
    pendentes = [a for a in todos_agendamentos if a.status == "pendente"]

    barbeiros_ativos = session.exec(
        select(Barbeiro).where(
            Barbeiro.barbearia_id == barbearia.id,
            Barbeiro.ativo == True,
        )
    ).all()

    receita_hoje = sum(
        a.servico.preco for a in agendamentos_hoje_list
        if a.servico and a.status == "concluido"
    )
    receita_mes = sum(a.servico.preco for a in agendamentos_mes_list if a.servico)
    receita_semana = sum(
        a.servico.preco for a in agendamentos_semana_list
        if a.servico and a.status == "concluido"
    )

    return DashboardStats(
        agendamentos_hoje=len(agendamentos_hoje_list),
        agendamentos_pendentes=len(pendentes),
        receita_hoje=receita_hoje,
        receita_mes=receita_mes,
        agendamentos_semana=len(agendamentos_semana_list),
        receita_semana=receita_semana,
        barbeiros_ativos=len(barbeiros_ativos),
    )


# ─── Barbearia ────────────────────────────────────────────────────────────────
@router.get("/barbearia", response_model=BarbeariaRead)
def get_barbearia(
    admin: Usuario = Depends(get_admin_atual),
    session: Session = Depends(get_session),
):
    return get_barbearia_do_admin(admin, session)


@router.put("/barbearia", response_model=BarbeariaRead)
def update_barbearia(
    body: BarbeariaUpdate,
    admin: Usuario = Depends(get_admin_atual),
    session: Session = Depends(get_session),
):
    barbearia = get_barbearia_do_admin(admin, session)

    if body.slug and body.slug != barbearia.slug:
        conflito = session.exec(
            select(Barbearia).where(Barbearia.slug == body.slug)
        ).first()
        if conflito:
            raise HTTPException(status_code=400, detail="Slug já está em uso.")

    dados = body.model_dump(exclude_unset=True)
    for campo, valor in dados.items():
        setattr(barbearia, campo, valor)

    session.add(barbearia)
    _auditar(
        session,
        admin,
        acao="update",
        entidade="barbearia",
        entidade_id=barbearia.id,
        detalhes=dados,
    )
    session.commit()
    session.refresh(barbearia)
    return barbearia


# ─── Barbeiros ────────────────────────────────────────────────────────────────
@router.get("/barbeiros", response_model=List[BarbeiroRead])
def listar_barbeiros(
    admin: Usuario = Depends(get_admin_atual),
    session: Session = Depends(get_session),
):
    barbearia = get_barbearia_do_admin(admin, session)
    return session.exec(
        select(Barbeiro)
        .options(selectinload(Barbeiro.servicos))
        .where(Barbeiro.barbearia_id == barbearia.id)
    ).all()


@router.post("/barbeiros", response_model=BarbeiroRead, status_code=201)
def criar_barbeiro(
    body: BarbeiroCreateAdmin,
    admin: Usuario = Depends(get_admin_atual),
    session: Session = Depends(get_session),
):
    barbearia = get_barbearia_do_admin(admin, session)
    barbeiro = Barbeiro(
        nome=body.nome,
        foto_url=body.foto_url,
        especialidade=body.especialidade,
        barbearia_id=barbearia.id,
    )
    barbeiro.servicos = _resolver_servicos_barbeiro(session, barbearia.id, body.servico_ids)
    session.add(barbeiro)
    session.commit()
    session.refresh(barbeiro)
    _auditar(
        session,
        admin,
        acao="create",
        entidade="barbeiro",
        entidade_id=barbeiro.id,
        detalhes={"nome": barbeiro.nome, "servico_ids": barbeiro.servico_ids},
    )
    session.commit()
    return barbeiro


@router.put("/barbeiros/{barbeiro_id}", response_model=BarbeiroRead)
def update_barbeiro(
    barbeiro_id: int,
    body: BarbeiroUpdate,
    admin: Usuario = Depends(get_admin_atual),
    session: Session = Depends(get_session),
):
    barbearia = get_barbearia_do_admin(admin, session)
    barbeiro = session.get(Barbeiro, barbeiro_id)
    if not barbeiro or barbeiro.barbearia_id != barbearia.id:
        raise HTTPException(status_code=404, detail="Barbeiro não encontrado.")

    dados = body.model_dump(exclude_unset=True, exclude={"servico_ids"})
    for campo, valor in dados.items():
        setattr(barbeiro, campo, valor)
    if "servico_ids" in body.model_fields_set:
        barbeiro.servicos = _resolver_servicos_barbeiro(session, barbearia.id, body.servico_ids)

    session.add(barbeiro)
    detalhes_update = {**dados}
    if "servico_ids" in body.model_fields_set:
        detalhes_update["servico_ids"] = barbeiro.servico_ids
    _auditar(
        session,
        admin,
        acao="update",
        entidade="barbeiro",
        entidade_id=barbeiro.id,
        detalhes=detalhes_update,
    )
    session.commit()
    session.refresh(barbeiro)
    return barbeiro


@router.delete("/barbeiros/{barbeiro_id}", status_code=204)
def desativar_barbeiro(
    barbeiro_id: int,
    admin: Usuario = Depends(get_admin_atual),
    session: Session = Depends(get_session),
):
    barbearia = get_barbearia_do_admin(admin, session)
    barbeiro = session.get(Barbeiro, barbeiro_id)
    if not barbeiro or barbeiro.barbearia_id != barbearia.id:
        raise HTTPException(status_code=404, detail="Barbeiro não encontrado.")

    barbeiro.ativo = False
    session.add(barbeiro)
    _auditar(
        session,
        admin,
        acao="deactivate",
        entidade="barbeiro",
        entidade_id=barbeiro.id,
        detalhes={"ativo": False},
    )
    session.commit()


# ─── Serviços ─────────────────────────────────────────────────────────────────
@router.get("/servicos", response_model=List[ServicoRead])
def listar_servicos(
    admin: Usuario = Depends(get_admin_atual),
    session: Session = Depends(get_session),
):
    barbearia = get_barbearia_do_admin(admin, session)
    return session.exec(
        select(Servico).where(Servico.barbearia_id == barbearia.id)
    ).all()


@router.post("/servicos", response_model=ServicoRead, status_code=201)
def criar_servico(
    body: ServicoCreateAdmin,
    admin: Usuario = Depends(get_admin_atual),
    session: Session = Depends(get_session),
):
    barbearia = get_barbearia_do_admin(admin, session)
    servico = Servico(
        nome=body.nome,
        descricao=body.descricao,
        preco=body.preco,
        duracao_minutos=body.duracao_minutos,
        barbearia_id=barbearia.id,
    )
    session.add(servico)
    session.commit()
    session.refresh(servico)
    _auditar(
        session,
        admin,
        acao="create",
        entidade="servico",
        entidade_id=servico.id,
        detalhes={"nome": servico.nome, "preco": servico.preco, "duracao_minutos": servico.duracao_minutos},
    )
    session.commit()
    return servico


@router.put("/servicos/{servico_id}", response_model=ServicoRead)
def update_servico(
    servico_id: int,
    body: ServicoUpdate,
    admin: Usuario = Depends(get_admin_atual),
    session: Session = Depends(get_session),
):
    barbearia = get_barbearia_do_admin(admin, session)
    servico = session.get(Servico, servico_id)
    if not servico or servico.barbearia_id != barbearia.id:
        raise HTTPException(status_code=404, detail="Serviço não encontrado.")

    dados = body.model_dump(exclude_unset=True)
    for campo, valor in dados.items():
        setattr(servico, campo, valor)

    session.add(servico)
    _auditar(
        session,
        admin,
        acao="update",
        entidade="servico",
        entidade_id=servico.id,
        detalhes=dados,
    )
    session.commit()
    session.refresh(servico)
    return servico


@router.delete("/servicos/{servico_id}", status_code=204)
def excluir_servico(
    servico_id: int,
    admin: Usuario = Depends(get_admin_atual),
    session: Session = Depends(get_session),
):
    barbearia = get_barbearia_do_admin(admin, session)
    servico = session.get(Servico, servico_id)
    if not servico or servico.barbearia_id != barbearia.id:
        raise HTTPException(status_code=404, detail="Serviço não encontrado.")

    nome_servico = servico.nome
    session.delete(servico)
    _auditar(
        session,
        admin,
        acao="delete",
        entidade="servico",
        entidade_id=servico_id,
        detalhes={"nome": nome_servico},
    )
    session.commit()


# ─── Agendamentos ─────────────────────────────────────────────────────────────
@router.get("/agendamentos", response_model=List[AgendamentoDetalhado])
def listar_agendamentos(
    data: Optional[str] = Query(None, description="Filtrar por data YYYY-MM-DD"),
    status_filtro: Optional[str] = Query(None, alias="status"),
    admin: Usuario = Depends(get_admin_atual),
    session: Session = Depends(get_session),
):
    barbearia = get_barbearia_do_admin(admin, session)

    stmt = (
        select(Agendamento)
        .options(
            selectinload(Agendamento.cliente),
            selectinload(Agendamento.barbeiro),
            selectinload(Agendamento.servico),
            selectinload(Agendamento.barbearia),
        )
        .where(Agendamento.barbearia_id == barbearia.id)
    )

    if data:
        stmt = stmt.where(Agendamento.data == data)
    if status_filtro:
        stmt = stmt.where(Agendamento.status == status_filtro)

    stmt = stmt.order_by(Agendamento.data, Agendamento.hora)
    return session.exec(stmt).all()


@router.patch("/agendamentos/{agendamento_id}/status", response_model=AgendamentoDetalhado)
def atualizar_status_admin(
    agendamento_id: int,
    body: AgendamentoStatusUpdate,
    admin: Usuario = Depends(get_admin_atual),
    session: Session = Depends(get_session),
):
    barbearia = get_barbearia_do_admin(admin, session)
    agendamento = session.exec(
        select(Agendamento)
        .options(
            selectinload(Agendamento.cliente),
            selectinload(Agendamento.barbeiro),
            selectinload(Agendamento.servico),
            selectinload(Agendamento.barbearia),
        )
        .where(Agendamento.id == agendamento_id)
    ).first()

    if not agendamento or agendamento.barbearia_id != barbearia.id:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")

    status_validos = {"confirmado", "concluido", "cancelado"}
    if body.status not in status_validos:
        raise HTTPException(status_code=400, detail=f"Status inválido. Use: {status_validos}")

    agendamento.status = body.status
    session.add(agendamento)
    _auditar(
        session,
        admin,
        acao="update_status",
        entidade="agendamento",
        entidade_id=agendamento.id,
        detalhes={"status": body.status},
    )
    session.commit()
    session.refresh(agendamento)
    return agendamento


# ─── Status da Barbearia (aberta/fechada) ─────────────────────────────────────
@router.patch("/barbearia/status", response_model=BarbeariaRead)
def toggle_status_barbearia(
    body: BarbeariaStatusToggle,
    admin: Usuario = Depends(get_admin_atual),
    session: Session = Depends(get_session),
):
    barbearia = get_barbearia_do_admin(admin, session)
    barbearia.aberta_agora = body.aberta_agora
    session.add(barbearia)
    _auditar(
        session,
        admin,
        acao="toggle_status",
        entidade="barbearia",
        entidade_id=barbearia.id,
        detalhes={"aberta_agora": body.aberta_agora},
    )
    session.commit()
    session.refresh(barbearia)
    return barbearia


# ─── Disponibilidade dos Barbeiros ────────────────────────────────────────────
@router.get("/barbeiros/{barbeiro_id}/disponibilidade", response_model=List[BarbeiroDisponibilidadeRead])
def get_disponibilidade(
    barbeiro_id: int,
    admin: Usuario = Depends(get_admin_atual),
    session: Session = Depends(get_session),
):
    barbearia = get_barbearia_do_admin(admin, session)
    barbeiro = session.get(Barbeiro, barbeiro_id)
    if not barbeiro or barbeiro.barbearia_id != barbearia.id:
        raise HTTPException(status_code=404, detail="Barbeiro não encontrado.")
    return session.exec(
        select(BarbeiroDisponibilidade).where(BarbeiroDisponibilidade.barbeiro_id == barbeiro_id)
        .order_by(BarbeiroDisponibilidade.dia_semana)
    ).all()


@router.put("/barbeiros/{barbeiro_id}/disponibilidade", response_model=List[BarbeiroDisponibilidadeRead])
def update_disponibilidade(
    barbeiro_id: int,
    body: List[BarbeiroDisponibilidadeCreate],
    admin: Usuario = Depends(get_admin_atual),
    session: Session = Depends(get_session),
):
    """Substitui toda a disponibilidade do barbeiro pelos dias enviados."""
    barbearia = get_barbearia_do_admin(admin, session)
    barbeiro = session.get(Barbeiro, barbeiro_id)
    if not barbeiro or barbeiro.barbearia_id != barbearia.id:
        raise HTTPException(status_code=404, detail="Barbeiro não encontrado.")

    # Remove os existentes
    existentes = session.exec(
        select(BarbeiroDisponibilidade).where(BarbeiroDisponibilidade.barbeiro_id == barbeiro_id)
    ).all()
    for d in existentes:
        session.delete(d)
    session.commit()

    # Insere os novos
    novos = []
    for item in body:
        d = BarbeiroDisponibilidade(barbeiro_id=barbeiro_id, **item.model_dump())
        session.add(d)
        novos.append(d)
    _auditar(
        session,
        admin,
        acao="update_disponibilidade",
        entidade="barbeiro",
        entidade_id=barbeiro_id,
        detalhes={"dias_configurados": len(body)},
    )
    session.commit()
    for d in novos:
        session.refresh(d)
    return novos


# ─── Bloqueios pontuais dos Barbeiros ─────────────────────────────────────────
@router.get("/barbeiros/{barbeiro_id}/bloqueios", response_model=List[BarbeiroBloqueioRead])
def get_bloqueios(
    barbeiro_id: int,
    admin: Usuario = Depends(get_admin_atual),
    session: Session = Depends(get_session),
):
    barbearia = get_barbearia_do_admin(admin, session)
    barbeiro = session.get(Barbeiro, barbeiro_id)
    if not barbeiro or barbeiro.barbearia_id != barbearia.id:
        raise HTTPException(status_code=404, detail="Barbeiro não encontrado.")
    return session.exec(
        select(BarbeiroBloqueio)
        .where(BarbeiroBloqueio.barbeiro_id == barbeiro_id)
        .order_by(BarbeiroBloqueio.data)
    ).all()


@router.post("/barbeiros/{barbeiro_id}/bloqueios", response_model=BarbeiroBloqueioRead, status_code=201)
def criar_bloqueio(
    barbeiro_id: int,
    body: BarbeiroBloqueioCreate,
    admin: Usuario = Depends(get_admin_atual),
    session: Session = Depends(get_session),
):
    barbearia = get_barbearia_do_admin(admin, session)
    barbeiro = session.get(Barbeiro, barbeiro_id)
    if not barbeiro or barbeiro.barbearia_id != barbearia.id:
        raise HTTPException(status_code=404, detail="Barbeiro não encontrado.")
    bloqueio = BarbeiroBloqueio(barbeiro_id=barbeiro_id, **body.model_dump())
    session.add(bloqueio)
    session.commit()
    session.refresh(bloqueio)
    _auditar(
        session,
        admin,
        acao="create_bloqueio",
        entidade="barbeiro_bloqueio",
        entidade_id=bloqueio.id,
        detalhes={"barbeiro_id": barbeiro_id, "data": str(bloqueio.data)},
    )
    session.commit()
    return bloqueio


@router.delete("/barbeiros/bloqueios/{bloqueio_id}", status_code=204)
def remover_bloqueio(
    bloqueio_id: int,
    admin: Usuario = Depends(get_admin_atual),
    session: Session = Depends(get_session),
):
    barbearia = get_barbearia_do_admin(admin, session)
    bloqueio = session.get(BarbeiroBloqueio, bloqueio_id)
    if not bloqueio:
        raise HTTPException(status_code=404, detail="Bloqueio não encontrado.")
    # Verifica que o barbeiro pertence à barbearia do admin
    barbeiro = session.get(Barbeiro, bloqueio.barbeiro_id)
    if not barbeiro or barbeiro.barbearia_id != barbearia.id:
        raise HTTPException(status_code=403, detail="Acesso negado.")
    _auditar(
        session,
        admin,
        acao="delete_bloqueio",
        entidade="barbeiro_bloqueio",
        entidade_id=bloqueio.id,
        detalhes={"barbeiro_id": bloqueio.barbeiro_id, "data": str(bloqueio.data)},
    )
    session.delete(bloqueio)
    session.commit()


# ─── Pagamentos ────────────────────────────────────────────────────────────────
@router.get("/pagamentos", response_model=List[PagamentoDetalhado])
def listar_pagamentos(
    status_filtro: Optional[str] = Query(None, alias="status"),
    admin: Usuario = Depends(get_admin_atual),
    session: Session = Depends(get_session),
):
    """Lista todos os pagamentos da barbearia com dados do agendamento, cliente, serviço e barbeiro."""
    barbearia = get_barbearia_do_admin(admin, session)

    stmt = (
        select(Pagamento)
        .join(Agendamento, Pagamento.agendamento_id == Agendamento.id)
        .options(
            selectinload(Pagamento.agendamento).selectinload(Agendamento.cliente),
            selectinload(Pagamento.agendamento).selectinload(Agendamento.servico),
            selectinload(Pagamento.agendamento).selectinload(Agendamento.barbeiro),
        )
        .where(Agendamento.barbearia_id == barbearia.id)
        .order_by(Pagamento.created_at.desc())
    )

    if status_filtro:
        stmt = stmt.where(Pagamento.status == status_filtro)

    return session.exec(stmt).all()


