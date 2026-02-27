from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./backend/barber.db")

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},  # necessário para SQLite
)


def create_db():
    """Cria todas as tabelas no banco de dados."""
    SQLModel.metadata.create_all(engine)
    # Migração simples para bases SQLite existentes
    with engine.begin() as conn:
        cols = conn.execute(text("PRAGMA table_info(barbearia)")).fetchall()
        nomes = {c[1] for c in cols}
        if "cidade" not in nomes:
            conn.execute(text("ALTER TABLE barbearia ADD COLUMN cidade TEXT"))
        if "bairro" not in nomes:
            conn.execute(text("ALTER TABLE barbearia ADD COLUMN bairro TEXT"))


def get_session():
    """Dependency para injetar sessão do banco nas rotas."""
    with Session(engine) as session:
        yield session
