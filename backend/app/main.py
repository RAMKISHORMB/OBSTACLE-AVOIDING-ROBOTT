import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.endpoints import router as api_router
from .core.config import settings
from .services.robot_manager import robot_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Background simulation physics loop running at 40 Hz (25 ms interval)."""
    running = True

    async def physics_loop():
        last_t = asyncio.get_event_loop().time()
        while running:
            now = asyncio.get_event_loop().time()
            dt = min(0.05, now - last_t)
            last_t = now

            # Step physics and navigation logic
            robot_manager.step(dt)

            await asyncio.sleep(0.025)

    task = asyncio.create_task(physics_loop())
    yield
    running = False
    task.cancel()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API and Real-Time WebSocket Telemetry for Autonomous Obstacle Avoiding Robot Simulation",
    lifespan=lifespan,
)

# Enable CORS for local Vite development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_PREFIX)
app.include_router(api_router)  # Also support direct /ws/robot without prefix


@app.get("/")
async def root():
    return {
        "title": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/api/health",
        "websocket": "/ws/robot",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
