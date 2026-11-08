# Animal dataset format

No labeled training or benchmark dataset is included in this repository. The image in `animal_captures/` is a runtime capture without a YOLO label file and is not an evaluation set.

Collect images across species, distances, lighting, partial visibility, motion, and busy backgrounds. Annotate every visible supported animal with a tight box in YOLO detection format: `class_id x_center y_center width height`; coordinates are normalized to 0–1. For this project the class IDs are contiguous from 0 to 9 in this order: bird, cat, dog, horse, sheep, cow, elephant, bear, zebra, giraffe. Use a labeling tool that exports Ultralytics YOLO detection labels.

For an already split dataset, use:

```text
animal-dataset/
  data.yaml
  images/{train,val,test}/...
  labels/{train,val,test}/...
```

Every image needs a matching `.txt` file, including empty files for genuine negative images. `data.yaml` must point at the dataset root and list `train`, `val`, `test`, and the ten class names in the stated order. Keep images from the same camera burst, animal, or video sequence within one split to reduce leakage.

To split an unsplit source directory containing `images/` and `labels/`, validate and copy it into deterministic 70/20/10 splits:

```bash
python tools/animal_pipeline.py split path/to/source path/to/animal-dataset --seed 42
python tools/animal_pipeline.py validate path/to/animal-dataset
```

Fine-tune only after review of labels and class coverage:

```bash
python tools/animal_pipeline.py train path/to/animal-dataset/data.yaml --model yolov8n.pt --epochs 100 --imgsz 640
```

Training creates `best.pt`, validation plots, and test metrics under `runs/animal-training/run/`. This workflow uses Ultralytics' built-in training augmentations plus horizontal flip and mosaic/mixup. Increase image count and rebalance underrepresented species before tuning epochs.

Ultralytics states that its code and models are offered under AGPL-3.0 or a separate Enterprise license. Review the [official license terms](https://www.ultralytics.com/license) for the intended distribution and use.
