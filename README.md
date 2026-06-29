# Animal Detector YOLO

Animal Detector YOLO is a real-time webcam animal detection project built with Python, OpenCV, and YOLOv8. It filters YOLO detections to animal classes and saves captures when animals are found.

## Highlights

- Real-time webcam detection using YOLOv8.
- Detects selected animal classes: bird, cat, dog, horse, sheep, cow, elephant, bear, zebra, and giraffe.
- Confidence threshold filtering for cleaner results.
- Live HUD with FPS, detected animal names, and capture count.
- Styled bounding boxes and labels for each detection.
- Auto-captures frames with cooldown to avoid duplicate saves.
- Manual screenshot control.
- Included `yolov8n.pt` model file for quick local setup.

## Tech Stack

| Area | Tools |
| --- | --- |
| Language | Python |
| Computer vision | OpenCV |
| Object detection | Ultralytics YOLOv8 |
| Model | YOLOv8 Nano |

## Project Structure

```text
animal-detector-yolo/
├── animal_detector.py   # Main webcam detection app
├── yolov8n.pt           # YOLOv8 Nano model
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.9+
- Webcam access

### Installation

```bash
git clone https://github.com/rs9313399-dot/animal-detector-yolo.git
cd animal-detector-yolo
python -m venv .venv
.venv\Scripts\activate
pip install opencv-python ultralytics
```

For macOS/Linux:

```bash
source .venv/bin/activate
```

### Run

```bash
python animal_detector.py
```

## Controls

| Key | Action |
| --- | --- |
| `Q` | Quit |
| `S` | Save a manual screenshot |

## Output

Captured frames are saved in:

```text
animal_captures/
```

Example filename:

```text
elephant_20260411_153045_0001.jpg
```

## Notes

- Detection quality depends on camera clarity, lighting, and model confidence.
- The included YOLOv8 Nano model is optimized for speed, not maximum accuracy.

## Author

Built by [Ratnesh Singh](https://github.com/rs9313399-dot).

