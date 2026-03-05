"""
PromptGuard 2 sidecar — classifies text for prompt injection / jailbreak attempts.

Model: meta-llama/Llama-Prompt-Guard-2-22M (fast, CPU-friendly, English)
       meta-llama/Llama-Prompt-Guard-2-86M (multilingual, more accurate)

Requires a HuggingFace token with access to the gated model.
Set HUGGINGFACE_TOKEN in your .env or environment before running.

Usage:
    pip install -r requirements.txt
    python server.py

Endpoints:
    POST /classify   {"text": "..."} -> {"label": "BENIGN"|"INJECTION"|"JAILBREAK", "score": 0.99}
    GET  /health     -> {"status": "ok"}
"""

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_ID = os.getenv("PROMPT_GUARD_MODEL", "meta-llama/Llama-Prompt-Guard-2-22M")
HF_TOKEN = os.getenv("HUGGINGFACE_TOKEN")
PORT = int(os.getenv("PROMPT_GUARD_PORT", "8002"))

classifier = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global classifier
    logger.info(f"Loading model: {MODEL_ID}")
    classifier = pipeline(
        "text-classification",
        model=MODEL_ID,
        token=HF_TOKEN,
        device=-1,  # CPU; set to 0 for GPU
    )
    logger.info("Model ready")
    yield


app = FastAPI(lifespan=lifespan)


class ClassifyRequest(BaseModel):
    text: str


class ClassifyResponse(BaseModel):
    label: str
    score: float


@app.post("/classify", response_model=ClassifyResponse)
def classify(req: ClassifyRequest):
    result = classifier(req.text, truncation=True, max_length=512)[0]
    logger.info(f"label={result['label']} score={result['score']:.3f}")
    return ClassifyResponse(label=result["label"], score=result["score"])


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
