"""
╔══════════════════════════════════════════════╗
║     Real-Time Animal Detector — YOLOv8       ║
╚══════════════════════════════════════════════╝
"""

import cv2
import time
import datetime
import os
import threading
from ultralytics import YOLO

# ─── CONFIG ───────────────────────────────────────────────────────────────────

CAMERA_INDEX     = 0
SAVE_DIR         = "animal_captures"
COOLDOWN_SECONDS = 3
CONFIDENCE_MIN   = 0.45       # 45% se kam confidence = ignore

# ─── Sirf ye animals detect karega (YOLO ke 80 classes mein se filter) ────────

ANIMAL_CLASSES = {
    14: ("Bird",     (255, 200, 0)),
    15: ("Cat",      (0, 200, 255)),
    16: ("Dog",      (0, 140, 255)),
    17: ("Horse",    (180, 0, 255)),
    18: ("Sheep",    (255, 100, 200)),
    19: ("Cow",      (0, 255, 180)),
    20: ("Elephant", (0, 200, 80)),
    21: ("Bear",     (0, 60, 255)),
    22: ("Zebra",    (200, 200, 200)),
    23: ("Giraffe",  (30, 180, 255)),
}

# ──────────────────────────────────────────────────────────────────────────────
# MODULE 1 — Setup
# ──────────────────────────────────────────────────────────────────────────────

def setup():
    os.makedirs(SAVE_DIR, exist_ok=True)
    print("[SETUP] Save directory ready!")

    print("[SETUP] YOLOv8 model load ho raha hai... (pehli baar thoda time lagega)")
    model = YOLO("yolov8n.pt")   # 'n' = nano, fastest model
    print("[SETUP] Model ready!")

    cap = cv2.VideoCapture(CAMERA_INDEX)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    if not cap.isOpened():
        print("[ERROR] Camera nahi khul raha!")
        exit(1)

    print(f"[SETUP] Camera ready!")
    return model, cap


# ──────────────────────────────────────────────────────────────────────────────
# MODULE 2 — Sound
# ──────────────────────────────────────────────────────────────────────────────

def play_beep():
    def _b():
        try:
            import winsound
            winsound.Beep(800, 300)
        except:
            print('\a', end='', flush=True)
    threading.Thread(target=_b, daemon=True).start()


# ──────────────────────────────────────────────────────────────────────────────
# MODULE 3 — Draw Box
# ──────────────────────────────────────────────────────────────────────────────

def draw_animal_box(frame, x1, y1, x2, y2, name, conf, color):
    # Main rectangle
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

    # Corner accents
    cl = 20
    t  = 3
    cv2.line(frame, (x1,y1), (x1+cl,y1), color, t)
    cv2.line(frame, (x1,y1), (x1,y1+cl), color, t)
    cv2.line(frame, (x2,y1), (x2-cl,y1), color, t)
    cv2.line(frame, (x2,y1), (x2,y1+cl), color, t)
    cv2.line(frame, (x1,y2), (x1+cl,y2), color, t)
    cv2.line(frame, (x1,y2), (x1,y2-cl), color, t)
    cv2.line(frame, (x2,y2), (x2-cl,y2), color, t)
    cv2.line(frame, (x2,y2), (x2,y2-cl), color, t)

    # Label
    label  = f"{name}  {int(conf*100)}%"
    lbl_y  = y1 - 10 if y1 > 20 else y1 + 20
    (lw, lh), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
    cv2.rectangle(frame, (x1, lbl_y-lh-4), (x1+lw+8, lbl_y+2), color, -1)
    cv2.putText(frame, label, (x1+4, lbl_y),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,0,0), 1, cv2.LINE_AA)


# ──────────────────────────────────────────────────────────────────────────────
# MODULE 4 — HUD
# ──────────────────────────────────────────────────────────────────────────────

def draw_hud(frame, fps, found_animals, captures):
    animals_str = ", ".join(found_animals) if found_animals else "None"
    lines = [
        f"FPS      : {fps:.1f}",
        f"Animals  : {animals_str}",
        f"Captures : {captures}",
    ]
    overlay = frame.copy()
    cv2.rectangle(overlay, (8,8), (340, 88), (20,20,20), -1)
    cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)
    for i, line in enumerate(lines):
        color = (0,255,120) if (i==1 and found_animals) else (255,255,255)
        cv2.putText(frame, line, (14, 30 + i*22),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.52, color, 1, cv2.LINE_AA)


# ──────────────────────────────────────────────────────────────────────────────
# MODULE 5 — Save Capture
# ──────────────────────────────────────────────────────────────────────────────

def save_capture(frame, count, animal_name="animal"):
    ts   = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    path = os.path.join(SAVE_DIR, f"{animal_name}_{ts}_{count:04d}.jpg")
    cv2.imwrite(path, frame)
    print(f"[CAPTURE] Saved -> {path}")
    return count + 1


# ──────────────────────────────────────────────────────────────────────────────
# MODULE 6 — Main Loop
# ──────────────────────────────────────────────────────────────────────────────

def run():
    print("="*54)
    print("   🐾  Animal Detector — YOLOv8  🐾")
    print("="*54)
    print("[INFO] Q=Quit | S=Manual Save")
    print("="*54)

    setup()
    model, cap = setup()

    last_save      = 0
    capture_count  = 0
    was_detected   = False
    prev_time      = time.time()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame     = cv2.flip(frame, 1)
        h, w      = frame.shape[:2]
        now       = time.time()
        fps       = 1.0 / (now - prev_time + 1e-9)
        prev_time = now

        # ── YOLO Detection ────────────────────────────────────────────────
        results = model(frame, verbose=False)[0]

        found_animals   = []
        last_animal     = "animal"

        for box in results.boxes:
            cls_id = int(box.cls[0])
            conf   = float(box.conf[0])

            if cls_id not in ANIMAL_CLASSES:
                continue
            if conf < CONFIDENCE_MIN:
                continue

            animal_name, color = ANIMAL_CLASSES[cls_id]
            x1,y1,x2,y2 = map(int, box.xyxy[0])

            draw_animal_box(frame, x1, y1, x2, y2, animal_name, conf, color)
            found_animals.append(animal_name)
            last_animal = animal_name.lower()

        # ── Alert + Auto Save ─────────────────────────────────────────────
        if found_animals:
            if not was_detected:
                play_beep()
                print(f"[ALERT] 🐾 Animal detected: {', '.join(found_animals)}")
            was_detected = True

            if now - last_save >= COOLDOWN_SECONDS:
                capture_count = save_capture(frame, capture_count, last_animal)
                last_save = now
        else:
            if was_detected:
                print("[INFO] Animal frame se bahar gaya.")
            was_detected = False

        # ── HUD + Timestamp ───────────────────────────────────────────────
        draw_hud(frame, fps, found_animals, capture_count)

        ts = datetime.datetime.now().strftime("%Y-%m-%d  %H:%M:%S")
        (tw,_),_ = cv2.getTextSize(ts, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        cv2.putText(frame, ts, (w-tw-10, h-10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (150,150,150), 1, cv2.LINE_AA)

        cv2.putText(frame, "Q=Quit  S=Save", (10, h-10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, (130,130,130), 1, cv2.LINE_AA)

        cv2.imshow("Animal Detector", frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('s'):
            capture_count = save_capture(frame, capture_count)

    cap.release()
    cv2.destroyAllWindows()
    print(f"\n[DONE] Total captures: {capture_count}")
    print(f"[DONE] Saved in: ./{SAVE_DIR}/")


if __name__ == "__main__":
    run()