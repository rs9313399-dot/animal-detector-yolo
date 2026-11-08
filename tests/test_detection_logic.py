import unittest

from backend.detection_logic import DetectionStabilizer, box_iou


def detection(x1=10, y1=10, x2=50, y2=50, class_id=15):
    return {"x1": x1, "y1": y1, "x2": x2, "y2": y2, "class_id": class_id,
            "width": x2 - x1, "height": y2 - y1}


class DetectionLogicTests(unittest.TestCase):
    def test_iou_for_same_and_disjoint_boxes(self):
        first = detection()
        self.assertEqual(box_iou(first, first), 1.0)
        self.assertEqual(box_iou(first, detection(100, 100, 150, 150)), 0.0)

    def test_stabilizer_requires_consecutive_matching_frames(self):
        stabilizer = DetectionStabilizer()
        self.assertEqual(stabilizer.update([detection()], 2), [])
        stable = stabilizer.update([detection(x1=12, x2=52)], 2)
        self.assertEqual(len(stable), 1)
        self.assertEqual(stable[0]["x1"], 11)
        self.assertEqual(stabilizer.update([], 2), [])
        self.assertEqual(stabilizer.update([detection()], 2), [])


if __name__ == "__main__":
    unittest.main()
