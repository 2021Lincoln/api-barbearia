"""
Router Master — exclusivo para o super_admin (dono da plataforma).
Prefixo: /master | Tag: Master
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime

from backend.database import get_session
from backend.models import (
    Usuario, Empresa, Barbearia, Barbeiro, Agendamento, Servico,
    BarbeiroDisponibilidade, BarbeiroBloqueio, AuditLog,
)
from backend.schemas import (
    LoginRequest, TokenResponse,
    EmpresaMasterRead, EmpresaStatusUpdate,
    PlatformStats,
    UsuarioRead, AuditLogRead,
)
from backend.auth import verificar_senha, criar_token, get_usuario_atual
from backend.rate_limit import check_rate_limit

router = APIRouter(prefix="/master", tags=["Master"])


# ─── Dependency: apenas super_admin ───────────────────────────────────────────
def get_super_admin_atual(
    usuario: Usuario = Depends(get_usuario_atual),
) -> Usuario:
    if usuario.tipo != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito ao super administrador.",
        )
    return usuario


# ─── Auth ─────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
def login_master(body: LoginRequest, request: Request, session: Session = Depends(get_session)):
    """Login exclusivo para super_admin."""
    check_rate_limit(request, scope="master_login")
    usuario = session.exec(select(Usuario).where(Usuario.email == body.email)).first()
    if not usuario or not verificar_senha(body.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")
    if usuario.tipo != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Acesso negado. Use o painel de administrador da barbearia.",
        )
    token = criar_token({"sub": str(usuario.id)})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UsuarioRead)
def master_me(super_admin: Usuario = Depends(get_super_admin_atual)):
    return super_admin


@router.post("/refresh", response_model=TokenResponse)
def refresh_token_master(super_admin: Usuario = Depends(get_super_admin_atual)):
    token = criar_token({"sub": str(super_admin.id)})
    return TokenResponse(access_token=token)


# ─── Helper interno ───────────────────────────────────────────────────────────
def _build_empresa_read(empresa: Empresa, session: Session) -> EmpresaMasterRead:
    """Monta EmpresaMasterRead com dados agregados."""
    barbearia = session.exec(
        select(Barbearia).where(Barbearia.empresa_id == empresa.id)
    ).first()

    admin = session.exec(
        select(Usuario).where(
            Usuario.empresa_id == empresa.id,
            Usuario.tipo == "admin",
        )
    ).first()

    agendamentos = session.exec(
        select(Agendamento)
        .options(selectinload(Agendamento.servico))
        .where(Agendamento.barbearia_id == barbearia.id if barbearia else False)
    ).all() if barbearia else []

    total_receita = sum(
        a.servico.preco for a in agendamentos
        if a.servico and a.status == "concluido"
    )

    return EmpresaMasterRead(
        id=empresa.id,
        nome_fantasia=empresa.nome_fantasia,
        cnpj=empresa.cnpj,
        email=empresa.email,
        telefone=empresa.telefone,
        aprovado=empresa.aprovado,
        ativo=empresa.ativo,
        plano_expira_em=empresa.plano_expira_em,
        created_at=empresa.created_at,
        barbearia_nome=barbearia.nome if barbearia else None,
        admin_nome=admin.nome if admin else None,
        total_agendamentos=len(agendamentos),
        total_receita=total_receita,
    )


# ─── Empresas ─────────────────────────────────────────────────────────────────
@router.get("/empresas", response_model=List[EmpresaMasterRead])
def listar_empresas(
    _: Usuario = Depends(get_super_admin_atual),
    session: Session = Depends(get_session),
):
    """Lista todas as empresas da plataforma com dados consolidados."""
    empresas = session.exec(select(Empresa).order_by(Empresa.created_at.desc())).all()
    return [_build_empresa_read(e, session) for e in empresas]


@router.patch("/empresas/{empresa_id}/status", response_model=EmpresaMasterRead)
def atualizar_status_empresa(
    empresa_id: int,
    body: EmpresaStatusUpdate,
    _: Usuario = Depends(get_super_admin_atual),
    session: Session = Depends(get_session),
):
    """Ativa ou suspende uma empresa. Se `plano_expira_em` for passado, atualiza também."""
    empresa = session.get(Empresa, empresa_id)
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    empresa.ativo = body.ativo
    if body.plano_expira_em is not None:
        empresa.plano_expira_em = body.plano_expira_em

    session.add(empresa)
    session.commit()
    session.refresh(empresa)
    return _build_empresa_read(empresa, session)


# ─── Aprovar / Rejeitar Empresa ───────────────────────────────────────────────
@router.post("/empresas/{empresa_id}/aprovar", response_model=EmpresaMasterRead)
def aprovar_empresa(
    empresa_id: int,
    _: Usuario = Depends(get_super_admin_atual),
    session: Session = Depends(get_session),
):
    """Aprova o cadastro de uma empresa pendente, liberando o acesso do admin."""
    empresa = session.get(Empresa, empresa_id)
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    if empresa.aprovado:
        raise HTTPException(status_code=400, detail="Empresa já está aprovada.")

    empresa.aprovado = True
    empresa.ativo = True
    session.add(empresa)
    session.commit()
    session.refresh(empresa)
    return _build_empresa_read(empresa, session)


@router.delete("/empresas/{empresa_id}", status_code=204)
def rejeitar_empresa(
    empresa_id: int,
    _: Usuario = Depends(get_super_admin_atual),
    session: Session = Depends(get_session),
):
    """Rejeita e remove uma empresa pendente junto com sua barbearia e usuário admin."""
    empresa = session.get(Empresa, empresa_id)
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")
    if empresa.aprovado:
        raise HTTPException(status_code=400, detail="Não é possível excluir uma empresa já aprovada.")

    # Remove barbearias e dependências
    barbearias = session.exec(select(Barbearia).where(Barbearia.empresa_id == empresa_id)).all()
    for b in barbearias:
        barbeiros = session.exec(select(Barbeiro).where(Barbeiro.barbearia_id == b.id)).all()
        for barb in barbeiros:
            for d in session.exec(select(BarbeiroDisponibilidade).where(BarbeiroDisponibilidade.barbeiro_id == barb.id)).all():
                session.delete(d)
            for bl in session.exec(select(BarbeiroBloqueio).where(BarbeiroBloqueio.barbeiro_id == barb.id)).all():
                session.delete(bl)
            session.delete(barb)
        for s in session.exec(select(Servico).where(Servico.barbearia_id == b.id)).all():
            session.delete(s)
        session.delete(b)

    # Remove usuários da empresa
    for u in session.exec(select(Usuario).where(Usuario.empresa_id == empresa_id)).all():
        session.delete(u)

    session.delete(empresa)
    session.commit()


# ─── Stats da Plataforma ──────────────────────────────────────────────────────
@router.get("/stats", response_model=PlatformStats)
def platform_stats(
    _: Usuario = Depends(get_super_admin_atual),
    session: Session = Depends(get_session),
):
    """Visão geral de toda a plataforma."""
    empresas = session.exec(select(Empresa)).all()
    empresas_ativas = [e for e in empresas if e.ativo]

    total_barbearias = len(session.exec(select(Barbearia)).all())

    total_clientes = len(
        session.exec(select(Usuario).where(Usuario.tipo == "cliente")).all()
    )

    agendamentos = session.exec(
        select(Agendamento).options(selectinload(Agendamento.servico))
    ).all()

    receita_total = sum(
        a.servico.preco for a in agendamentos
        if a.servico and a.status == "concluido"
    )

    return PlatformStats(
        total_empresas=len(empresas),
        empresas_ativas=len(empresas_ativas),
        total_barbearias=total_barbearias,
        total_usuarios_clientes=total_clientes,
        total_agendamentos=len(agendamentos),
        receita_total_plataforma=receita_total,
    )


@router.get("/audit-logs", response_model=List[AuditLogRead])
def listar_audit_logs(
    entidade: Optional[str] = Query(None),
    usuario_id: Optional[int] = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    _: Usuario = Depends(get_super_admin_atual),
    session: Session = Depends(get_session),
):
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc())
    if entidade:
        stmt = stmt.where(AuditLog.entidade == entidade)
    if usuario_id:
        stmt = stmt.where(AuditLog.usuario_id == usuario_id)
    stmt = stmt.limit(limit)
    return session.exec(stmt).all()
