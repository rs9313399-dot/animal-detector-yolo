from typing import Any, Dict, List, Tuple


def box_iou(a: Dict[str, Any], b: Dict[str, Any]) -> float:
    left, top = max(a["x1"], b["x1"]), max(a["y1"], b["y1"])
    right, bottom = min(a["x2"], b["x2"]), min(a["y2"], b["y2"])
    intersection = max(0, right - left) * max(0, bottom - top)
    area_a = max(0, a["x2"] - a["x1"]) * max(0, a["y2"] - a["y1"])
    area_b = max(0, b["x2"] - b["x1"]) * max(0, b["y2"] - b["y1"])
    union = area_a + area_b - intersection
    return intersection / union if union else 0.0


class DetectionStabilizer:
    """Require consecutive matching observations and smooth box coordinates."""

    def __init__(self, match_iou: float = 0.35, smoothing: float = 0.65):
        self.match_iou = match_iou
        self.smoothing = smoothing
        self.previous: List[Tuple[Dict[str, Any], int]] = []

    def reset(self) -> None:
        self.previous.clear()

    def update(self, boxes: List[Dict[str, Any]], required_frames: int) -> List[Dict[str, Any]]:
        used = set()
        current = []
        stable = []
        for box in boxes:
            best_index, best_iou = -1, self.match_iou
            for index, (previous, _) in enumerate(self.previous):
                if index in used or previous["class_id"] != box["class_id"]:
                    continue
                previous_id, current_id = previous.get("track_id"), box.get("track_id")
                if previous_id is not None or current_id is not None:
                    if previous_id != current_id:
                        continue
                    score = 1.0
                else:
                    score = box_iou(previous, box)
                if score > best_iou:
                    best_index, best_iou = index, score

            item = dict(box)
            if best_index >= 0:
                used.add(best_index)
                previous, hits = self.previous[best_index]
                hits += 1
                for key in ("x1", "y1", "x2", "y2"):
                    item[key] = round(self.smoothing * previous[key] + (1 - self.smoothing) * box[key])
                item["width"] = item["x2"] - item["x1"]
                item["height"] = item["y2"] - item["y1"]
                current.append((item, hits))
                if hits >= required_frames:
                    stable.append(item)
            else:
                current.append((item, 1))
                if required_frames <= 1:
                    stable.append(item)

        self.previous = current
        return stable
