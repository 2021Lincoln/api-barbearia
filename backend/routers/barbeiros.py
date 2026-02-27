from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from typing import List

from backend.database import get_session
from backend.models import Barbeiro, Barbearia, Servico
from backend.schemas import BarbeiroCreate, BarbeiroRead

router = APIRouter(prefix="/barbeiros", tags=["Barbeiros"])


@router.get("/barbearia/{barbearia_id}", response_model=List[BarbeiroRead])
def listar_por_barbearia(barbearia_id: int, session: Session = Depends(get_session)):
    barbearia = session.get(Barbearia, barbearia_id)
    if not barbearia:
        raise HTTPException(status_code=404, detail="Barbearia não encontrada.")

    return session.exec(
        select(Barbeiro)
        .options(selectinload(Barbeiro.servicos))
        .where(
            Barbeiro.barbearia_id == barbearia_id,
            Barbeiro.ativo == True,
        )
    ).all()


@router.get("/{barbeiro_id}", response_model=BarbeiroRead)
def obter_barbeiro(barbeiro_id: int, session: Session = Depends(get_session)):
    barbeiro = session.exec(
        select(Barbeiro)
        .options(selectinload(Barbeiro.servicos))
        .where(Barbeiro.id == barbeiro_id)
    ).first()
    if not barbeiro:
        raise HTTPException(status_code=404, detail="Barbeiro não encontrado.")
    return barbeiro


@router.post("/", response_model=BarbeiroRead, status_code=201)
def criar_barbeiro(body: BarbeiroCreate, session: Session = Depends(get_session)):
    barbearia = session.get(Barbearia, body.barbearia_id)
    if not barbearia:
        raise HTTPException(status_code=404, detail="Barbearia não encontrada.")

    data = body.model_dump(exclude={"servico_ids"})
    barbeiro = Barbeiro(**data)
    if body.servico_ids:
        servicos = session.exec(
            select(Servico).where(
                Servico.barbearia_id == body.barbearia_id,
                Servico.id.in_(body.servico_ids),
            )
        ).all()
        if len(servicos) != len(set(body.servico_ids)):
            raise HTTPException(status_code=400, detail="Servico invalido para esta barbearia.")
        barbeiro.servicos = servicos
    session.add(barbeiro)
    session.commit()
    session.refresh(barbeiro)
    return barbeiro
