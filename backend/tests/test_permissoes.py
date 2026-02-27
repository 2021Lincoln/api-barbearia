from fastapi.testclient import TestClient

from backend.auth import get_usuario_atual
from backend.database import get_session
from backend.main import app
from backend.models import Usuario


def test_admin_me_bloqueia_cliente(db_session):
    cliente = Usuario(
        nome="Cliente",
        email="cliente-perm@teste.com",
        celular="11900000000",
        senha_hash="hash",
        tipo="cliente",
    )
    db_session.add(cliente)
    db_session.commit()
    db_session.refresh(cliente)

    def _get_session_override():
        yield db_session

    def _get_usuario_override():
        return cliente

    app.dependency_overrides[get_session] = _get_session_override
    app.dependency_overrides[get_usuario_atual] = _get_usuario_override

    with TestClient(app) as client:
        res = client.get("/admin/me")
        assert res.status_code == 403

    app.dependency_overrides.clear()


def test_master_me_bloqueia_admin(db_session):
    admin = Usuario(
        nome="Admin",
        email="admin-perm@teste.com",
        celular="11900000001",
        senha_hash="hash",
        tipo="admin",
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)

    def _get_session_override():
        yield db_session

    def _get_usuario_override():
        return admin

    app.dependency_overrides[get_session] = _get_session_override
    app.dependency_overrides[get_usuario_atual] = _get_usuario_override

    with TestClient(app) as client:
        res = client.get("/master/me")
        assert res.status_code == 403

    app.dependency_overrides.clear()
