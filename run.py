"""
╔═══════════════════════════════════════════════════════════════╗
║          FAUNA — Wildlife Intelligence System                 ║
║   Real-Time Computer Vision Classification & Telemetry        ║
╚═══════════════════════════════════════════════════════════════╝
"""

import sys
import os
import time
import webbrowser
import threading
from pathlib import Path

# Ensure root directory is in python path
ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR))

def main():
    print("=" * 64)
    print("   🐾  FAUNA — WILDLIFE INTELLIGENCE SYSTEM  🐾")
    print("=" * 64)
    print(" [INIT] Preparing neural inference engine & static assets...")

    # Check model weights
    model_path = ROOT_DIR / "yolov8n.pt"
    if not model_path.exists():
        print(f" [WARN] Model not found at {model_path}. Checking fallback...")
    else:
        print(f" [OK]   YOLOv8 Nano Model Weights verified: {model_path.name}")

    # Check captures folder
    captures_dir = ROOT_DIR / "animal_captures"
    captures_dir.mkdir(parents=True, exist_ok=True)
    existing_captures = len(list(captures_dir.glob("*.jpg")))
    print(f" [OK]   Capture Archive Storage: ./{captures_dir.name}/ ({existing_captures} items)")

    # Check frontend build
    dist_dir = ROOT_DIR / "frontend" / "dist"
    if dist_dir.exists():
        print(f" [OK]   Production Frontend Build verified: ./{dist_dir.relative_to(ROOT_DIR)}/")
    else:
        print(f" [WARN] Production frontend not found at {dist_dir}. Will serve API only.")

    port = 8000
    host = "127.0.0.1"
    url = f"http://{host}:{port}"

    print(f"\n [ONLINE] Launching FAUNA System Server at: {url}")
    print(" [INFO]   Press Ctrl+C to stop.\n")

    # Open browser automatically after short delay
    def _open_browser():
        time.sleep(1.8)
        try:
            webbrowser.open(url)
        except Exception:
            pass

    threading.Thread(target=_open_browser, daemon=True).start()

    try:
        import uvicorn
        from backend.app import app
        uvicorn.run(app, host=host, port=port, log_level="info")
    except ImportError as e:
        print(f"\n[ERROR] Missing required Python package: {e}")
        print("Please ensure fastapi and uvicorn are installed:\n  pip install fastapi uvicorn")
    except Exception as e:
        print(f"\n[ERROR] Failed to run FAUNA server: {e}")

if __name__ == "__main__":
    main()

