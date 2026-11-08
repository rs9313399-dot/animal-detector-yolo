import base64
import time
import os
import cv2
import numpy as np
from pathlib import Path
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Body, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .config import (
    ANIMAL_CLASSES, DEFAULT_CONFIDENCE, DEFAULT_COOLDOWN_SECONDS, CAPTURES_DIR,
    DEFAULT_IOU_THRESHOLD, DEFAULT_IMAGE_SIZE, DEFAULT_TRACKING_ENABLED,
    DEFAULT_STABILIZATION_FRAMES, DEFAULT_MIN_BOX_AREA_PCT,
)
from .detector import AnimalDetector
from .captures import router as captures_router

# ── Lifespan Startup ──────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the singleton detector once on server start
    print("[FAUNA SYSTEM] Initializing FAUNA Core Wildlife Intelligence Engine...")
    detector = AnimalDetector()
    app.state.detector = detector
    app.state.start_time = time.time()
    print(f"[FAUNA SYSTEM] Model ready! Loaded: {detector.model_loaded} (Device: {detector.device})")
    yield
    print("[FAUNA SYSTEM] Shutting down FAUNA Engine.")

app = FastAPI(
    title="FAUNA — Wildlife Intelligence API",
    description="High-performance backend API for YOLOv8 real-time animal detection and telemetry",
    version="2.0.0",
    lifespan=lifespan
)

# ── CORS Setup ────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register captures router
app.include_router(captures_router)

# ── Request / Response Models ─────────────────────────────────────────────────
class DetectRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded frame or data URL")
    confidence: Optional[float] = Field(None, ge=0.05, le=0.99)
    auto_capture: Optional[bool] = Field(None)
    allowed_classes: Optional[List[int]] = Field(None)
    iou_threshold: Optional[float] = Field(None, ge=0.1, le=0.95)
    image_size: Optional[int] = Field(None, ge=320, le=1280)
    tracking_enabled: Optional[bool] = None
    stabilization_frames: Optional[int] = Field(None, ge=1, le=5)
    min_box_area_pct: Optional[float] = Field(None, ge=0, le=25)
    tracking_session: Optional[str] = Field(None, max_length=80)

class ManualCaptureRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded frame or data URL")
    animal: Optional[str] = "animal"
    confidence: Optional[float] = None
    boxes: Optional[List[Dict[str, Any]]] = None

class SettingsUpdate(BaseModel):
    confidence_threshold: Optional[float] = Field(None, ge=0.05, le=0.99)
    cooldown_seconds: Optional[float] = Field(None, ge=0.5, le=30.0)
    auto_capture_enabled: Optional[bool] = None
    active_classes: Optional[List[int]] = None
    iou_threshold: Optional[float] = Field(None, ge=0.1, le=0.95)
    image_size: Optional[int] = Field(None, ge=320, le=1280)
    tracking_enabled: Optional[bool] = None
    stabilization_frames: Optional[int] = Field(None, ge=1, le=5)
    min_box_area_pct: Optional[float] = Field(None, ge=0, le=25)
    model_name: Optional[str] = None

def decode_base64_image(b64_string: str) -> np.ndarray:
    """Safely decode data URL or base64 string to OpenCV BGR numpy array."""
    try:
        if "," in b64_string:
            b64_string = b64_string.split(",", 1)[1]
        img_bytes = base64.b64decode(b64_string)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None or frame.size == 0:
            raise ValueError("Decoded image frame is empty or invalid format")
        return frame
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

# ── API Endpoints ─────────────────────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    detector = AnimalDetector()
    return {
        "status": "operational",
        "service": "FAUNA Wildlife Intelligence Engine",
        "model_loaded": detector.model_loaded,
        "device": detector.device,
        "timestamp": time.time()
    }

@app.get("/api/status")
def system_status():
    detector = AnimalDetector()
    uptime_sec = round(time.time() - getattr(app.state, "start_time", time.time()), 1)
    stats = detector.get_stats()
    stats["uptime_seconds"] = uptime_sec
    stats["supported_animals"] = [
        {
            "class_id": cid,
            "name": cdata["name"],
            "hex": cdata["hex"],
            "scientific": cdata["scientific"],
            "category": cdata["category"],
            "iucn": cdata["iucn"]
        }
        for cid, cdata in ANIMAL_CLASSES.items()
    ]
    return stats

@app.post("/api/detect")
def detect_frame_endpoint(req: DetectRequest):
    """
    Primary real-time detection endpoint.
    Receives frame from browser webcam, runs YOLO inference, returns exact coordinates.
    """
    frame = decode_base64_image(req.image)
    detector = AnimalDetector()

    result = detector.detect_frame(
        frame=frame,
        confidence_min=req.confidence,
        save_auto=req.auto_capture,
        allowed_classes=req.allowed_classes,
        iou_threshold=req.iou_threshold,
        image_size=req.image_size,
        tracking_enabled=req.tracking_enabled,
        stabilization_frames=req.stabilization_frames,
        min_box_area_pct=req.min_box_area_pct,
        tracking_session=req.tracking_session,
    )
    if result.get("model_status") in {"error", "inference_error"}:
        raise HTTPException(status_code=503, detail=result.get("error", "Detection model unavailable"))
    return result

@app.post("/api/capture")
def manual_capture_endpoint(req: ManualCaptureRequest):
    """
    Handles manual user screenshot capture.
    Saves high quality image directly to animal_captures/ folder.
    """
    frame = decode_base64_image(req.image)
    detector = AnimalDetector()

    filename = detector.save_capture(
        frame=frame,
        animal_name=req.animal or "Manual_Capture",
        confidence=req.confidence,
        boxes=req.boxes
    )

    return {
        "success": True,
        "filename": filename,
        "url": f"/api/captures/{filename}",
        "download_url": f"/api/captures/{filename}/download",
        "timestamp": time.time(),
        "total_captures": detector.capture_count
    }

@app.get("/api/settings")
def get_settings():
    detector = AnimalDetector()
    return {
        "confidence_threshold": detector.confidence_threshold,
        "iou_threshold": detector.iou_threshold,
        "image_size": detector.image_size,
        "tracking_enabled": detector.tracking_enabled,
        "stabilization_frames": detector.stabilization_frames,
        "min_box_area_pct": detector.min_box_area_pct,
        "model_name": detector.model_name,
        "available_models": detector.available_models(),
        "cooldown_seconds": detector.cooldown_seconds,
        "auto_capture_enabled": detector.auto_capture_enabled,
        "active_classes": list(detector.active_classes),
        "supported_classes": [
            {"id": cid, "name": cdata["name"], "hex": cdata["hex"], "category": cdata["category"]}
            for cid, cdata in ANIMAL_CLASSES.items()
        ]
    }

@app.post("/api/settings")
def update_settings(settings: SettingsUpdate):
    detector = AnimalDetector()
    if settings.active_classes is not None and not set(settings.active_classes).issubset(ANIMAL_CLASSES):
        raise HTTPException(status_code=400, detail="active_classes contains an unsupported class id")
    if settings.confidence_threshold is not None:
        detector.confidence_threshold = settings.confidence_threshold
    if settings.iou_threshold is not None:
        detector.iou_threshold = settings.iou_threshold
    if settings.image_size is not None:
        detector.image_size = settings.image_size
    if settings.stabilization_frames is not None:
        detector.stabilization_frames = settings.stabilization_frames
    if settings.min_box_area_pct is not None:
        detector.min_box_area_pct = settings.min_box_area_pct
    if settings.tracking_enabled is not None and settings.tracking_enabled != detector.tracking_enabled:
        detector.tracking_enabled = settings.tracking_enabled
        detector.reset_tracker()
    if settings.model_name is not None and settings.model_name != detector.model_name:
        if not detector.select_model(settings.model_name):
            raise HTTPException(status_code=400, detail=f"Model weights are not available locally: {settings.model_name}")
    if settings.cooldown_seconds is not None:
        detector.cooldown_seconds = settings.cooldown_seconds
    if settings.auto_capture_enabled is not None:
        detector.auto_capture_enabled = settings.auto_capture_enabled
    if settings.active_classes is not None:
        detector.active_classes = set(settings.active_classes)

    return {
        "success": True,
        "message": "Settings updated successfully",
        "current_settings": {
            "confidence_threshold": detector.confidence_threshold,
            "iou_threshold": detector.iou_threshold,
            "image_size": detector.image_size,
            "tracking_enabled": detector.tracking_enabled,
            "stabilization_frames": detector.stabilization_frames,
            "min_box_area_pct": detector.min_box_area_pct,
            "model_name": detector.model_name,
            "available_models": detector.available_models(),
            "cooldown_seconds": detector.cooldown_seconds,
            "auto_capture_enabled": detector.auto_capture_enabled,
            "active_classes": list(detector.active_classes)
        }
    }

# Mount frontend if built
dist_dir = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if dist_dir.exists():
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="static")
