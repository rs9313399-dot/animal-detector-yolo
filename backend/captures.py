import os
import json
import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from .config import CAPTURES_DIR, ANIMAL_CLASSES

router = APIRouter(prefix="/api/captures", tags=["Captures"])

def parse_capture_file(path: Path) -> Dict[str, Any]:
    """Extracts structured metadata from capture filename and optional sidecar JSON."""
    filename = path.name
    stat = path.stat()
    file_size_kb = round(stat.st_size / 1024, 1)

    animal = "Animal"
    timestamp_str = ""
    count_str = "0000"
    created_dt = datetime.datetime.fromtimestamp(stat.st_mtime)

    # Filename format: {animal}_{YYYYMMDD}_{HHMMSS}_{count}.jpg
    # Example: elephant_20260411_153045_0001.jpg
    parts = path.stem.split("_")
    if len(parts) >= 4:
        animal = parts[0].capitalize()
        date_part = parts[1]
        time_part = parts[2]
        count_str = parts[3]
        try:
            created_dt = datetime.datetime.strptime(f"{date_part}_{time_part}", "%Y%m%d_%H%M%S")
        except Exception:
            pass
    elif len(parts) >= 2:
        animal = parts[0].capitalize()

    confidence: Optional[float] = None
    confidence_pct: Optional[int] = None
    boxes = []

    # Check for sidecar JSON
    sidecar = path.with_suffix(".jpg.json")
    if not sidecar.exists():
        sidecar = path.with_name(f"{filename}.json")

    if sidecar.exists():
        try:
            with open(sidecar, "r", encoding="utf-8") as f:
                data = json.load(f)
                confidence = data.get("confidence")
                confidence_pct = data.get("confidence_pct")
                if confidence is not None and confidence_pct is None:
                    confidence_pct = int(round(confidence * 100))
                boxes = data.get("boxes", [])
                if "animal" in data:
                    animal = data["animal"].capitalize()
        except Exception as e:
            print(f"[FAUNA] Warning: could not parse sidecar for {filename}: {e}")

    # Map color from ANIMAL_CLASSES
    animal_color = "#387B5C"
    for cls_data in ANIMAL_CLASSES.values():
        if cls_data["name"].lower() == animal.lower():
            animal_color = cls_data["hex"]
            break

    return {
        "id": filename,
        "filename": filename,
        "animal": animal,
        "animal_color": animal_color,
        "confidence": confidence,
        "confidence_pct": confidence_pct,
        "boxes": boxes,
        "size_kb": file_size_kb,
        "created_at": created_dt.isoformat(),
        "display_date": created_dt.strftime("%b %d, %Y"),
        "display_time": created_dt.strftime("%I:%M:%S %p"),
        "url": f"/api/captures/{filename}",
        "download_url": f"/api/captures/{filename}/download"
    }

@router.get("", response_model=List[Dict[str, Any]])
def list_captures(
    animal: Optional[str] = Query(None, description="Filter by animal class"),
    search: Optional[str] = Query(None, description="Search term in filename or animal"),
    sort: str = Query("newest", pattern="^(newest|oldest)$")
):
    """Returns all genuine captures from the animal_captures/ directory."""
    if not CAPTURES_DIR.exists():
        return []

    image_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    files = [p for p in CAPTURES_DIR.iterdir() if p.is_file() and p.suffix.lower() in image_extensions]

    results = []
    for p in files:
        item = parse_capture_file(p)

        # Filter by animal
        if animal and animal.lower() != "all":
            if item["animal"].lower() != animal.lower():
                continue

        # Search filter
        if search:
            q = search.lower().strip()
            if q not in item["animal"].lower() and q not in item["filename"].lower():
                continue

        results.append(item)

    # Sort
    results.sort(key=lambda x: x["created_at"], reverse=(sort == "newest"))
    return results

@router.get("/{filename}")
def get_capture_image(filename: str):
    """Serves the actual image bytes safely, preventing directory traversal."""
    # Strict filename sanitation
    safe_name = os.path.basename(filename)
    filepath = CAPTURES_DIR / safe_name

    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail="Capture image not found")

    return FileResponse(
        path=filepath,
        media_type=_image_media_type(filepath),
        filename=safe_name
    )


def _image_media_type(filepath: Path) -> str:
    """Return the correct content type for supported capture formats."""
    return {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }.get(filepath.suffix.lower(), "application/octet-stream")

@router.get("/{filename}/download")
def download_capture_image(filename: str):
    """Downloads the capture image as an attachment."""
    safe_name = os.path.basename(filename)
    filepath = CAPTURES_DIR / safe_name

    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail="Capture image not found")

    return FileResponse(
        path=filepath,
        media_type=_image_media_type(filepath),
        filename=safe_name,
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'}
    )

@router.delete("/{filename}")
def delete_capture(filename: str):
    """Deletes the capture image and any associated sidecar metadata."""
    safe_name = os.path.basename(filename)
    filepath = CAPTURES_DIR / safe_name

    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail="Capture file does not exist")

    try:
        filepath.unlink()
        # Also clean up sidecar if present
        sidecar = CAPTURES_DIR / f"{safe_name}.json"
        if sidecar.exists():
            sidecar.unlink()

        return {"success": True, "message": f"Successfully deleted {safe_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete capture: {str(e)}")
