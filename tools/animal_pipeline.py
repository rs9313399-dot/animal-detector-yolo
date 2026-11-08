"""Validate, split, train, and benchmark a ten-class YOLO animal dataset."""

import argparse
import contextlib
import json
import math
import random
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.config import ANIMAL_CLASSES, MODEL_PATH  # noqa: E402

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
NAMES = [item["name"].lower() for item in ANIMAL_CLASSES.values()]


def validate_labels(images: Path, labels: Path) -> list[str]:
    from PIL import Image

    errors = []
    image_files = sorted(p for p in images.rglob("*") if p.suffix.lower() in IMAGE_EXTS)
    if not image_files:
        return [f"No images found under {images}"]
    for image in image_files:
        try:
            with Image.open(image) as source_image:
                source_image.verify()
        except Exception as error:
            errors.append(f"Invalid image {image}: {error}")
            continue
        label = labels / image.relative_to(images).with_suffix(".txt")
        if not label.is_file():
            errors.append(f"Missing label file: {label}")
            continue
        for line_no, line in enumerate(label.read_text(encoding="utf-8").splitlines(), 1):
            if not line.strip():
                continue
            parts = line.split()
            try:
                class_id = int(parts[0])
                coords = [float(value) for value in parts[1:]]
            except (ValueError, IndexError):
                errors.append(f"{label}:{line_no}: expected class x_center y_center width height")
                continue
            if len(coords) != 4 or not 0 <= class_id < len(NAMES):
                errors.append(f"{label}:{line_no}: invalid class id or box field count")
            elif (not all(math.isfinite(value) and 0 <= value <= 1 for value in coords)
                  or coords[2] == 0 or coords[3] == 0
                  or coords[0] - coords[2] / 2 < 0 or coords[0] + coords[2] / 2 > 1
                  or coords[1] - coords[3] / 2 < 0 or coords[1] + coords[3] / 2 > 1):
                errors.append(f"{label}:{line_no}: normalized box values must be in (0, 1]")
    return errors


def make_yaml(root: Path) -> Path:
    import yaml
    path = root / "data.yaml"
    path.write_text(yaml.safe_dump({"path": str(root.resolve()), "train": "images/train", "val": "images/val",
                                    "test": "images/test", "names": NAMES}, sort_keys=False), encoding="utf-8")
    return path


def split_dataset(source: Path, output: Path, seed: int = 42) -> Path:
    images, labels = source / "images", source / "labels"
    errors = validate_labels(images, labels)
    if errors:
        raise ValueError("Dataset validation failed:\n" + "\n".join(errors[:30]))
    files = sorted(p for p in images.rglob("*") if p.suffix.lower() in IMAGE_EXTS)
    random.Random(seed).shuffle(files)
    n = len(files)
    n_train, n_val = max(1, int(n * .7)), max(1, int(n * .2))
    if n < 3:
        raise ValueError("At least three labeled images are required for train/val/test splits")
    if n_train + n_val >= n:
        n_train, n_val = n - 2, 1
    groups = {"train": files[:n_train], "val": files[n_train:n_train+n_val], "test": files[n_train+n_val:]}
    if output.exists() and any(output.iterdir()):
        raise FileExistsError(f"Output folder must be empty: {output}")
    for split, items in groups.items():
        for image in items:
            relative = image.relative_to(images)
            target_image = output / "images" / split / relative
            target_label = output / "labels" / split / relative.with_suffix(".txt")
            target_image.parent.mkdir(parents=True, exist_ok=True)
            target_label.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(image, target_image)
            shutil.copy2(labels / relative.with_suffix(".txt"), target_label)
    return make_yaml(output)


def dataset_yaml(path: Path) -> Path:
    import yaml
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    raw_names = data.get("names")
    names = [raw_names[key] for key in sorted(raw_names)] if isinstance(raw_names, dict) else raw_names
    if names != NAMES:
        raise ValueError(f"data.yaml names must match the ten supported classes in order: {NAMES}")
    root = Path(data.get("path", path.parent))
    if not root.is_absolute():
        root = (path.parent / root).resolve()
    errors = []
    for split in ("train", "val", "test"):
        image_path = Path(data[split])
        if not image_path.is_absolute():
            image_path = root / image_path
        label_path = root / "labels" / image_path.relative_to(root).relative_to("images")
        errors.extend(validate_labels(image_path, label_path))
    if errors:
        raise ValueError("Dataset validation failed:\n" + "\n".join(errors[:30]))
    return path


def import_yolo():
    try:
        from ultralytics import YOLO
    except ImportError as exc:
        raise RuntimeError("Install project dependencies first: pip install -r requirements.txt") from exc
    return YOLO


def split_paths(data_path: Path) -> tuple[Path, Path, Path]:
    import yaml
    config = yaml.safe_load(data_path.read_text(encoding="utf-8"))
    root = Path(config.get("path", data_path.parent))
    if not root.is_absolute():
        root = (data_path.parent / root).resolve()
    paths = []
    for split in ("train", "val", "test"):
        image_path = Path(config[split])
        paths.append(image_path if image_path.is_absolute() else root / image_path)
    return tuple(paths)


def prepare_model_dataset(data_path: Path, output_root: Path, model_names: dict) -> tuple[Path, list[int], Path, Path]:
    """Remap the ten-class labels to the model's class indices for a fair val run."""
    import yaml
    train_images, val_images, test_images = split_paths(data_path)
    names = [model_names[index] for index in sorted(model_names)] if isinstance(model_names, dict) else list(model_names)
    model_indices = {str(name).lower(): index for index, name in enumerate(names)}
    if not all(name in model_indices for name in NAMES):
        missing = [name for name in NAMES if name not in model_indices]
        raise ValueError(f"Benchmark model is missing supported animal classes: {missing}")
    classes = [model_indices[name] for name in NAMES]
    if names == NAMES:
        return data_path, classes, test_images, test_images.parent.parent / "labels" / test_images.name

    root = output_root / "remapped-data"
    images_out, labels_out = root / "images" / "test", root / "labels" / "test"
    images_out.mkdir(parents=True, exist_ok=True)
    labels_out.mkdir(parents=True, exist_ok=True)
    source_labels = test_images.parent.parent / "labels" / test_images.name
    name_by_index = {index: name for index, name in enumerate(NAMES)}
    for image in (p for p in test_images.rglob("*") if p.suffix.lower() in IMAGE_EXTS):
        relative = image.relative_to(test_images)
        shutil.copy2(image, images_out / relative)
        source_label = source_labels / relative.with_suffix(".txt")
        target_label = labels_out / relative.with_suffix(".txt")
        target_label.parent.mkdir(parents=True, exist_ok=True)
        remapped = []
        for line in source_label.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            parts = line.split()
            source_class = int(parts[0])
            target_class = model_indices[name_by_index[source_class]]
            remapped.append(" ".join([str(target_class), *parts[1:]]))
        target_label.write_text("\n".join(remapped), encoding="utf-8")
    config = {"path": str(root.resolve()), "train": "images/test", "val": "images/test", "test": "images/test",
              "names": {index: name for index, name in enumerate(names)}}
    yaml_path = root / "data.yaml"
    yaml_path.write_text(yaml.safe_dump(config, sort_keys=False), encoding="utf-8")
    return yaml_path, classes, images_out, labels_out


def count_fp_fn(model, images: Path, labels: Path, imgsz: int, conf: float, iou: float, device: str, classes: list[int]) -> tuple[int, int]:
    false_positives = missed = 0
    for result in model.predict(source=str(images), stream=True, imgsz=imgsz, conf=conf, iou=iou,
                                device=device, classes=classes, verbose=False, max_det=100):
        image_path = Path(result.path)
        label_path = labels / image_path.relative_to(images).with_suffix(".txt")
        height, width = result.orig_shape
        ground_truth = []
        if label_path.is_file():
            for line in label_path.read_text(encoding="utf-8").splitlines():
                if not line.strip():
                    continue
                class_id, cx, cy, box_w, box_h = (float(value) for value in line.split())
                ground_truth.append((int(class_id), (cx - box_w / 2) * width, (cy - box_h / 2) * height,
                                     (cx + box_w / 2) * width, (cy + box_h / 2) * height))
        predictions = []
        if result.boxes is not None:
            for box in result.boxes:
                predictions.append((int(box.cls[0]), float(box.conf[0]), *map(float, box.xyxy[0])))
        used_gt = set()
        for pred_class, _, x1, y1, x2, y2 in sorted(predictions, key=lambda item: item[1], reverse=True):
            best_index, best_iou = -1, 0.5
            for index, (gt_class, gx1, gy1, gx2, gy2) in enumerate(ground_truth):
                if index in used_gt or pred_class != gt_class:
                    continue
                intersection = max(0, min(x2, gx2) - max(x1, gx1)) * max(0, min(y2, gy2) - max(y1, gy1))
                union = max(0, x2 - x1) * max(0, y2 - y1) + max(0, gx2 - gx1) * max(0, gy2 - gy1) - intersection
                score = intersection / union if union else 0
                if score >= best_iou:
                    best_index, best_iou = index, score
            if best_index < 0:
                false_positives += 1
            else:
                used_gt.add(best_index)
        missed += len(ground_truth) - len(used_gt)
    return false_positives, missed


def evaluate(model_path: Path, data: Path, imgsz: int, conf: float, iou: float, output: Path, device="cpu") -> dict:
    YOLO = import_yolo()
    model = YOLO(str(model_path))
    model_names = [model.names[index] for index in sorted(model.names)] if isinstance(model.names, dict) else list(model.names)
    if [str(name).lower() for name in model_names] == NAMES:
        eval_data, classes = data, list(range(len(NAMES)))
        _, _, test_images = split_paths(data)
        eval_labels = test_images.parent.parent / "labels" / test_images.name
        temp_context = contextlib.nullcontext(None)
    else:
        temp_context = tempfile.TemporaryDirectory(prefix="fauna-eval-")
    with temp_context as temp_dir:
        if temp_dir is not None:
            eval_data, classes, test_images, eval_labels = prepare_model_dataset(data, Path(temp_dir), model.names)
        run_name = f"{output.stem}-plots"
        metrics = model.val(data=str(eval_data), split="test", imgsz=imgsz, conf=conf, iou=iou,
                            device=device, classes=classes, plots=True, verbose=False,
                            project=str(output.parent), name=run_name, exist_ok=True)
        false_positives, misses = count_fp_fn(model, test_images, eval_labels, imgsz, conf, iou, device, classes)
    speed = metrics.speed
    elapsed_ms = sum(speed.values())
    validation_dir = output.parent / run_name
    report = {
        "model": str(model_path), "imgsz": imgsz, "conf": conf, "iou": iou, "device": device,
        "precision": float(metrics.box.mp), "recall": float(metrics.box.mr),
        "map50": float(metrics.box.map50), "map50_95": float(metrics.box.map),
        "average_inference_ms": float(speed.get("inference", 0)),
        "average_total_ms_per_image": float(elapsed_ms),
        "average_fps": float(1000 / elapsed_ms) if elapsed_ms else 0,
        "false_positive_count": false_positives,
        "missed_detection_count": misses,
        "confusion_matrix": str(validation_dir / "confusion_matrix.png"),
        "validation_directory": str(validation_dir),
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    check = commands.add_parser("validate", help="check YOLO folders and labels")
    check.add_argument("dataset", type=Path, help="dataset root containing images/ and labels/ split folders")
    split = commands.add_parser("split", help="create a deterministic 70/20/10 split from images/ and labels/")
    split.add_argument("source", type=Path)
    split.add_argument("output", type=Path)
    split.add_argument("--seed", type=int, default=42)
    train = commands.add_parser("train", help="fine-tune the model using a labeled data.yaml")
    train.add_argument("data", type=Path)
    train.add_argument("--model", type=Path, default=MODEL_PATH)
    train.add_argument("--epochs", type=int, default=100)
    train.add_argument("--imgsz", type=int, default=640)
    train.add_argument("--output", type=Path, default=ROOT / "runs" / "animal-training")
    bench = commands.add_parser("benchmark", help="evaluate model/config pairs on the same test split")
    bench.add_argument("data", type=Path)
    bench.add_argument("--baseline", type=Path, default=MODEL_PATH)
    bench.add_argument("--optimized", type=Path, default=MODEL_PATH)
    bench.add_argument("--output", type=Path, default=ROOT / "benchmarks" / "comparison.json")
    args = parser.parse_args()

    if args.command == "validate":
        data = dataset_yaml(args.dataset / "data.yaml") if (args.dataset / "data.yaml").exists() else None
        errors = []
        for split_name in ("train", "val", "test"):
            errors.extend(validate_labels(args.dataset / "images" / split_name, args.dataset / "labels" / split_name))
        if errors:
            raise SystemExit("\n".join(errors[:30]))
        print(f"Valid YOLO dataset: {args.dataset} ({'data.yaml found' if data else 'data.yaml missing'})")
    elif args.command == "split":
        print(f"Created splits and data YAML: {split_dataset(args.source, args.output, args.seed)}")
    elif args.command == "train":
        data = dataset_yaml(args.data)
        YOLO = import_yolo()
        if not args.model.is_file():
            raise SystemExit(f"Model weights not found locally: {args.model}")
        model = YOLO(str(args.model))
        model.train(data=str(data), epochs=args.epochs, imgsz=args.imgsz, project=str(args.output),
                    name="run", exist_ok=True, plots=True, augment=True,
                    fliplr=0.5, mosaic=1.0, mixup=0.1, close_mosaic=10)
        run_dir = Path(model.trainer.save_dir)
        best = run_dir / "weights" / "best.pt"
        export_path = ROOT / "models" / "animal-best.pt"
        export_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(best, export_path)
        print(f"Training finished. Best weights exported to: {export_path}")
        report = evaluate(best, data, args.imgsz, 0.001, 0.7, run_dir / "test-metrics.json")
        print(json.dumps(report, indent=2))
    else:
        data = dataset_yaml(args.data)
        if not args.baseline.is_file() or not args.optimized.is_file():
            raise SystemExit("Both baseline and optimized model weight files must exist locally")
        reports = {"baseline_cpu": evaluate(args.baseline, data, 640, 0.25, 0.7,
                                              args.output.with_name("baseline-cpu.json"), "cpu"),
                   "candidate_cpu": evaluate(args.optimized, data, 960, 0.35, 0.55,
                                              args.output.with_name("candidate-cpu.json"), "cpu")}
        try:
            import torch
            if torch.cuda.is_available():
                reports["candidate_cuda"] = evaluate(args.optimized, data, 960, 0.35, 0.55,
                                                      args.output.with_name("candidate-cuda.json"), "0")
        except ImportError:
            pass
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(reports, indent=2), encoding="utf-8")
        print(json.dumps(reports, indent=2))


if __name__ == "__main__":
    main()
