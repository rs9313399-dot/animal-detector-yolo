import os
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "yolov8n.pt"
MODEL_PATHS = {
    "yolov8n": BASE_DIR / "yolov8n.pt",
    "yolov8s": BASE_DIR / "yolov8s.pt",
    "animal-best": BASE_DIR / "models" / "animal-best.pt",
}
CAPTURES_DIR = BASE_DIR / "animal_captures"

# Ensure captures directory exists
CAPTURES_DIR.mkdir(parents=True, exist_ok=True)

# 10 Animal classes to monitor (filtered from YOLOv8 80 COCO classes)
# Format: class_id: (display_name, (R, G, B), scientific_name, category)
ANIMAL_CLASSES = {
    14: {
        "name": "Bird",
        "color": (255, 200, 0),
        "hex": "#FFC800",
        "scientific": "Aves",
        "category": "Wild / Domestic",
        "iucn": "Varies by Species"
    },
    15: {
        "name": "Cat",
        "color": (0, 200, 255),
        "hex": "#00C8FF",
        "scientific": "Felis catus",
        "category": "Domestic",
        "iucn": "Domesticated"
    },
    16: {
        "name": "Dog",
        "color": (0, 140, 255),
        "hex": "#008CFF",
        "scientific": "Canis lupus familiaris",
        "category": "Domestic",
        "iucn": "Domesticated"
    },
    17: {
        "name": "Horse",
        "color": (180, 0, 255),
        "hex": "#B400FF",
        "scientific": "Equus caballus",
        "category": "Domestic",
        "iucn": "Domesticated"
    },
    18: {
        "name": "Sheep",
        "color": (255, 100, 200),
        "hex": "#FF64C8",
        "scientific": "Ovis aries",
        "category": "Domestic Livestock",
        "iucn": "Domesticated"
    },
    19: {
        "name": "Cow",
        "color": (0, 255, 180),
        "hex": "#00FFB4",
        "scientific": "Bos taurus",
        "category": "Domestic Livestock",
        "iucn": "Domesticated"
    },
    20: {
        "name": "Elephant",
        "color": (0, 200, 80),
        "hex": "#00C850",
        "scientific": "Loxodonta / Elephas",
        "category": "Wild Megafauna",
        "iucn": "Endangered"
    },
    21: {
        "name": "Bear",
        "color": (0, 60, 255),
        "hex": "#003CFF",
        "scientific": "Ursidae",
        "category": "Wild Predator",
        "iucn": "Vulnerable"
    },
    22: {
        "name": "Zebra",
        "color": (200, 200, 200),
        "hex": "#C8C8C8",
        "scientific": "Equus quagga",
        "category": "Wild Herbivore",
        "iucn": "Near Threatened"
    },
    23: {
        "name": "Giraffe",
        "color": (30, 180, 255),
        "hex": "#1EB4FF",
        "scientific": "Giraffa camelopardalis",
        "category": "Wild Herbivore",
        "iucn": "Vulnerable"
    },
}

# Detection Defaults
DEFAULT_CONFIDENCE = 0.45
DEFAULT_IOU_THRESHOLD = 0.55
DEFAULT_IMAGE_SIZE = 640
DEFAULT_TRACKING_ENABLED = False
DEFAULT_STABILIZATION_FRAMES = 1
DEFAULT_MIN_BOX_AREA_PCT = 0.0
DEFAULT_COOLDOWN_SECONDS = 3.0
DEFAULT_SAVE_AUTO_CAPTURES = True
DEFAULT_ALERT_SOUND = True
