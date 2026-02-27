from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from math import radians, cos, sin, asin, sqrt

from backend.database import get_session
from backend.models import Barbearia, Empresa, Barbeiro
from backend.schemas import BarbeariaCreate, BarbeariaRead, BarbeariaDetalhada

router = APIRouter(prefix="/barbearias", tags=["Barbearias"])


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcula distância em km entre duas coordenadas."""
    R = 6371
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return R * 2 * asin(sqrt(a))


@router.get("/", response_model=List[BarbeariaRead])
def listar_barbearias(
    lat: Optional[float] = Query(None, description="Latitude do usuário"),
    lng: Optional[float] = Query(None, description="Longitude do usuário"),
    raio_km: float = Query(50.0, description="Raio de busca em km"),
    q: Optional[str] = Query(None, description="Busca por nome, rua, bairro ou cidade"),
    session: Session = Depends(get_session),
):
    barbearias = session.exec(select(Barbearia).where(Barbearia.ativo == True)).all()

    if lat is not None and lng is not None:
        barbearias = [
            b for b in barbearias
            if haversine(lat, lng, b.latitude, b.longitude) <= raio_km
        ]
        barbearias.sort(key=lambda b: haversine(lat, lng, b.latitude, b.longitude))

    if q and q.strip():
        termo = q.strip().lower()
        barbearias = [
            b for b in barbearias
            if termo in b.nome.lower()
            or termo in b.endereco_completo.lower()
            or termo in (b.bairro or "").lower()
            or termo in (b.cidade or "").lower()
        ]

    return barbearias


@router.get("/{barbearia_id}", response_model=BarbeariaDetalhada)
def obter_barbearia(barbearia_id: int, session: Session = Depends(get_session)):
    barbearia = session.exec(
        select(Barbearia)
        .options(
            selectinload(Barbearia.barbeiros).selectinload(Barbeiro.servicos),
            selectinload(Barbearia.servicos),
        )
        .where(Barbearia.id == barbearia_id)
    ).first()
    if not barbearia:
        raise HTTPException(status_code=404, detail="Barbearia não encontrada.")
    return barbearia


@router.get("/slug/{slug}", response_model=BarbeariaDetalhada)
def obter_por_slug(slug: str, session: Session = Depends(get_session)):
    barbearia = session.exec(
        select(Barbearia)
        .options(
            selectinload(Barbearia.barbeiros).selectinload(Barbeiro.servicos),
            selectinload(Barbearia.servicos),
        )
        .where(Barbearia.slug == slug)
    ).first()
    if not barbearia:
        raise HTTPException(status_code=404, detail="Barbearia não encontrada.")
    return barbearia


@router.post("/", response_model=BarbeariaRead, status_code=201)
def criar_barbearia(body: BarbeariaCreate, session: Session = Depends(get_session)):
    empresa = session.get(Empresa, body.empresa_id)
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada.")

    ja_existe = session.exec(select(Barbearia).where(Barbearia.slug == body.slug)).first()
    if ja_existe:
        raise HTTPException(status_code=400, detail="Slug já está em uso.")

    barbearia = Barbearia(**body.model_dump())
    session.add(barbearia)
    session.commit()
    session.refresh(barbearia)
    return barbearia
