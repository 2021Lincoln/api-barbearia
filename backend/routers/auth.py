from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select

from backend.database import get_session
from backend.models import Usuario
from backend.schemas import RegistroRequest, LoginRequest, TokenResponse, UsuarioRead
from backend.auth import hash_senha, verificar_senha, criar_token, get_usuario_atual
from backend.rate_limit import check_rate_limit

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/registro", response_model=TokenResponse, status_code=201)
def registrar(body: RegistroRequest, request: Request, session: Session = Depends(get_session)):
    check_rate_limit(request, scope="auth_register", max_attempts=10, window_seconds=60)
    existente = session.exec(select(Usuario).where(Usuario.email == body.email)).first()
    if existente:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado.")

    usuario = Usuario(
        nome=body.nome,
        email=body.email,
        celular=body.celular,
        senha_hash=hash_senha(body.senha),
    )
    session.add(usuario)
    session.commit()
    session.refresh(usuario)

    token = criar_token({"sub": str(usuario.id)})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request, session: Session = Depends(get_session)):
    check_rate_limit(request, scope="auth_login")
    usuario = session.exec(select(Usuario).where(Usuario.email == body.email)).first()
    if not usuario or not verificar_senha(body.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")

    token = criar_token({"sub": str(usuario.id)})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UsuarioRead)
def perfil_atual(usuario: Usuario = Depends(get_usuario_atual)):
    return usuario


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(usuario: Usuario = Depends(get_usuario_atual)):
    token = criar_token({"sub": str(usuario.id)})
    return TokenResponse(access_token=token)
