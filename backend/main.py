import os
import time
import logging
from fastapi import FastAPI
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware

from backend.database import create_db
from backend.observability import get_metrics_snapshot, record_request
from backend.routers import auth, barbearias, barbeiros, servicos, agendamentos
from backend.routers import admin, master

app = FastAPI(
    title="BarberApp API",
    description="API para o aplicativo de barbearia - estilo iFood",
    version="1.0.0",
)

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("barberapp")

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "*").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(barbearias.router)
app.include_router(barbeiros.router)
app.include_router(servicos.router)
app.include_router(agendamentos.router)
app.include_router(admin.router)
app.include_router(master.router)


@app.middleware("http")
async def metrics_and_logging_middleware(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - started) * 1000
    record_request(request.url.path, response.status_code)
    logger.info(
        "%s %s status=%s duration_ms=%.2f",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


@app.on_event("startup")
def on_startup():
    create_db()
    print("Banco de dados pronto.")


@app.get("/", tags=["Root"])
def root():
    return {"message": "BarberApp API esta rodando!", "docs": "/docs"}


@app.get("/healthz", tags=["Observability"])
def healthz():
    return {"status": "ok"}


@app.get("/observability/metrics", tags=["Observability"])
def metrics():
    return get_metrics_snapshot()
