# Benchmark status

**No accuracy benchmark has been run.** This checkout has no labeled validation or test dataset; `animal_captures/` contains only an unlabeled runtime JPEG. Reporting precision, recall, mAP, false positives, or misses without a fixed labeled test set would be fabricated.

After preparing a held-out `data.yaml` as documented in `datasets/README.md`, run:

```bash
python tools/animal_pipeline.py benchmark path/to/animal-dataset/data.yaml --baseline yolov8n.pt --optimized yolov8n.pt
```

All runs use the same test split. The CPU baseline and CPU candidate use the same requested weights; the baseline uses 640 px / confidence 0.25 / NMS IoU 0.70, while the candidate uses 960 px / confidence 0.35 / NMS IoU 0.55. When CUDA is available, the candidate is also evaluated on CUDA. Ultralytics validation writes precision, recall, mAP50, mAP50-95, preprocessing/inference/postprocessing timing, throughput, false-positive and missed-detection counts from the confusion matrix, and a confusion matrix plot. The result JSON and plots are created under `benchmarks/` and Ultralytics' validation directory. The configuration is a candidate to measure, not a claim of better accuracy.
