export type NavigationTab = 'dashboard' | 'studio' | 'history' | 'explorer' | 'settings';

export interface DetectionBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  nx1: number;
  ny1: number;
  nx2: number;
  ny2: number;
  width: number;
  height: number;
  class_id: number;
  name: string;
  confidence: number;
  confidence_pct: number;
  color: [number, number, number];
  hex: string;
  scientific?: string;
  category?: string;
  track_id?: number | null;
}

export interface DetectionResponse {
  boxes: DetectionBox[];
  found_animals: string[];
  animal_count: number;
  primary_animal?: string | null;
  highest_confidence: number;
  inference_ms: number;
  fps: number;
  image_dims: { width: number; height: number };
  timestamp: string;
  auto_captured?: boolean;
  capture_file?: string | null;
  model_status: string;
  error?: string;
  model_name?: string;
  device?: string;
}

export interface CaptureItem {
  id: string;
  filename: string;
  animal: string;
  animal_color: string;
  confidence?: number | null;
  confidence_pct?: number | null;
  boxes?: DetectionBox[];
  size_kb: number;
  created_at: string;
  display_date: string;
  display_time: string;
  url: string;
  download_url: string;
}

export interface SystemStatus {
  model_name: string;
  model_loaded: boolean;
  model_error?: string | null;
  device: string;
  fps: number;
  inference_ms: number;
  total_inferences: number;
  total_detections: number;
  total_captures: number;
  confidence_threshold: number;
  iou_threshold: number;
  image_size: number;
  tracking_enabled: boolean;
  stabilization_frames: number;
  min_box_area_pct: number;
  available_models: { id: string; name: string; path: string }[];
  cooldown_seconds: number;
  auto_capture_enabled: boolean;
  active_classes: number[];
  cumulative_animals: Record<string, number>;
  recent_activity: ActivityRecord[];
  uptime_seconds?: number;
  supported_animals: AnimalReference[];
}

export interface ActivityRecord {
  id: string;
  timestamp: string;
  date: string;
  animals: string[];
  primary_animal: string;
  confidence: number;
  count: number;
  captured: boolean;
  capture_filename?: string | null;
}

export interface SystemSettings {
  confidence_threshold: number;
  iou_threshold: number;
  image_size: number;
  tracking_enabled: boolean;
  stabilization_frames: number;
  min_box_area_pct: number;
  model_name: string;
  available_models: { id: string; name: string; path: string }[];
  cooldown_seconds: number;
  auto_capture_enabled: boolean;
  active_classes: number[];
  supported_classes: {
    id: number;
    name: string;
    hex: string;
    category: string;
  }[];
}

export interface AnimalReference {
  class_id: number;
  name: string;
  hex: string;
  scientific: string;
  category: string;
  iucn: string;
  imageUrl: string;
  description: string;
  habitat: string;
  yoloInfo: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'alert' | 'info' | 'error';
  title: string;
  message: string;
  timestamp: number;
}
