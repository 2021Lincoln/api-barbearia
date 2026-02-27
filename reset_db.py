"""
Script para resetar o banco de dados e re-popular com dados de teste.
Execute com: python reset_db.py
"""
import os
import sys

db_path = os.path.join(os.path.dirname(__file__), 'backend', 'barber.db')

if os.path.exists(db_path):
    try:
        os.remove(db_path)
        print(f"✓ Banco removido: {db_path}")
    except PermissionError:
        print("✗ ERRO: O arquivo está bloqueado.")
        print("  → Pare o servidor backend (Ctrl+C no terminal do uvicorn) e tente novamente.")
        sys.exit(1)
else:
    print("→ Banco não encontrado, criando novo...")

# Re-popula o banco
from backend.seed import seed
seed()
print("\n✓ Pronto! Reinicie o servidor: python run.py")
