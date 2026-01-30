"""FastAPI application entry point."""

import asyncio
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI

# Fix for Windows: Use ProactorEventLoop for subprocess support (Playwright)
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

logger = logging.getLogger(__name__)
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config import settings
from app.database import db
from app.pdf import close_pdf_renderer, init_pdf_renderer
from app.routers import config_router, enrichment_router, health_router, jobs_router, resumes_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    # PDF renderer uses lazy initialization - will initialize on first use
    # await init_pdf_renderer()
    yield
    # Shutdown - wrap each cleanup in try-except to ensure all resources are released
    try:
        await close_pdf_renderer()
    except Exception as e:
        logger.error(f"Error closing PDF renderer: {e}")

    try:
        db.close()
    except Exception as e:
        logger.error(f"Error closing database: {e}")


app = FastAPI(
    title="Resume Matcher API",
    description="AI-powered resume tailoring for job descriptions",
    version=__version__,
    lifespan=lifespan,
)

# CORS middleware - origins configurable via CORS_ORIGINS env var
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router, prefix="/api/v1")
app.include_router(config_router, prefix="/api/v1")
app.include_router(resumes_router, prefix="/api/v1")
app.include_router(jobs_router, prefix="/api/v1")
app.include_router(enrichment_router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Resume Matcher API",
        "version": __version__,
        "docs": "/docs",
    }


if __name__ == "__main__":
    import os
    import uvicorn

    # Detect if running in PyInstaller bundle
    is_frozen = getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS')
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO if is_frozen else logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[logging.StreamHandler(sys.stderr)]
    )
    
    if is_frozen:
        logger.info(f"Running as PyInstaller bundle")
        logger.info(f"Listening on {settings.host}:{settings.port}")
    
    try:
        uvicorn.run(
            "app.main:app" if not is_frozen else app,
            host=settings.host,
            port=settings.port,
            reload=not is_frozen,  # Only reload in development
            log_level="info",
        )
    except OSError as e:
        # Address already in use - uvicorn tried to bind twice
        if e.errno == 98 or e.errno == 10048:
            logger.info(f"Port {settings.port} already in use (errno {e.errno}), exiting gracefully")
            sys.exit(0)
        else:
            logger.error(f"Failed to start uvicorn: {e}", exc_info=True)
            sys.exit(1)
    except Exception as e:
        logger.error(f"Failed to start uvicorn: {e}", exc_info=True)
        sys.exit(1)
