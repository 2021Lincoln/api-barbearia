from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from backend.database import get_session
from backend.models import Servico, Barbearia
from backend.schemas import ServicoCreate, ServicoRead

router = APIRouter(prefix="/servicos", tags=["Serviços"])


@router.get("/barbearia/{barbearia_id}", response_model=List[ServicoRead])
def listar_por_barbearia(barbearia_id: int, session: Session = Depends(get_session)):
    barbearia = session.get(Barbearia, barbearia_id)
    if not barbearia:
        raise HTTPException(status_code=404, detail="Barbearia não encontrada.")

    return session.exec(
        select(Servico).where(Servico.barbearia_id == barbearia_id)
    ).all()


@router.get("/{servico_id}", response_model=ServicoRead)
def obter_servico(servico_id: int, session: Session = Depends(get_session)):
    servico = session.get(Servico, servico_id)
    if not servico:
        raise HTTPException(status_code=404, detail="Serviço não encontrado.")
    return servico


@router.post("/", response_model=ServicoRead, status_code=201)
def criar_servico(body: ServicoCreate, session: Session = Depends(get_session)):
    barbearia = session.get(Barbearia, body.barbearia_id)
    if not barbearia:
        raise HTTPException(status_code=404, detail="Barbearia não encontrada.")

    servico = Servico(**body.model_dump())
    session.add(servico)
    session.commit()
    session.refresh(servico)
    return servico
