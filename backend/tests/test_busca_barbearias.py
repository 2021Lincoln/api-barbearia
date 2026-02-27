from backend.models import Barbearia, Empresa


def _nova_barbearia(nome: str, endereco: str, cidade: str, bairro: str, slug: str, empresa_id: int) -> Barbearia:
    return Barbearia(
        nome=nome,
        slug=slug,
        endereco_completo=endereco,
        cidade=cidade,
        bairro=bairro,
        latitude=-23.55,
        longitude=-46.63,
        empresa_id=empresa_id,
        ativo=True,
    )


def test_busca_por_nome_rua_bairro_cidade(client, db_session):
    empresa = Empresa(
        nome_fantasia="Empresa Teste",
        cnpj="12345678000199",
        email="empresa@teste.com",
        telefone="1130000000",
        aprovado=True,
        ativo=True,
    )
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)

    db_session.add(_nova_barbearia("Barbearia Centro", "Rua A, 10", "Sao Paulo", "Centro", "barbearia-centro", empresa.id))
    db_session.add(_nova_barbearia("Estilo Norte", "Av. Brasil, 200", "Sao Paulo", "Santana", "estilo-norte", empresa.id))
    db_session.add(_nova_barbearia("Corte Sul", "Rua das Flores, 300", "Curitiba", "Batel", "corte-sul", empresa.id))
    db_session.commit()

    r_nome = client.get("/barbearias/", params={"q": "Estilo"})
    assert r_nome.status_code == 200
    assert len(r_nome.json()) == 1
    assert r_nome.json()[0]["nome"] == "Estilo Norte"

    r_rua = client.get("/barbearias/", params={"q": "Flores"})
    assert r_rua.status_code == 200
    assert len(r_rua.json()) == 1
    assert r_rua.json()[0]["nome"] == "Corte Sul"

    r_bairro = client.get("/barbearias/", params={"q": "Centro"})
    assert r_bairro.status_code == 200
    assert any(item["nome"] == "Barbearia Centro" for item in r_bairro.json())

    r_cidade = client.get("/barbearias/", params={"q": "Curitiba"})
    assert r_cidade.status_code == 200
    assert len(r_cidade.json()) == 1
    assert r_cidade.json()[0]["nome"] == "Corte Sul"
