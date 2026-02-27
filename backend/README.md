# Backend — BarberApp API

API REST em **FastAPI + SQLModel + SQLite**.

## Iniciar

```bash
# Na raiz do projeto (com venv ativado)
python run.py

# Ou diretamente
uvicorn backend.main:app --reload --port 8000
```

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

## Popular banco de dados

```bash
python -m backend.seed
```

Cria 3 barbearias, 7 barbeiros, 12 servicos + usuarios de teste.
Precisa ser rodado apenas uma vez. Para recriar, delete `barber.db` primeiro.

## Usuarios criados pelo seed

| Tipo | Email | Senha |
|------|-------|-------|
| cliente | teste@barberapp.com | 123456 |
| super_admin | superadmin@barberapp.com | superadmin123 |

## Resetar o banco

Necessario ao adicionar colunas em `models.py`:

```bash
rm backend/barber.db
python -m backend.seed
```

## Routers

| Prefixo | Arquivo | Acesso |
|---------|---------|--------|
| `/auth` | `routers/auth.py` | Publico (clientes) |
| `/barbearias` | `routers/barbearias.py` | Publico |
| `/barbeiros` | `routers/barbeiros.py` | Publico |
| `/servicos` | `routers/servicos.py` | Publico |
| `/agendamentos` | `routers/agendamentos.py` | JWT (clientes) |
| `/admin` | `routers/admin.py` | JWT com `tipo="admin"` |
| `/master` | `routers/master.py` | JWT com `tipo="super_admin"` |

## Hierarquia de tipos de usuario

```
super_admin  →  ve tudo, ativa/suspende empresas  (/master/*)
admin        →  gerencia sua barbearia             (/admin/*)
cliente      →  agenda servicos                    (/agendamentos/*)
```

## Bloqueio de empresa

Se `empresa.ativo == False` ou `empresa.plano_expira_em < agora`, o admin
recebe `403` tanto no login quanto em qualquer request autenticado.
Controlado pelo super_admin via `PATCH /master/empresas/{id}/status`.
