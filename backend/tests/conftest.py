import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine

from backend.auth import get_usuario_atual
from backend.database import get_session
from backend.main import app
from backend.models import Usuario


@pytest.fixture
def engine(tmp_path):
    db_file = tmp_path / "test.db"
    engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(engine)
    return engine


@pytest.fixture
def db_session(engine):
    with Session(engine) as session:
        yield session


@pytest.fixture
def usuario_logado(db_session):
    usuario = Usuario(
        nome="Cliente Teste",
        email="cliente@teste.com",
        celular="11999999999",
        senha_hash="hash",
        tipo="cliente",
    )
    db_session.add(usuario)
    db_session.commit()
    db_session.refresh(usuario)
    return usuario


@pytest.fixture
def client(db_session, usuario_logado):
    def _get_session_override():
        yield db_session

    def _get_usuario_override():
        return usuario_logado

    app.dependency_overrides[get_session] = _get_session_override
    app.dependency_overrides[get_usuario_atual] = _get_usuario_override

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
