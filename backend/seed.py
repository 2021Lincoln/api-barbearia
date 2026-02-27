"""
Script de seed: popula o banco com dados de teste.
Execute com: python -m backend.seed
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, select
from backend.database import engine, create_db
from backend.models import Empresa, Barbearia, Barbeiro, Servico, Usuario
from backend.auth import hash_senha


def seed():
    create_db()

    with Session(engine) as session:
        # Evita duplicar dados
        if session.exec(select(Empresa)).first():
            print("Banco ja tem dados. Apague 'backend/barber.db' para re-popular.")
            return

        # ── Empresa ──────────────────────────────────────────────────────────
        empresa = Empresa(
            nome_fantasia="Grupo Premium Barbearias",
            cnpj="12.345.678/0001-90",
            email="contato@premiumbarbearia.com",
            telefone="(11) 99999-0000",
            aprovado=True,  # dados de seed já aprovados
        )
        session.add(empresa)
        session.commit()
        session.refresh(empresa)

        # ── Barbearias ───────────────────────────────────────────────────────
        barbearia1 = Barbearia(
            nome="Barbearia Premium - Centro",
            slug="premium-centro",
            endereco_completo="Rua das Flores, 123 - Centro, São Paulo - SP",
            latitude=-23.5505,
            longitude=-46.6333,
            foto_url=None,
            horario_abertura="08:00",
            horario_fechamento="20:00",
            avaliacao=4.8,
            empresa_id=empresa.id,
        )
        barbearia2 = Barbearia(
            nome="Barbearia Classic - Pinheiros",
            slug="classic-pinheiros",
            endereco_completo="Av. Paulista, 456 - Pinheiros, São Paulo - SP",
            latitude=-23.5630,
            longitude=-46.6543,
            foto_url=None,
            horario_abertura="09:00",
            horario_fechamento="19:00",
            avaliacao=4.6,
            empresa_id=empresa.id,
        )
        barbearia3 = Barbearia(
            nome="Style Barber Shop",
            slug="style-barber",
            endereco_completo="Rua Oscar Freire, 789 - Jardins, São Paulo - SP",
            latitude=-23.5643,
            longitude=-46.6610,
            foto_url=None,
            horario_abertura="10:00",
            horario_fechamento="21:00",
            avaliacao=4.9,
            empresa_id=empresa.id,
        )
        session.add(barbearia1)
        session.add(barbearia2)
        session.add(barbearia3)
        session.commit()
        session.refresh(barbearia1)
        session.refresh(barbearia2)
        session.refresh(barbearia3)

        # ── Barbeiros ────────────────────────────────────────────────────────
        barbeiros = [
            # Barbearia 1
            Barbeiro(nome="Carlos Silva", especialidade="Degradê moderno", ativo=True, barbearia_id=barbearia1.id),
            Barbeiro(nome="Ricardo Oliveira", especialidade="Barba e bigode", ativo=True, barbearia_id=barbearia1.id),
            Barbeiro(nome="Marcos Santos", especialidade="Corte clássico", ativo=True, barbearia_id=barbearia1.id),
            # Barbearia 2
            Barbeiro(nome="Felipe Costa", especialidade="Corte americano", ativo=True, barbearia_id=barbearia2.id),
            Barbeiro(nome="Gabriel Sousa", especialidade="Barba completa", ativo=True, barbearia_id=barbearia2.id),
            # Barbearia 3
            Barbeiro(nome="Lucas Mendes", especialidade="Especialista em degradê", ativo=True, barbearia_id=barbearia3.id),
            Barbeiro(nome="André Lima", especialidade="Corte e coloração", ativo=True, barbearia_id=barbearia3.id),
        ]
        for b in barbeiros:
            session.add(b)

        # ── Serviços ─────────────────────────────────────────────────────────
        servicos = [
            # Barbearia 1
            Servico(nome="Corte Degradê", descricao="Corte moderno com degradê nas laterais", preco=45.0, duracao_minutos=45, barbearia_id=barbearia1.id),
            Servico(nome="Barba Completa", descricao="Aparar, modelar e hidratar a barba", preco=35.0, duracao_minutos=30, barbearia_id=barbearia1.id),
            Servico(nome="Corte + Barba", descricao="Combo completo corte e barba", preco=70.0, duracao_minutos=60, barbearia_id=barbearia1.id),
            Servico(nome="Corte Infantil", descricao="Corte para crianças até 12 anos", preco=30.0, duracao_minutos=30, barbearia_id=barbearia1.id),
            Servico(nome="Hidratação Capilar", descricao="Tratamento de hidratação profunda", preco=40.0, duracao_minutos=45, barbearia_id=barbearia1.id),
            # Barbearia 2
            Servico(nome="Corte Americano", descricao="Corte clássico estilo americano", preco=40.0, duracao_minutos=40, barbearia_id=barbearia2.id),
            Servico(nome="Barba Modelada", descricao="Modelagem e alinhamento da barba", preco=30.0, duracao_minutos=25, barbearia_id=barbearia2.id),
            Servico(nome="Corte + Barba Premium", descricao="Corte completo com barba e hidratação", preco=80.0, duracao_minutos=75, barbearia_id=barbearia2.id),
            Servico(nome="Pigmentação", descricao="Pigmentação para disfarçar falhas na barba", preco=50.0, duracao_minutos=40, barbearia_id=barbearia2.id),
            # Barbearia 3
            Servico(nome="Degradê + Barba", descricao="Degradê completo com acabamento na barba", preco=75.0, duracao_minutos=60, barbearia_id=barbearia3.id),
            Servico(nome="Corte Navalhado", descricao="Acabamento com navalha nas laterais", preco=55.0, duracao_minutos=50, barbearia_id=barbearia3.id),
            Servico(nome="Platinado/Coloração", descricao="Coloração completa ou mechas", preco=120.0, duracao_minutos=90, barbearia_id=barbearia3.id),
        ]
        for s in servicos:
            session.add(s)

        # ── Usuário de teste (cliente) ────────────────────────────────────────
        usuario_teste = Usuario(
            nome="João Teste",
            email="teste@barberapp.com",
            celular="11999998888",
            senha_hash=hash_senha("123456"),
            tipo="cliente",
        )
        session.add(usuario_teste)

        # ── Super Admin (dono da plataforma) ─────────────────────────────────
        # ⚠️  Troque o e-mail e a senha antes de ir para produção!
        super_admin = Usuario(
            nome="Super Admin",
            email="superadmin@barberapp.com",
            celular="11000000000",
            senha_hash=hash_senha("superadmin123"),
            tipo="super_admin",
            empresa_id=None,  # super_admin não pertence a nenhuma empresa
        )
        session.add(super_admin)

        session.commit()

    print("Seed concluido com sucesso!")
    print("  Login de teste  -> E-mail: teste@barberapp.com | Senha: 123456")
    print("  Super Admin     -> E-mail: superadmin@barberapp.com | Senha: superadmin123")
    print("  3 barbearias criadas (Barbearia Premium, Classic, Style Barber)")
    print("  7 barbeiros criados")
    print("  12 servicos criados")


if __name__ == "__main__":
    seed()
