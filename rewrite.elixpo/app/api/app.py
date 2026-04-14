"""FastAPI application factory."""

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.middleware import RateLimitMiddleware
from app.api.routes import detect, paraphrase, jobs, sse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


def create_app() -> FastAPI:
    app = FastAPI(
        title="ReWrite API",
        description="AI text detection and paraphrasing API",
        version="1.0.0",
    )

    # CORS — allow frontend origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # tighten in production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Rate limiting
    app.add_middleware(RateLimitMiddleware)

    # Routes
    app.include_router(detect.router)
    app.include_router(paraphrase.router)
    app.include_router(jobs.router)
    app.include_router(sse.router)

    # Global error handler
    @app.exception_handler(Exception)
    async def global_error_handler(request: Request, exc: Exception):
        logging.getLogger("app.api").exception("Unhandled error: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error. Please try again later."},
        )

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.api.app:app", host="0.0.0.0", port=7001, reload=True)
