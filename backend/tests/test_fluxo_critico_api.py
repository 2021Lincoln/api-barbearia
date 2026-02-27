from datetime import date

from fastapi.testclient import TestClient

from backend.database import get_session
from backend.main import app
from backend.models import Barbearia, Barbeiro, Empresa, Servico


def test_fluxo_critico_agendamento_cancelamento_reagendamento(db_session):
    def _get_session_override():
        yield db_session

    app.dependency_overrides[get_session] = _get_session_override

    empresa = Empresa(
        nome_fantasia="Empresa Fluxo",
        cnpj="32345678000199",
        email="empresa-fluxo@teste.com",
        telefone="1130000010",
        aprovado=True,
        ativo=True,
    )
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)

    barbearia = Barbearia(
        nome="Barbearia Fluxo",
        slug="barbearia-fluxo",
        endereco_completo="Rua Fluxo, 100",
        cidade="Sao Paulo",
        bairro="Centro",
        latitude=-23.55,
        longitude=-46.63,
        empresa_id=empresa.id,
    )
    db_session.add(barbearia)
    db_session.commit()
    db_session.refresh(barbearia)

    servico = Servico(
        nome="Corte",
        descricao=None,
        preco=50.0,
        duracao_minutos=30,
        barbearia_id=barbearia.id,
    )
    db_session.add(servico)
    db_session.commit()
    db_session.refresh(servico)

    barbeiro = Barbeiro(
        nome="Carlos",
        foto_url=None,
        especialidade="Corte",
        barbearia_id=barbearia.id,
        ativo=True,
    )
    barbeiro.servicos = [servico]
    db_session.add(barbeiro)
    db_session.commit()
    db_session.refresh(barbeiro)

    with TestClient(app) as client:
        registro = client.post(
            "/auth/registro",
            json={
                "nome": "Cliente Fluxo",
                "email": "cliente.fluxo@teste.com",
                "celular": "11999990000",
                "senha": "SenhaForte123",
            },
        )
        assert registro.status_code == 201
        token = registro.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        criar = client.post(
            "/agendamentos/",
            headers=headers,
            json={
                "data": str(date(2026, 12, 20)),
                "hora": "10:00",
                "barbearia_id": barbearia.id,
                "barbeiro_id": barbeiro.id,
                "servico_ids": [servico.id],
            },
        )
        assert criar.status_code == 201
        agendamento_id = criar.json()["id"]

        cancelar = client.patch(
            f"/agendamentos/{agendamento_id}/status",
            headers=headers,
            json={"status": "cancelado"},
        )
        assert cancelar.status_code == 200

        criar2 = client.post(
            "/agendamentos/",
            headers=headers,
            json={
                "data": str(date(2026, 12, 21)),
                "hora": "10:00",
                "barbearia_id": barbearia.id,
                "barbeiro_id": barbeiro.id,
                "servico_ids": [servico.id],
            },
        )
        assert criar2.status_code == 201
        agendamento2_id = criar2.json()["id"]

        reagendar = client.patch(
            f"/agendamentos/{agendamento2_id}/reagendar",
            headers=headers,
            json={"nova_data": str(date(2026, 12, 22)), "nova_hora": "11:00"},
        )
        assert reagendar.status_code == 200

    app.dependency_overrides.clear()
