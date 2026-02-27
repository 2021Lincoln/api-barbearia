from datetime import date, datetime, time as dt_time
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from backend.auth import get_usuario_atual
from backend.database import get_session
from backend.rate_limit import check_rate_limit
from backend.models import (
    Agendamento,
    Barbeiro,
    BarbeiroBloqueio,
    BarbeiroDisponibilidade,
    Barbearia,
    Pagamento,
    Servico,
    Usuario,
)
from backend.schemas import (
    AgendamentoCreate,
    AgendamentoDetalhado,
    AgendamentoRead,
    AgendamentoReagendar,
    AgendamentoReagendarResponse,
    AgendamentoStatusUpdate,
)

router = APIRouter(prefix="/agendamentos", tags=["Agendamentos"])

# Horarios base da plataforma (30 em 30 minutos)
HORARIOS_BASE = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
    "18:00", "18:30", "19:00", "19:30",
]


def _hora_para_minutos(hora: str) -> int:
    h, m = map(int, hora.split(":"))
    return h * 60 + m


def _gerar_slots(hora_inicio: str, hora_fim: str) -> List[str]:
    """Gera lista de slots a cada 30min entre hora_inicio e hora_fim."""
    h_ini = dt_time.fromisoformat(hora_inicio)
    h_fim = dt_time.fromisoformat(hora_fim)
    return [h for h in HORARIOS_BASE if h_ini <= dt_time.fromisoformat(h) < h_fim]


def _slots_no_bloqueio(bloqueio: BarbeiroBloqueio) -> set:
    """Retorna o conjunto de slots cobertos por um bloqueio parcial."""
    if bloqueio.hora_inicio is None:
        return set(HORARIOS_BASE)
    return set(_gerar_slots(bloqueio.hora_inicio, bloqueio.hora_fim or "23:59"))


def _ids_servicos_do_body(body: AgendamentoCreate) -> List[int]:
    if body.servico_ids:
        return list(dict.fromkeys(body.servico_ids))
    if body.servico_id is not None:
        return [body.servico_id]
    return []


def _valor_total_servicos(servicos: List[Servico]) -> float:
    return round(sum(s.preco for s in servicos), 2)


def _duracao_agendamento_minutos(agendamento: Agendamento) -> int:
    if agendamento.servicos:
        return sum(s.duracao_minutos for s in agendamento.servicos)
    if agendamento.servico:
        return agendamento.servico.duracao_minutos
    return 30


def _valor_total_agendamento(session: Session, agendamento_id: int) -> float:
    agendamento = session.exec(
        select(Agendamento)
        .options(selectinload(Agendamento.servicos), selectinload(Agendamento.servico))
        .where(Agendamento.id == agendamento_id)
    ).first()
    if not agendamento:
        return 0.0
    if agendamento.servicos:
        return _valor_total_servicos(agendamento.servicos)
    if agendamento.servico:
        return round(agendamento.servico.preco, 2)
    return 0.0


def _slot_atende_duracao(slot: str, duracao_minutos: int, slots_livres: set[str]) -> bool:
    inicio = _hora_para_minutos(slot)
    total_slots = (duracao_minutos + 29) // 30
    for i in range(total_slots):
        atual = inicio + (i * 30)
        hhmm = f"{atual // 60:02d}:{atual % 60:02d}"
        if hhmm not in slots_livres:
            return False
    return True


@router.get("/horarios-disponiveis")
def horarios_disponiveis(
    barbearia_id: int = Query(...),
    barbeiro_id: int = Query(...),
    data: str = Query(..., description="Data no formato YYYY-MM-DD"),
    duracao_minutos: int = Query(30, ge=30, le=480),
    session: Session = Depends(get_session),
):
    """Retorna horarios livres considerando disponibilidade, bloqueios e duracao."""
    data_obj = date.fromisoformat(data)
    dia_semana = data_obj.weekday()  # 0=segunda ... 6=domingo

    disponibilidades = session.exec(
        select(BarbeiroDisponibilidade).where(
            BarbeiroDisponibilidade.barbeiro_id == barbeiro_id,
            BarbeiroDisponibilidade.dia_semana == dia_semana,
        )
    ).all()

    if disponibilidades:
        slots_base: set[str] = set()
        for d in disponibilidades:
            slots_base.update(_gerar_slots(d.hora_inicio, d.hora_fim))
    else:
        slots_base = set(HORARIOS_BASE)

    if not slots_base:
        return {"data": data, "horarios_livres": []}

    bloqueios = session.exec(
        select(BarbeiroBloqueio).where(
            BarbeiroBloqueio.barbeiro_id == barbeiro_id,
            BarbeiroBloqueio.data == data_obj,
        )
    ).all()

    bloqueados: set[str] = set()
    for b in bloqueios:
        if b.hora_inicio is None:
            return {"data": data, "horarios_livres": []}
        bloqueados.update(_slots_no_bloqueio(b))

    slots_disponiveis = slots_base - bloqueados

    ocupados = session.exec(
        select(Agendamento)
        .options(selectinload(Agendamento.servicos), selectinload(Agendamento.servico))
        .where(
            Agendamento.barbeiro_id == barbeiro_id,
            Agendamento.barbearia_id == barbearia_id,
            Agendamento.data == data_obj,
            Agendamento.status != "cancelado",
        )
    ).all()

    horas_ocupadas: set[str] = set()
    for agendamento in ocupados:
        inicio = _hora_para_minutos(agendamento.hora)
        fim = inicio + _duracao_agendamento_minutos(agendamento)
        for slot in HORARIOS_BASE:
            minutos_slot = _hora_para_minutos(slot)
            if inicio <= minutos_slot < fim:
                horas_ocupadas.add(slot)

    slots_disponiveis -= horas_ocupadas

    livres_base = sorted(
        (s for s in slots_disponiveis if s in HORARIOS_BASE),
        key=lambda h: HORARIOS_BASE.index(h),
    )
    livres = [s for s in livres_base if _slot_atende_duracao(s, duracao_minutos, slots_disponiveis)]
    return {"data": data, "horarios_livres": livres}


@router.post("/", response_model=AgendamentoRead, status_code=201)
def criar_agendamento(
    body: AgendamentoCreate,
    request: Request,
    session: Session = Depends(get_session),
    usuario: Usuario = Depends(get_usuario_atual),
):
    check_rate_limit(request, scope=f"agendamento_create:{usuario.id}", max_attempts=20, window_seconds=60)
    if not session.get(Barbearia, body.barbearia_id):
        raise HTTPException(status_code=404, detail="Barbearia nao encontrada.")

    ids_servicos = _ids_servicos_do_body(body)
    if not ids_servicos:
        raise HTTPException(status_code=400, detail="Selecione ao menos um servico.")

    servicos = session.exec(
        select(Servico).where(
            Servico.barbearia_id == body.barbearia_id,
            Servico.id.in_(ids_servicos),
        )
    ).all()
    if len(servicos) != len(ids_servicos):
        raise HTTPException(status_code=404, detail="Servico nao encontrado.")
    duracao_total = sum(s.duracao_minutos for s in servicos)

    barbeiro = session.exec(
        select(Barbeiro)
        .options(selectinload(Barbeiro.servicos))
        .where(Barbeiro.id == body.barbeiro_id)
    ).first()
    if not barbeiro:
        raise HTTPException(status_code=404, detail="Barbeiro nao encontrado.")
    if barbeiro.barbearia_id != body.barbearia_id:
        raise HTTPException(status_code=400, detail="Barbeiro nao pertence a esta barbearia.")

    servicos_ids_barbeiro = {s.id for s in barbeiro.servicos}
    if any(servico_id not in servicos_ids_barbeiro for servico_id in ids_servicos):
        raise HTTPException(status_code=400, detail="Este barbeiro nao realiza esse servico.")

    if body.hora not in HORARIOS_BASE:
        raise HTTPException(status_code=400, detail="Horario invalido.")

    inicio_novo = _hora_para_minutos(body.hora)
    fim_novo = inicio_novo + duracao_total

    ocupados = session.exec(
        select(Agendamento)
        .options(selectinload(Agendamento.servicos), selectinload(Agendamento.servico))
        .where(
            Agendamento.barbeiro_id == body.barbeiro_id,
            Agendamento.data == body.data,
            Agendamento.status != "cancelado",
        )
    ).all()

    for existente in ocupados:
        inicio_existente = _hora_para_minutos(existente.hora)
        fim_existente = inicio_existente + _duracao_agendamento_minutos(existente)
        if max(inicio_novo, inicio_existente) < min(fim_novo, fim_existente):
            raise HTTPException(status_code=409, detail="Horario ja esta ocupado.")

    agendamento = Agendamento(
        data=body.data,
        hora=body.hora,
        barbearia_id=body.barbearia_id,
        barbeiro_id=body.barbeiro_id,
        servico_id=ids_servicos[0],
        observacao=body.observacao,
        cliente_id=usuario.id,
        status="pendente",
    )
    agendamento.servicos = servicos
    session.add(agendamento)
    session.commit()
    session.refresh(agendamento)

    pagamento = Pagamento(
        agendamento_id=agendamento.id,
        valor_total=_valor_total_servicos(servicos),
        status="pago",
        descricao="Pagamento do agendamento",
    )
    session.add(pagamento)
    session.commit()

    return agendamento


@router.get("/meus", response_model=List[AgendamentoDetalhado])
def meus_agendamentos(
    session: Session = Depends(get_session),
    usuario: Usuario = Depends(get_usuario_atual),
):
    stmt = (
        select(Agendamento)
        .options(
            selectinload(Agendamento.barbearia),
            selectinload(Agendamento.barbeiro),
            selectinload(Agendamento.servico),
            selectinload(Agendamento.servicos),
        )
        .where(Agendamento.cliente_id == usuario.id)
        .order_by(Agendamento.data.desc(), Agendamento.hora.desc())
    )
    return session.exec(stmt).all()


@router.get("/barbearia/{barbearia_id}", response_model=List[AgendamentoDetalhado])
def agendamentos_da_barbearia(
    barbearia_id: int,
    data: str = Query(None, description="Filtrar por data YYYY-MM-DD"),
    session: Session = Depends(get_session),
    usuario: Usuario = Depends(get_usuario_atual),
):
    stmt = (
        select(Agendamento)
        .options(
            selectinload(Agendamento.barbearia),
            selectinload(Agendamento.barbeiro),
            selectinload(Agendamento.servico),
            selectinload(Agendamento.servicos),
        )
        .where(Agendamento.barbearia_id == barbearia_id)
    )
    if data:
        stmt = stmt.where(Agendamento.data == data)
    return session.exec(stmt.order_by(Agendamento.data, Agendamento.hora)).all()


@router.patch("/{agendamento_id}/status", response_model=AgendamentoRead)
def atualizar_status(
    agendamento_id: int,
    body: AgendamentoStatusUpdate,
    session: Session = Depends(get_session),
    usuario: Usuario = Depends(get_usuario_atual),
):
    agendamento = session.get(Agendamento, agendamento_id)
    if not agendamento:
        raise HTTPException(status_code=404, detail="Agendamento nao encontrado.")

    status_validos = {"confirmado", "concluido", "cancelado"}
    if body.status not in status_validos:
        raise HTTPException(status_code=400, detail=f"Status invalido. Use: {status_validos}")

    if body.status == "cancelado":
        pagamento = session.exec(
            select(Pagamento).where(
                Pagamento.agendamento_id == agendamento_id,
                Pagamento.descricao == "Pagamento do agendamento",
            )
        ).first()
        if pagamento and pagamento.status == "pago":
            pagamento.valor_estornado = round(pagamento.valor_total * 0.9, 2)
            pagamento.status = "estornado_parcial"
            session.add(pagamento)

    agendamento.status = body.status
    session.add(agendamento)
    session.commit()
    session.refresh(agendamento)
    return agendamento


@router.patch("/{agendamento_id}/reagendar", response_model=AgendamentoReagendarResponse)
def reagendar_agendamento(
    agendamento_id: int,
    body: AgendamentoReagendar,
    session: Session = Depends(get_session),
    usuario: Usuario = Depends(get_usuario_atual),
):
    """Reagenda um agendamento. Taxa de 10% se faltar menos de 1h para o horario original."""
    agendamento = session.get(Agendamento, agendamento_id)
    if not agendamento:
        raise HTTPException(status_code=404, detail="Agendamento nao encontrado.")
    if agendamento.cliente_id != usuario.id:
        raise HTTPException(status_code=403, detail="Acesso negado.")
    if agendamento.status not in ("pendente", "confirmado"):
        raise HTTPException(
            status_code=400,
            detail="So e possivel reagendar agendamentos pendentes ou confirmados.",
        )

    conflito = session.exec(
        select(Agendamento).where(
            Agendamento.barbeiro_id == agendamento.barbeiro_id,
            Agendamento.data == body.nova_data,
            Agendamento.hora == body.nova_hora,
            Agendamento.status != "cancelado",
            Agendamento.id != agendamento_id,
        )
    ).first()
    if conflito:
        raise HTTPException(status_code=409, detail="Novo horario ja esta ocupado.")

    dt_original = datetime.combine(agendamento.data, dt_time.fromisoformat(agendamento.hora))
    minutos_restantes = (dt_original - datetime.utcnow()).total_seconds() / 60
    taxa_cobrada = minutos_restantes < 60

    pagamento_taxa: Optional[Pagamento] = None
    valor_taxa = 0.0

    if taxa_cobrada:
        valor_total = _valor_total_agendamento(session, agendamento_id)
        valor_taxa = round(valor_total * 0.1, 2)
        pagamento_taxa = Pagamento(
            agendamento_id=agendamento_id,
            valor_total=valor_taxa,
            status="pago",
            descricao="Taxa de reagendamento tardio (10%)",
        )
        session.add(pagamento_taxa)

    agendamento.data = body.nova_data
    agendamento.hora = body.nova_hora
    session.add(agendamento)
    session.commit()
    session.refresh(agendamento)
    if pagamento_taxa:
        session.refresh(pagamento_taxa)

    return AgendamentoReagendarResponse(
        agendamento=agendamento,
        taxa_cobrada=taxa_cobrada,
        valor_taxa=valor_taxa,
        pagamento_taxa=pagamento_taxa,
    )
