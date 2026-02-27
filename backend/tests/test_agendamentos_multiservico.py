from datetime import date

from backend.models import Agendamento, Barbearia, Barbeiro, Empresa, Servico


def _setup_cenario(db_session, cliente_id: int):
    empresa = Empresa(
        nome_fantasia="Empresa Teste",
        cnpj="22345678000199",
        email="empresa2@teste.com",
        telefone="1130000001",
        aprovado=True,
        ativo=True,
    )
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)

    barbearia = Barbearia(
        nome="Barbearia Teste",
        slug="barbearia-teste",
        endereco_completo="Rua Teste, 1",
        cidade="Sao Paulo",
        bairro="Centro",
        latitude=-23.55,
        longitude=-46.63,
        empresa_id=empresa.id,
        ativo=True,
    )
    db_session.add(barbearia)
    db_session.commit()
    db_session.refresh(barbearia)

    servico_corte = Servico(
        nome="Corte",
        descricao=None,
        preco=40.0,
        duracao_minutos=30,
        barbearia_id=barbearia.id,
    )
    servico_barba = Servico(
        nome="Barba",
        descricao=None,
        preco=30.0,
        duracao_minutos=30,
        barbearia_id=barbearia.id,
    )
    db_session.add(servico_corte)
    db_session.add(servico_barba)
    db_session.commit()
    db_session.refresh(servico_corte)
    db_session.refresh(servico_barba)

    barbeiro = Barbeiro(
        nome="Jose",
        foto_url=None,
        especialidade="Todas",
        barbearia_id=barbearia.id,
        ativo=True,
    )
    barbeiro.servicos = [servico_corte, servico_barba]
    db_session.add(barbeiro)
    db_session.commit()
    db_session.refresh(barbeiro)

    agendamento_existente = Agendamento(
        data=date(2026, 3, 10),
        hora="09:00",
        status="pendente",
        observacao=None,
        cliente_id=cliente_id,
        barbearia_id=barbearia.id,
        barbeiro_id=barbeiro.id,
        servico_id=servico_corte.id,
    )
    agendamento_existente.servicos = [servico_corte, servico_barba]
    db_session.add(agendamento_existente)
    db_session.commit()

    return {
        "barbearia": barbearia,
        "barbeiro": barbeiro,
        "servico_corte": servico_corte,
        "servico_barba": servico_barba,
    }


def test_horarios_disponiveis_considera_duracao_total(client, db_session, usuario_logado):
    cenario = _setup_cenario(db_session, usuario_logado.id)

    response = client.get(
        "/agendamentos/horarios-disponiveis",
        params={
            "barbearia_id": cenario["barbearia"].id,
            "barbeiro_id": cenario["barbeiro"].id,
            "data": "2026-03-10",
            "duracao_minutos": 30,
        },
    )

    assert response.status_code == 200
    horarios = response.json()["horarios_livres"]
    assert "09:00" not in horarios
    assert "09:30" not in horarios
    assert "10:00" in horarios


def test_criar_agendamento_bloqueia_sobreposicao(client, db_session, usuario_logado):
    cenario = _setup_cenario(db_session, usuario_logado.id)

    conflito = client.post(
        "/agendamentos/",
        json={
            "data": "2026-03-10",
            "hora": "09:30",
            "barbearia_id": cenario["barbearia"].id,
            "barbeiro_id": cenario["barbeiro"].id,
            "servico_ids": [cenario["servico_corte"].id],
        },
    )

    assert conflito.status_code == 409

    sucesso = client.post(
        "/agendamentos/",
        json={
            "data": "2026-03-10",
            "hora": "10:00",
            "barbearia_id": cenario["barbearia"].id,
            "barbeiro_id": cenario["barbeiro"].id,
            "servico_ids": [cenario["servico_corte"].id],
        },
    )

    assert sucesso.status_code == 201
