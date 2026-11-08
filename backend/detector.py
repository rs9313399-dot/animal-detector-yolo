import cv2
import time
import datetime
import os
import logging
import threading
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from ultralytics import YOLO

from .config import (
    MODEL_PATH, MODEL_PATHS, CAPTURES_DIR, ANIMAL_CLASSES, DEFAULT_CONFIDENCE,
    DEFAULT_COOLDOWN_SECONDS, DEFAULT_IOU_THRESHOLD, DEFAULT_IMAGE_SIZE,
    DEFAULT_TRACKING_ENABLED, DEFAULT_STABILIZATION_FRAMES, DEFAULT_MIN_BOX_AREA_PCT,
)
from .detection_logic import DetectionStabilizer

logger = logging.getLogger("fauna.detector")

class AnimalDetector:
    _instance: Optional["AnimalDetector"] = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(AnimalDetector, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self, model_path: Optional[Path] = None):
        if getattr(self, "_initialized", False):
            return

        self.model_path = Path(model_path or MODEL_PATH)
        self.model_name = self.model_path.stem
        self.model: Optional[YOLO] = None
        self.model_error: Optional[str] = None
        self.model_loaded = False
        self.device = "cpu"
        self.iou_threshold = DEFAULT_IOU_THRESHOLD
        self.image_size = DEFAULT_IMAGE_SIZE
        self.tracking_enabled = DEFAULT_TRACKING_ENABLED
        self.stabilization_frames = DEFAULT_STABILIZATION_FRAMES
        self.min_box_area_pct = DEFAULT_MIN_BOX_AREA_PCT
        self.stabilizer = DetectionStabilizer()
        self.inference_lock = threading.RLock()
        self._last_event_time: Dict[str, float] = {}
        self._tracking_session = None

        # Telemetry & State
        self.total_inferences = 0
        self.total_detections_count = 0
        self.cumulative_animals_detected: Dict[str, int] = {data["name"]: 0 for data in ANIMAL_CLASSES.values()}
        self.recent_detections: List[Dict[str, Any]] = []
        self.last_capture_time: float = 0.0
        self.capture_count: int = 0
        self.prev_frame_time: float = time.time()
        self.current_fps: float = 0.0
        self.inference_ms: float = 0.0
        self.active_classes: set = set(ANIMAL_CLASSES.keys())
        self.confidence_threshold: float = DEFAULT_CONFIDENCE
        self.cooldown_seconds: float = DEFAULT_COOLDOWN_SECONDS
        self.auto_capture_enabled: bool = True

        # Initialize existing capture count from disk
        self._sync_capture_count()

        # Load YOLO model
        self.load_model()
        self._initialized = True

    def _sync_capture_count(self):
        """Count existing images in animal_captures/"""
        try:
            if CAPTURES_DIR.exists():
                images = list(CAPTURES_DIR.glob("*.jpg")) + list(CAPTURES_DIR.glob("*.png")) + list(CAPTURES_DIR.glob("*.jpeg"))
                self.capture_count = len(images)
        except Exception as e:
            logger.exception("Capture directory scan failed")
            self.capture_count = 0

    def load_model(self) -> bool:
        """Loads YOLOv8 model safely once."""
        try:
            if not self.model_path.is_file():
                raise FileNotFoundError(f"Model weights not found: {self.model_path}")
            logger.info("Loading YOLO model from %s", self.model_path)
            self.model = YOLO(str(self.model_path))
            if self.model_path.stem == "animal-best":
                names = self.model.names
                names = [names[index] for index in sorted(names)] if isinstance(names, dict) else list(names)
                expected = [item["name"].lower() for item in ANIMAL_CLASSES.values()]
                if [name.lower() for name in names] != expected:
                    raise ValueError(f"animal-best.pt class order must be {expected}")
            import torch
            self.device = "cuda:0" if torch.cuda.is_available() else "cpu"
            self.model_name = self.model_path.stem
            logger.info("YOLO model loaded on %s", self.device)
            self.model_loaded = True
            self.model_error = None
            return True
        except Exception as e:
            self.model_error = str(e)
            self.model_loaded = False
            logger.exception("YOLO model load failed")
            return False

    def available_models(self) -> List[Dict[str, str]]:
        return [
            {"id": name, "name": name.upper(), "path": path.name}
            for name, path in MODEL_PATHS.items() if path.is_file()
        ]

    def select_model(self, name: str) -> bool:
        path = MODEL_PATHS.get(name)
        if path is None or not path.is_file():
            return False
        with self.inference_lock:
            previous_path, previous_model = self.model_path, self.model
            previous_error, previous_loaded, previous_name = self.model_error, self.model_loaded, self.model_name
            self.model_path = path
            if self.load_model():
                self.reset_tracker()
                return True
            self.model_path, self.model = previous_path, previous_model
            self.model_error, self.model_loaded, self.model_name = previous_error, previous_loaded, previous_name
            return False

    def reset_tracker(self) -> None:
        predictor = getattr(self.model, "predictor", None)
        for tracker in getattr(predictor, "trackers", []):
            tracker.reset()
        self.stabilizer.reset()
        self._tracking_session = None
        self._last_event_time = {key: value for key, value in self._last_event_time.items() if not key.startswith("track:")}

    def detect_frame(self, *args, **kwargs) -> Dict[str, Any]:
        with self.inference_lock:
            return self._detect_frame(*args, **kwargs)

    def _detect_frame(
        self,
        frame: np.ndarray,
        confidence_min: Optional[float] = None,
        save_auto: Optional[bool] = None,
        allowed_classes: Optional[List[int]] = None,
        iou_threshold: Optional[float] = None,
        image_size: Optional[int] = None,
        tracking_enabled: Optional[bool] = None,
        stabilization_frames: Optional[int] = None,
        min_box_area_pct: Optional[float] = None,
        tracking_session: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Runs YOLOv8 detection on a numpy image frame (BGR format from cv2 or RGB).
        Returns structured detection coordinates and metadata.
        """
        if not self.model_loaded or self.model is None:
            # Try reloading once if not loaded
            if not self.load_model():
                return {
                    "error": f"Model not loaded: {self.model_error}",
                    "boxes": [],
                    "found_animals": [],
                    "inference_ms": 0.0,
                    "fps": 0.0,
                    "model_status": "error"
                }

        if not isinstance(frame, np.ndarray) or frame.size == 0 or frame.ndim != 3 or frame.shape[2] != 3:
            return {"error": "Invalid frame: expected a non-empty 3-channel image", "boxes": [],
                    "found_animals": [], "animal_count": 0, "primary_animal": None,
                    "highest_confidence": 0.0, "inference_ms": 0.0, "fps": self.current_fps,
                    "image_dims": {"width": 0, "height": 0}, "timestamp": datetime.datetime.now().isoformat(),
                    "auto_captured": False, "capture_file": None, "model_status": "invalid_frame"}

        conf_threshold = confidence_min if confidence_min is not None else self.confidence_threshold
        auto_capture = save_auto if save_auto is not None else self.auto_capture_enabled
        classes_filter = (set(allowed_classes) if allowed_classes is not None else self.active_classes) & set(ANIMAL_CLASSES)
        iou_threshold = iou_threshold if iou_threshold is not None else self.iou_threshold
        image_size = image_size if image_size is not None else self.image_size
        tracking_enabled = tracking_enabled if tracking_enabled is not None else self.tracking_enabled
        stabilization_frames = stabilization_frames if stabilization_frames is not None else self.stabilization_frames
        min_box_area_pct = min_box_area_pct if min_box_area_pct is not None else self.min_box_area_pct
        custom_class_map = self.model_name == "animal-best"
        model_class_ids = sorted(ANIMAL_CLASSES)
        inference_classes = [model_class_ids.index(class_id) for class_id in sorted(classes_filter)] if custom_class_map else sorted(classes_filter)

        if tracking_enabled and tracking_session and tracking_session != self._tracking_session:
            self.reset_tracker()
            self._tracking_session = tracking_session
        if not classes_filter:
            return {"boxes": [], "found_animals": [], "animal_count": 0, "primary_animal": None,
                    "highest_confidence": 0.0, "inference_ms": 0.0, "fps": self.current_fps,
                    "image_dims": {"width": frame.shape[1], "height": frame.shape[0]},
                    "timestamp": datetime.datetime.now().isoformat(), "auto_captured": False,
                    "capture_file": None, "model_name": self.model_name, "device": self.device,
                    "model_status": "active"}

        h, w = frame.shape[:2]
        now = time.time()

        # Compute running FPS
        dt = now - self.prev_frame_time
        self.prev_frame_time = now
        fps = (1.0 / dt) if dt > 0.0001 else 0.0
        self.current_fps = round(0.85 * self.current_fps + 0.15 * fps, 1)

        t_start = time.perf_counter()
        
        # Inference with YOLOv8
        import torch
        predict = self.model.track if tracking_enabled else self.model.predict
        options = {
            "verbose": False,
            "conf": min(conf_threshold, 0.1) if tracking_enabled else conf_threshold,
            "iou": iou_threshold,
            "imgsz": image_size,
            "classes": inference_classes,
            "max_det": 100,
            "device": self.device,
        }
        if tracking_enabled:
            options.update(persist=True, tracker="bytetrack.yaml")
        try:
            if self.device.startswith("cuda"):
                torch.cuda.synchronize()
            results = predict(frame, **options)[0]
            if self.device.startswith("cuda"):
                torch.cuda.synchronize()
        except Exception as error:
            if not self.device.startswith("cuda"):
                logger.exception("YOLO inference failed")
                return {"error": str(error), "boxes": [], "found_animals": [], "inference_ms": 0.0,
                        "fps": self.current_fps, "model_status": "inference_error"}
            logger.warning("CUDA inference failed; retrying on CPU: %s", error)
            self.device = "cpu"
            options["device"] = "cpu"
            try:
                results = predict(frame, **options)[0]
            except Exception as cpu_error:
                logger.exception("CPU inference fallback failed")
                return {"error": str(cpu_error), "boxes": [], "found_animals": [], "inference_ms": 0.0,
                        "fps": self.current_fps, "model_status": "inference_error"}

        t_end = time.perf_counter()
        inference_ms = round((t_end - t_start) * 1000.0, 1)
        self.inference_ms = inference_ms
        self.total_inferences += 1

        boxes_out = []
        found_animals = []
        highest_conf_animal = "animal"
        highest_conf = 0.0

        for box in results.boxes:
            raw_cls_id = int(box.cls[0])
            cls_id = model_class_ids[raw_cls_id] if custom_class_map and 0 <= raw_cls_id < len(model_class_ids) else raw_cls_id
            conf = float(box.conf[0])

            # Must be one of our 10 target animal classes
            if cls_id not in ANIMAL_CLASSES:
                continue
            if conf < conf_threshold:
                continue

            animal_info = ANIMAL_CLASSES[cls_id]
            animal_name = animal_info["name"]

            x1, y1, x2, y2 = map(int, box.xyxy[0])
            
            # Clamp coordinates to frame bounds
            x1 = max(0, min(w - 1, x1))
            y1 = max(0, min(h - 1, y1))
            x2 = max(0, min(w - 1, x2))
            y2 = max(0, min(h - 1, y2))
            if x2 <= x1 or y2 <= y1:
                continue
            area_pct = ((x2 - x1) * (y2 - y1) / (w * h)) * 100
            if area_pct < min_box_area_pct:
                continue

            # Normalized coordinates (0.0 to 1.0) for responsive frontend overlays
            nx1 = round(x1 / w, 4)
            ny1 = round(y1 / h, 4)
            nx2 = round(x2 / w, 4)
            ny2 = round(y2 / h, 4)

            box_item = {
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2,
                "nx1": nx1,
                "ny1": ny1,
                "nx2": nx2,
                "ny2": ny2,
                "width": x2 - x1,
                "height": y2 - y1,
                "class_id": cls_id,
                "name": animal_name,
                "confidence": round(conf, 4),
                "confidence_pct": int(round(conf * 100)),
                "color": animal_info["color"],
                "hex": animal_info["hex"],
                "scientific": animal_info["scientific"],
                "category": animal_info["category"]
            }
            if tracking_enabled and box.id is not None:
                box_item["track_id"] = int(box.id[0])
            boxes_out.append(box_item)

        boxes_out = self.stabilizer.update(boxes_out, stabilization_frames)
        for item in boxes_out:
            item["nx1"], item["ny1"] = round(item["x1"] / w, 4), round(item["y1"] / h, 4)
            item["nx2"], item["ny2"] = round(item["x2"] / w, 4), round(item["y2"] / h, 4)
            item["width"], item["height"] = item["x2"] - item["x1"], item["y2"] - item["y1"]

        new_events = []
        for box_item in boxes_out:
            animal_name = box_item["name"]
            conf = box_item["confidence"]
            found_animals.append(animal_name)

            if conf > highest_conf:
                highest_conf = conf
                highest_conf_animal = animal_name

            event_key = f"track:{box_item['track_id']}" if "track_id" in box_item else f"class:{animal_name}"
            if now - self._last_event_time.get(event_key, 0) >= 30:
                self._last_event_time[event_key] = now
                self.total_detections_count += 1
                self.cumulative_animals_detected[animal_name] = self.cumulative_animals_detected.get(animal_name, 0) + 1
                new_events.append(box_item)

        # Check for auto-capture
        captured_file = None
        if found_animals and auto_capture:
            if now - self.last_capture_time >= self.cooldown_seconds:
                captured_file = self.save_capture(
                    frame=frame,
                    animal_name=highest_conf_animal,
                    confidence=highest_conf,
                    boxes=boxes_out
                )
                self.last_capture_time = now

        # Record activity
        if new_events:
            event_animals = [item["name"] for item in new_events]
            event_primary = max(new_events, key=lambda item: item["confidence"])
            activity_record = {
                "id": f"act_{int(now * 1000)}",
                "timestamp": datetime.datetime.now().strftime("%H:%M:%S"),
                "date": datetime.datetime.now().strftime("%Y-%m-%d"),
                "animals": event_animals,
                "primary_animal": event_primary["name"],
                "confidence": event_primary["confidence"],
                "count": len(new_events),
                "captured": captured_file is not None,
                "capture_filename": captured_file
            }
            self.recent_detections.insert(0, activity_record)
            if len(self.recent_detections) > 30:
                self.recent_detections.pop()

        return {
            "boxes": boxes_out,
            "found_animals": found_animals,
            "animal_count": len(found_animals),
            "primary_animal": highest_conf_animal if found_animals else None,
            "highest_confidence": round(highest_conf, 4) if found_animals else 0.0,
            "inference_ms": inference_ms,
            "fps": self.current_fps,
            "image_dims": {"width": w, "height": h},
            "timestamp": datetime.datetime.now().isoformat(),
            "auto_captured": captured_file is not None,
            "capture_file": captured_file,
            "model_status": "active",
            "model_name": self.model_name,
            "device": self.device,
            "tracking_enabled": tracking_enabled
        }

    def save_capture(
        self,
        frame: np.ndarray,
        animal_name: str = "animal",
        confidence: Optional[float] = None,
        boxes: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """
        Saves high-res capture to animal_captures/
        Filename format matches original project: {animal}_{timestamp}_{count:04d}.jpg
        Also preserves clean metadata.
        """
        self.capture_count += 1
        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = "".join(c for c in animal_name.lower() if c.isalnum() or c in "_-")
        filename = f"{safe_name}_{ts}_{self.capture_count:04d}.jpg"
        filepath = CAPTURES_DIR / filename

        # Write clean JPEG image with high quality
        if not cv2.imwrite(str(filepath), frame, [cv2.IMWRITE_JPEG_QUALITY, 94]):
            self.capture_count -= 1
            raise OSError(f"Could not write capture image: {filepath}")
        logger.info("Saved capture %s", filename)

        # Write sidecar JSON metadata if confidence provided
        if confidence is not None:
            import json
            meta_path = CAPTURES_DIR / f"{filename}.json"
            meta = {
                "filename": filename,
                "animal": animal_name,
                "confidence": round(confidence, 4),
                "confidence_pct": int(round(confidence * 100)),
                "timestamp": datetime.datetime.now().isoformat(),
                "display_time": datetime.datetime.now().strftime("%b %d, %Y • %I:%M:%S %p"),
                "boxes": boxes or []
            }
            try:
                with open(meta_path, "w", encoding="utf-8") as f:
                    json.dump(meta, f, indent=2)
            except Exception as e:
                logger.exception("Could not write capture metadata for %s", filename)

        return filename

    def get_stats(self) -> Dict[str, Any]:
        """Returns consolidated live metrics for dashboard"""
        return {
            "model_name": self.model_name,
            "model_loaded": self.model_loaded,
            "model_error": self.model_error,
            "device": self.device,
            "fps": self.current_fps,
            "inference_ms": self.inference_ms,
            "total_inferences": self.total_inferences,
            "total_detections": self.total_detections_count,
            "total_captures": self.capture_count,
            "confidence_threshold": self.confidence_threshold,
            "iou_threshold": self.iou_threshold,
            "image_size": self.image_size,
            "tracking_enabled": self.tracking_enabled,
            "stabilization_frames": self.stabilization_frames,
            "min_box_area_pct": self.min_box_area_pct,
            "available_models": self.available_models(),
            "cooldown_seconds": self.cooldown_seconds,
            "auto_capture_enabled": self.auto_capture_enabled,
            "active_classes": list(self.active_classes),
            "cumulative_animals": self.cumulative_animals_detected,
            "recent_activity": self.recent_detections[:15]
        }
