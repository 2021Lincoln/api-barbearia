# BarberApp - Plataforma de Agendamento para Barbearias

Sistema completo com:
- API em FastAPI/SQLModel
- App Mobile em React Native (Expo)
- Painel Admin Web em React (Vite)
- Painel Master (super admin)

## Sumario
- Visao Geral
- Arquitetura
- Requisitos
- Configuracao de Ambiente
- Executar Projeto
- Gerar APK Android (EAS)
- Funcionalidades Principais
- Regras de Negocio
- Scripts Uteis
- Testes
- Rotas Principais
- Estrutura de Pastas
- Checklist de Producao

## Visao Geral
O projeto permite:
- Clientes buscarem barbearias por nome, endereco, bairro e cidade.
- Selecionar barbeiro e agendar 1 ou mais servicos no mesmo horario.
- Admin gerenciar barbearia, barbeiros, servicos, agenda, disponibilidade e bloqueios.
- Master aprovar/suspender empresas e acompanhar indicadores da plataforma.

## Arquitetura
- Backend: FastAPI + SQLModel + SQLite
- Mobile: React Native + Expo + TypeScript
- Admin Web: React + Vite + TypeScript
- Auth: JWT

Fluxo:
1. Mobile/Admin Web consomem a API
2. API aplica regras de negocio
3. Dados persistidos em SQLite (`backend/barber.db`)

## Requisitos
### Backend
- Python 3.11+
- pip

### Frontend
- Node.js 18+
- npm

## Configuracao de Ambiente
Crie um `.env` na raiz (pode copiar de `.env.example`).

Exemplo:

```env
# Backend
DATABASE_URL=sqlite:///./backend/barber.db
SECRET_KEY=troque-por-uma-chave-segura
CORS_ORIGINS=http://localhost:5173,http://localhost:19006

# Admin Web
VITE_API_URL=http://localhost:8000

# Mobile (Expo)
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000

# Opcional
GOOGLE_MAPS_API_KEY=
```

Notas:
- `CORS_ORIGINS` aceita lista separada por virgula.
- `EXPO_PUBLIC_API_URL` deve apontar para o IP da maquina na rede local quando usar celular fisico.

## Executar Projeto
## 1) Backend
Na raiz do projeto:

```bash
python -m venv venv
```

Windows (PowerShell):

```bash
venv\Scripts\activate
```

Instalar dependencias:

```bash
pip install -r requirements.txt
```

Popular dados iniciais (opcional, recomendado na primeira execucao):

```bash
python -m backend.seed
```

Rodar API:

```bash
python run.py
```

ou:

```bash
uvicorn backend.main:app --reload --port 8000
```

Documentacao:
- `http://localhost:8000/docs`
- `http://localhost:8000/redoc`

## 2) Admin Web

```bash
cd admin-web
npm install
npm run dev
```

Acesse: `http://localhost:5173`

## 3) Mobile (Expo)

```bash
cd mobile
npm install
npx expo start
```

Use Expo Go (QR Code) ou emulador.

## Gerar APK Android (EAS)
Passos executados para gerar build instalavel no Android:

### 1) Entrar na pasta mobile
```bash
cd mobile
```

### 2) Login no EAS
```bash
npx eas login
```
Se aparecer "already logged in", pode continuar.

### 3) Garantir repositório git na pasta mobile
```bash
git init
```
O EAS exige git para build.

### 4) Inicializar e vincular projeto EAS
```bash
npx eas init --force
```
Isso cria/vincula o projeto no Expo (ex.: `@seu_usuario/barberapp`) e atualiza `app.json`.

### 5) Rodar build Android
```bash
npx eas build -p android --profile preview
```

Importante:
- Nao usar `--non-interactive` na primeira vez.
- Na primeira build, o EAS vai pedir para gerar o keystore Android.
- Aceite a geracao automatica do keystore.

### 6) Instalar no celular
Ao final, o EAS retorna um link.
- Abra esse link no celular Android.
- Baixe e instale o APK gerado.

### Erros comuns e solucao
- "Project does not exist ... use --force":
  - rode `npx eas init --force`
- "must configure EAS project before non-interactive":
  - rode `npx eas init` primeiro
- "Generating a new Keystore is not supported in --non-interactive mode":
  - rode build sem `--non-interactive`

## Funcionalidades Principais
### Busca de Barbearias
- Busca por nome da barbearia
- Busca por endereco
- Busca por bairro
- Busca por cidade
- Filtro por geolocalizacao (raio)

### Barbeiros e Servicos
- Barbeiro pode ter 1 ou varios servicos vinculados.
- Especialidade exibida no card do barbeiro.
- Na tela "Escolha o servico", aparecem apenas servicos que o barbeiro realiza.
- Cliente pode selecionar mais de 1 servico no mesmo agendamento.

### Agendamentos
- Criacao de agendamento com 1 ou varios servicos.
- Horarios disponiveis consideram:
  - disponibilidade semanal do barbeiro
  - bloqueios pontuais
  - agendamentos ja existentes
  - duracao total dos servicos selecionados
- Bloqueio de sobreposicao real de horario (nao apenas hora inicial igual).
- Cancelamento com estorno parcial (90%).
- Reagendamento com taxa quando aplicavel.

### Admin Web
- Dashboard com indicadores.
- CRUD de barbeiros e servicos.
- Edicao da barbearia (inclui nome real, cidade e bairro).
- Controle de status da barbearia (aberta/fechada).
- Disponibilidade semanal e bloqueios por barbeiro.

### Auditoria
Acoes criticas do admin geram log de auditoria em banco (`AuditLog`), incluindo:
- atualizacao de barbearia
- criacao/edicao/desativacao de barbeiro
- criacao/edicao/exclusao de servico
- alteracao de status de agendamento
- alteracao de status da barbearia
- atualizacao de disponibilidade
- criacao/remocao de bloqueios

## Regras de Negocio
1. Admin so acessa se empresa estiver aprovada, ativa e com plano valido.
2. Barbeiro so pode receber agendamento de servicos vinculados a ele.
3. Agendamento exige ao menos 1 servico.
4. Horarios livres retornados ja validam duracao total do pacote de servicos.
5. Slug de barbearia e validado e deve ser unico.

## Scripts Uteis
Aplicar migracao basica (create tables + colunas novas suportadas):

```bash
python -m backend.scripts.migrate_db
```

Gerar backup do banco SQLite em `backend/backups/`:

```bash
python -m backend.scripts.backup_db
```

Resetar banco (desenvolvimento):

```bash
# PowerShell
Remove-Item backend\barber.db
python -m backend.seed
```

## Testes
Executar testes de backend:

```bash
python -m pytest backend/tests -q
```

Cobertura atual de testes inclui:
- busca por nome/rua/bairro/cidade
- horarios disponiveis com duracao total
- bloqueio de sobreposicao no agendamento multiplo

## Rotas Principais
### Publicas
- `POST /auth/registro`
- `POST /auth/login`
- `GET /barbearias/`
- `GET /barbearias/{id}`
- `GET /barbearias/slug/{slug}`
- `GET /agendamentos/horarios-disponiveis`

### Cliente autenticado
- `GET /auth/me`
- `POST /agendamentos/`
- `GET /agendamentos/meus`
- `PATCH /agendamentos/{id}/status`
- `PATCH /agendamentos/{id}/reagendar`

### Admin
- `POST /admin/registro`
- `POST /admin/login`
- `GET /admin/dashboard`
- `GET/PUT /admin/barbearia`
- `PATCH /admin/barbearia/status`
- CRUD `admin/barbeiros`
- CRUD `admin/servicos`
- `GET /admin/agendamentos`
- `PATCH /admin/agendamentos/{id}/status`
- disponibilidade e bloqueios por barbeiro

### Master
- `POST /master/login`
- `GET /master/me`
- `GET /master/stats`
- `GET /master/empresas`
- `PATCH /master/empresas/{id}/status`
- aprovacao/rejeicao de empresas

## Estrutura de Pastas
```text
api-barbearia/
  backend/
    routers/
    scripts/
    tests/
    main.py
    models.py
    schemas.py
    database.py
  admin-web/
    src/
  mobile/
    src/
  .env.example
  requirements.txt
  run.py
```

## Checklist de Producao
### Mitigacoes ja aplicadas no codigo
- [x] Validacao de senha forte no cadastro (`cliente` e `admin`).
- [x] Rate limit basico nos endpoints de login (`/auth/login`, `/admin/login`, `/master/login`).
- [x] Configuracao de expiracao de token via `ACCESS_TOKEN_EXPIRE_MINUTES`.
- [x] Bloqueio de `SECRET_KEY` padrao quando `APP_ENV=production`.
- [x] CORS por variavel de ambiente (`CORS_ORIGINS`).
- [x] Auditoria de acoes criticas de admin (`AuditLog`).

### Pendencias que dependem de ambiente/operacao
### 1) Infra e Deploy
- [ ] Publicar API em servidor confiavel (Docker, VPS ou PaaS).
- [ ] Habilitar HTTPS (certificado valido).
- [ ] Configurar dominio da API (ex: `api.seudominio.com`).
- [ ] Definir processo de deploy com rollback (script ou CI/CD).

### 2) Configuracao de Ambiente
- [ ] Gerar `SECRET_KEY` forte e unica para producao.
- [ ] Definir `CORS_ORIGINS` apenas com dominios reais do app web.
- [ ] Configurar `VITE_API_URL` com URL publica da API.
- [ ] Configurar `EXPO_PUBLIC_API_URL` com URL/IP de producao.
- [ ] Nao versionar `.env` com segredos.

### 3) Banco de Dados
- [ ] Migrar de SQLite para PostgreSQL em producao.
- [ ] Configurar backup automatico diario.
- [ ] Testar restauracao de backup (nao apenas gerar backup).
- [ ] Definir plano de retencao de backups (ex: 30 dias).

### 4) Seguranca
- [x] Revisar expiracao e renovacao de tokens JWT (expiracao por env + endpoint de refresh).
- [x] Aplicar rate limit em login e endpoints sensiveis.
- [~] Validar permissao por perfil (`cliente`, `admin`, `super_admin`) em todos endpoints (coberto por dependencies + testes de permissao principais).
- [x] Revisar politicas de senha (minimo de caracteres e complexidade).

### 5) Qualidade e Testes
- [x] Rodar testes automatizados no pipeline antes de deploy (GitHub Actions CI).
- [~] Adicionar testes E2E dos fluxos criticos (cadastro, agendamento, cancelamento, reagendamento) - mitigado com testes de fluxo de API.
- [x] Executar validacao de TypeScript (`admin-web` e `mobile`) no CI.

### 6) Observabilidade
- [x] Centralizar logs da API (middleware de logs de request/response).
- [~] Criar monitoramento de uptime e alertas de erro (endpoint `/healthz` pronto; faltam integrações externas de alerta).
- [x] Monitorar tabela de auditoria (`AuditLog`) para acoes administrativas (endpoint master de consulta).
- [x] Definir dashboard com metricas chave (agendamentos, receita, falhas por rota) - stats existentes + `/observability/metrics`.

### 7) Operacao e Produto
- [ ] Definir politica de suporte e tratamento de incidentes.
- [ ] Documentar processo de aprovacao/suspensao de empresas.
- [ ] Revisar termos de uso e politica de privacidade (LGPD).
- [ ] Planejar rotina de manutencao do banco e atualizacao de dependencias.
