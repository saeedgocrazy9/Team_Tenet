"""
Kayda Sathi — FastAPI Backend
Endpoints: /api/triage, /api/triage-voice, /api/scan-clause
"""

from __future__ import annotations

import json
import os
import tempfile
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq

from schemas import (
    TriageRequest,
    TriageResponse,
    ClauseScanRequest,
    ClauseScanResponse,
)
from prompts import get_triage_system_prompt, get_clause_scanner_prompt

# ── Load environment ─────────────────────────────────────────────────────────
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY not found. Create a .env file — see .env.example")

# ── Groq client ──────────────────────────────────────────────────────────────
client = Groq(api_key=GROQ_API_KEY)

# LLM model for reasoning (Llama 3.3 70B — best balance of quality + speed on Groq)
REASONING_MODEL = "llama-3.3-70b-versatile"
# STT model for voice transcription
STT_MODEL = "whisper-large-v3"


# ── App lifecycle ────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown events."""
    print("🚀 Kayda Sathi backend is live!")
    print(f"   Reasoning model : {REASONING_MODEL}")
    print(f"   STT model       : {STT_MODEL}")
    yield
    print("👋 Shutting down Kayda Sathi backend.")


# ── FastAPI app ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="Kayda Sathi API",
    description="Legal First-Aid Kit for Indian Citizens — AI-powered triage, "
                "document checklist, legal notice drafting, and unfair clause detection.",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow all origins for hackathon (mobile app on different IP)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helper: Call Groq for structured JSON ────────────────────────────────────

def _call_groq_json(system_prompt: str, user_message: str, response_model_schema: dict) -> dict:
    """
    Call Groq LLM with a system prompt and user message.
    Forces JSON output matching the provided schema.
    """
    schema_str = json.dumps(response_model_schema, indent=2)

    full_system = (
        f"{system_prompt}\n\n"
        f"## OUTPUT FORMAT\n"
        f"You MUST respond with a valid JSON object that exactly matches this schema:\n"
        f"```json\n{schema_str}\n```\n\n"
        f"Respond ONLY with the JSON. No markdown, no explanation, no extra text."
    )

    chat_completion = client.chat.completions.create(
        model=REASONING_MODEL,
        messages=[
            {"role": "system", "content": full_system},
            {"role": "user", "content": user_message},
        ],
        temperature=0.3,  # Low temp for factual accuracy
        max_tokens=4096,
        response_format={"type": "json_object"},
    )

    raw = chat_completion.choices[0].message.content
    if not raw:
        raise HTTPException(status_code=500, detail="Empty response from AI model")

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {e}")


def _transcribe_audio(file_path: str, language: str = "auto") -> str:
    """Transcribe audio file using Groq Whisper."""
    with open(file_path, "rb") as audio_file:
        kwargs = {
            "file": ("audio.m4a", audio_file),
            "model": STT_MODEL,
            "response_format": "text",
        }
        # Only set language if explicitly specified (not auto)
        if language and language != "auto":
            lang_map = {"hi": "hi", "en": "en", "ta": "ta", "kn": "kn", "hinglish": "hi"}
            kwargs["language"] = lang_map.get(language, language)

        transcription = client.audio.transcriptions.create(**kwargs)

    return transcription.strip() if isinstance(transcription, str) else str(transcription).strip()


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "app": "Kayda Sathi API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": ["/api/triage", "/api/triage-voice", "/api/scan-clause"],
    }


@app.post("/api/triage", response_model=TriageResponse)
async def triage_text(request: TriageRequest):
    """
    Process a text-based legal problem and return a structured action kit.

    Input: Plain language description of a legal issue (English/Hindi/Hinglish).
    Output: Complete triage with rights summary, documents, steps, and legal notice.
    """
    system_prompt = get_triage_system_prompt()

    user_message = f"User's legal problem:\n\n{request.user_input}"
    if request.language != "auto":
        user_message += f"\n\n(User's language: {request.language})"

    result = _call_groq_json(
        system_prompt=system_prompt,
        user_message=user_message,
        response_model_schema=TriageResponse.model_json_schema(),
    )

    try:
        return TriageResponse.model_validate(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Response validation failed: {e}")


@app.post("/api/triage-voice", response_model=TriageResponse)
async def triage_voice(
    audio: UploadFile = File(..., description="Audio file (.m4a, .wav, .mp3, .webm)"),
    language: str = Form(default="auto", description="Language hint: auto, en, hi, ta, kn, hinglish"),
):
    """
    Process a voice-based legal problem.

    1. Transcribes audio via Whisper (supports Hindi, Tamil, Kannada, English, Hinglish).
    2. Feeds transcript to the triage AI.
    3. Returns the same structured action kit as /api/triage.
    """
    # Save uploaded audio to temp file
    suffix = os.path.splitext(audio.filename or "audio.m4a")[1] or ".m4a"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Step 1: Transcribe
        transcript = _transcribe_audio(tmp_path, language)
        if not transcript:
            raise HTTPException(status_code=400, detail="Could not transcribe audio. Please try again.")

        # Step 2: Triage the transcript
        system_prompt = get_triage_system_prompt()
        user_message = (
            f"User's legal problem (transcribed from voice):\n\n{transcript}"
            f"\n\n(Original language: {language})"
        )

        result = _call_groq_json(
            system_prompt=system_prompt,
            user_message=user_message,
            response_model_schema=TriageResponse.model_json_schema(),
        )

        response = TriageResponse.model_validate(result)
        return response

    finally:
        # Clean up temp file
        os.unlink(tmp_path)


@app.post("/api/scan-clause", response_model=ClauseScanResponse)
async def scan_clause(request: ClauseScanRequest):
    """
    Scan a contract/agreement for unfair, illegal, or deceptive clauses.

    Input: Contract text (rental agreement, T&C, employment contract, etc.).
    Output: Flagged clauses with severity, explanations, and fairness score.
    """
    system_prompt = get_clause_scanner_prompt()
    user_message = f"Analyze the following contract/agreement:\n\n{request.contract_text}"

    result = _call_groq_json(
        system_prompt=system_prompt,
        user_message=user_message,
        response_model_schema=ClauseScanResponse.model_json_schema(),
    )

    try:
        return ClauseScanResponse.model_validate(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Response validation failed: {e}")


# ── Health check ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "healthy", "model": REASONING_MODEL, "stt": STT_MODEL}


# ── Run ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
