import { DetectionResponse, SystemStatus, CaptureItem, SystemSettings } from '../types';

const API_BASE = '/api';

export async function fetchHealth(): Promise<{ status: string; model_loaded: boolean; device: string }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchStatus(): Promise<SystemStatus> {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) throw new Error('Failed to fetch system status');
  return res.json();
}

export async function detectFrame(
  imageBase64: string,
  confidence?: number,
  autoCapture?: boolean,
  allowedClasses?: number[],
  options: {
    iou_threshold?: number;
    image_size?: number;
    tracking_enabled?: boolean;
    stabilization_frames?: number;
    min_box_area_pct?: number;
    tracking_session?: string;
  } = {}
): Promise<DetectionResponse> {
  const res = await fetch(`${API_BASE}/detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: imageBase64,
      confidence,
      auto_capture: autoCapture,
      allowed_classes: allowedClasses,
      ...options
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Detection failed' }));
    throw new Error(err.detail || 'Inference error');
  }

  return res.json();
}

export async function sendManualCapture(
  imageBase64: string,
  animal: string = 'Manual_Capture',
  confidence?: number,
  boxes?: any[]
): Promise<{ success: boolean; filename: string; url: string; total_captures: number }> {
  const res = await fetch(`${API_BASE}/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: imageBase64,
      animal,
      confidence,
      boxes
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to save snapshot' }));
    throw new Error(err.detail || 'Capture failed');
  }

  return res.json();
}

export async function fetchCaptures(
  animal?: string,
  search?: string,
  sort: string = 'newest'
): Promise<CaptureItem[]> {
  const params = new URLSearchParams();
  if (animal && animal !== 'all') params.set('animal', animal);
  if (search) params.set('search', search);
  params.set('sort', sort);

  const res = await fetch(`${API_BASE}/captures?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load captures');
  return res.json();
}

export async function deleteCapture(filename: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/captures/${encodeURIComponent(filename)}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete capture');
  const data = await res.json();
  return data.success;
}

export async function fetchSettings(): Promise<SystemSettings> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to load settings');
  return res.json();
}

export async function saveSettings(settings: Partial<SystemSettings>): Promise<any> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}
