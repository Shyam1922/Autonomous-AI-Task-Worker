import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.agent.manager import manager
from app.api.demo import router as demo_router
from app.api.health import router as health_router
from app.api.tasks import router as tasks_router
from app.core.config import settings
from app.database.connection import close_database, init_database

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("taskpilot")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_database()
    log.info("LLM provider: %s", settings.resolved_llm_provider)
    resumed = await manager.resume_interrupted()
    if resumed:
        log.info("Resumed %d interrupted task(s)", resumed)

    yield

    await manager.shutdown()
    await close_database()


app = FastAPI(
    title=settings.APP_NAME,
    description="Autonomous AI Task Worker",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(tasks_router)
app.include_router(demo_router)


@app.get("/")
async def root():
    return {"message": "Welcome to TaskPilot API", "version": app.version, "docs": "/docs"}
