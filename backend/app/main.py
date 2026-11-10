
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.connection import close_database
from app.api.health import router as health_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting TaskPilot backend...")

    yield

    await close_database()
    print("TaskPilot backend stopped.")


app = FastAPI(
    title=settings.APP_NAME,
    description="Autonomous AI Task Worker",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)


@app.get("/")
async def root():
    return {
        "message": "Welcome to TaskPilot API",
        "version": "0.1.0",
    }
