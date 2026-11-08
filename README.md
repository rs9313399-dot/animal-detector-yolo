# 🐾 FAUNA — Wildlife Intelligence System

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-00FFFF?style=flat)](https://github.com/ultralytics/ultralytics)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev)

**FAUNA** is an enterprise-grade wildlife intelligence platform and computer vision monitoring system. It unites state-of-the-art **Ultralytics YOLOv8** real-time neural inference with a refined **Bold Minimalist Editorial UI** tailored for professional field observers, researchers, and wildlife conservationists.

---

## 🏛️ System Architecture

```
animal-detector-yolo-main/
├── backend/
│   ├── app.py                 # FastAPI REST API & static distribution router
│   ├── detector.py            # Singleton YOLOv8 detection engine & telemetry
│   ├── captures.py            # Vault file management & metadata extraction
│   └── config.py              # System thresholds, paths & COCO species definitions
├── frontend/
│   ├── src/
│   │   ├── components/        # Dashboard, LiveStudio, HistoryGallery, Explorer, Settings
│   │   ├── constants/         # Species taxonomy & biological dossiers
│   │   ├── services/          # Real-time API client & Web Audio synthesizer
│   │   ├── styles/            # Bold Minimalist custom design system
│   │   ├── types.ts           # Strict TypeScript contracts
│   │   ├── App.tsx            # Main application shell
│   │   └── main.tsx           # React entry point
│   ├── package.json           # Frontend dependency manifest
│   └── vite.config.ts         # High-speed Vite bundler configuration
├── animal_captures/           # Local vault of captured visual telemetry
├── datasets/                   # Dataset and labeling instructions
├── tools/animal_pipeline.py    # Dataset validation, training, and benchmarking
├── benchmarks/                 # Benchmark status and generated reports
├── yolov8n.pt                 # YOLOv8 Nano PyTorch model weights (verified)
├── animal_detector.py         # Original standalone CLI detection script
├── run.py                     # Single-command unified application launcher
└── requirements.txt           # Python dependency specifications
```

---

## ✨ Key Capabilities

### 1. Main Dashboard
- **Operational Command**: Live optical sensor status, cumulative species counts, vault volume, and current inference latency.
- **Recent Activity Stream**: Chronological feed of detected fauna with confidence bars, class badges, and timestamped capture markers.
- **Hardware Telemetry**: Real-time display of PyTorch compute device (CPU/CUDA) and tensor dimensions (640x640).

### 2. Live Detection Studio
- **Direct Optical Sensor Access**: Connects to any webcam using `navigator.mediaDevices.getUserMedia` with device switching and resolution controls.
- **Real-Time YOLOv8 Inference**: Streams frames to the Python backend; renders exact bounding box coordinates with signature corner accent brackets.
- **Audio Telemetry**: Harmonic dual-frequency alert chimes synthesized in-browser via the Web Audio API upon target acquisition.
- **Instant Snapshots**: Dedicated manual snapshot button with mechanical shutter sound and flash animation.
- **Autonomous Capture Protocol**: Automatically commits high-resolution snapshots to `./animal_captures/` with configurable cooldown intervals.

### 3. Visual Evidence Vault (Detection History)
- **Authentic Local Records**: Directly indexes and serves files from `./animal_captures/`.
- **Search & Filter Matrix**: Filter by animal class, search by filename/species, and sort by timestamp.
- **Inspection Modal**: High-resolution image preview, exact bounding box metadata, and direct download/delete actions.

### 4. Species Taxonomy Explorer
- **Scientific Dossiers**: Comprehensive field guide for all 10 monitored COCO animal classes.
- **Biological Data**: Binomial nomenclature, IUCN Red List conservation ratings, habitat descriptions, and YOLO visual identifiers.

### 5. System Configuration
- **Parameter Control**: Adjustable confidence thresholds (0.10 to 0.95), cooldown timers (1s to 15s), and audio alerts.
- **Selective Class Whitelisting**: Mute or enable specific animal species to tailor detection sensitivity.

---

## 🦏 Monitored Animal Classes

| Class ID | Species | Scientific Name | Category | IUCN Status |
| :---: | :--- | :--- | :--- | :--- |
| **14** | Bird | *Aves* | Avian Wildlife | Species Dependent |
| **15** | Cat | *Felis catus* | Carnivore (Felidae) | Domesticated |
| **16** | Dog | *Canis lupus familiaris* | Carnivore (Canidae) | Domesticated |
| **17** | Horse | *Equus caballus* | Perissodactyla (Equidae) | Domesticated |
| **18** | Sheep | *Ovis aries* | Artiodactyla (Bovidae) | Domesticated |
| **19** | Cow | *Bos taurus* | Artiodactyla (Bovidae) | Domesticated |
| **20** | Elephant | *Loxodonta / Elephas* | Proboscidea (Elephantidae) | Endangered |
| **21** | Bear | *Ursidae* | Carnivore (Ursidae) | Vulnerable |
| **22** | Zebra | *Equus quagga* | Perissodactyla (Equidae) | Near Threatened |
| **23** | Giraffe | *Giraffa camelopardalis* | Artiodactyla (Giraffidae) | Vulnerable |

---

## 🚀 Quickstart

### 1. Installation
Clone the repository and install the backend requirements:
```bash
git clone https://github.com/rs9313399-dot/animal-detector-yolo.git
cd animal-detector-yolo
pip install -r requirements.txt
```

### 2. Launching the Platform
Run the unified application launcher:
```bash
python run.py
```
*The launcher initializes the YOLOv8 model, starts the FastAPI server on port 8000, and automatically opens `http://127.0.0.1:8000` in your default browser.*

---

## 🛠️ Developer Workflow

### Running in Development Mode
To develop with live hot-module reloading:

1. **Start the FastAPI Backend**:
   ```bash
   uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
   ```

2. **Start the Vite Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Navigate to `http://localhost:3000`. API requests to `/api` are automatically proxied to port 8000.

### Compiling Production Frontend
```bash
cd frontend
npm run build
```
*Outputs an optimized, zero-dependency distribution to `frontend/dist/` which is natively mounted by FastAPI.*

### Detection Controls

The System Settings page exposes confidence, NMS IoU, inference image size, ByteTrack, consecutive-frame stabilization, minimum box area, and locally available model weights. Settings are sent to the backend; image size and filtering are applied to each inference request. YOLOv8n remains the fallback. YOLOv8s or the custom fine-tuned model appears only after its compatible weight file is present locally. Missing weights are reported instead of downloaded implicitly.

ByteTrack IDs persist across webcam frames and appear beside labels. The dashboard's cumulative animal counts are throttled to detection events (tracked IDs and untracked same-class events are both throttled for 30 seconds). Counts are therefore event counts, not a guaranteed census of unique animals.

### Dataset, Training, and Benchmarking

See [datasets/README.md](datasets/README.md) for the YOLO label schema, split layout, validation, training, and annotation guidance. `tools/animal_pipeline.py` validates labels, creates a deterministic 70/20/10 split, fine-tunes from local weights, exports `models/animal-best.pt`, and evaluates the held-out test set.

No labeled dataset is included, so this repository currently has **no valid precision, recall, mAP, false-positive, or missed-detection benchmark**. The baseline/candidate benchmark command and its outputs are described in [benchmarks/README.md](benchmarks/README.md); do not treat higher image size or different thresholds as an accuracy improvement until that fair comparison is run.

Run the lightweight logic checks and frontend compile with:

```bash
python -m unittest discover -s tests
cd frontend && npm run build
```

---

## 📄 License
This project contains references to more than one license; review the applicable source and model terms before redistribution. Ultralytics states its code and trained models are offered under AGPL-3.0 or an Enterprise license: [official license guidance](https://www.ultralytics.com/license).
