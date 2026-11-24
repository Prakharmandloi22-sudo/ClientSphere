from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import lead_processing, sales_intelligence

app = FastAPI(
    title="ClientSphere Sales Intelligence & Lead Processing Service",
    description="Dedicated microservice for CSV lead processing, duplicate detection, explainable scoring, sales velocity, and forecasting.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(lead_processing.router)
app.include_router(sales_intelligence.router)

@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "ClientSphere-Analytics-Engine",
        "version": "1.0.0",
    }

@app.get("/ready")
def readiness_check():
    return {
        "status": "READY",
        "service": "ClientSphere-Analytics-Engine",
    }
