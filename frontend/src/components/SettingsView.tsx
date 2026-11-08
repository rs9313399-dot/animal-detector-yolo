import React, { useState } from 'react';
import { 
  Sliders, 
  Volume2, 
  Camera, 
  Zap, 
  Cpu, 
  RotateCcw, 
  Check, 
  Info,
  ShieldCheck,
  Layers,
  Bell
} from 'lucide-react';
import { SystemStatus, SystemSettings } from '../types';
import { saveSettings } from '../services/api';
import { audioService } from '../services/audio';
import { SUPPORTED_ANIMALS } from '../constants/animals';

interface SettingsViewProps {
  status: SystemStatus | null;
  confidenceThreshold: number;
  setConfidenceThreshold: (val: number) => void;
  iouThreshold: number;
  setIouThreshold: (val: number) => void;
  imageSize: number;
  setImageSize: (val: number) => void;
  trackingEnabled: boolean;
  setTrackingEnabled: (val: boolean) => void;
  stabilizationFrames: number;
  setStabilizationFrames: (val: number) => void;
  minBoxAreaPct: number;
  setMinBoxAreaPct: (val: number) => void;
  modelName: string;
  setModelName: (val: string) => void;
  cooldownSeconds: number;
  setCooldownSeconds: (val: number) => void;
  autoCaptureEnabled: boolean;
  setAutoCaptureEnabled: (val: boolean) => void;
  soundAlertEnabled: boolean;
  setSoundAlertEnabled: (val: boolean) => void;
  activeClasses: number[];
  setActiveClasses: (val: number[]) => void;
  onShowToast: (type: 'success' | 'alert' | 'error' | 'info', title: string, message: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  status,
  confidenceThreshold,
  setConfidenceThreshold,
  iouThreshold,
  setIouThreshold,
  imageSize,
  setImageSize,
  trackingEnabled,
  setTrackingEnabled,
  stabilizationFrames,
  setStabilizationFrames,
  minBoxAreaPct,
  setMinBoxAreaPct,
  modelName,
  setModelName,
  cooldownSeconds,
  setCooldownSeconds,
  autoCaptureEnabled,
  setAutoCaptureEnabled,
  soundAlertEnabled,
  setSoundAlertEnabled,
  activeClasses,
  setActiveClasses,
  onShowToast
}) => {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [soundVolume, setSoundVolume] = useState<number>(0.3);

  // Toggle individual species
  const toggleClass = (classId: number) => {
    if (activeClasses.includes(classId)) {
      if (activeClasses.length <= 1) {
        onShowToast('alert', 'Minimum Class Required', 'At least one animal class must remain active.');
        return;
      }
      setActiveClasses(activeClasses.filter((id) => id !== classId));
    } else {
      setActiveClasses([...activeClasses, classId]);
    }
  };

  const selectAllClasses = () => {
    setActiveClasses(SUPPORTED_ANIMALS.map((a) => a.class_id));
  };

  const handleSaveToBackend = async () => {
    setIsSaving(true);
    try {
      await saveSettings({
        confidence_threshold: confidenceThreshold,
        iou_threshold: iouThreshold,
        image_size: imageSize,
        tracking_enabled: trackingEnabled,
        stabilization_frames: stabilizationFrames,
        min_box_area_pct: minBoxAreaPct,
        model_name: modelName,
        cooldown_seconds: cooldownSeconds,
        auto_capture_enabled: autoCaptureEnabled,
        active_classes: activeClasses
      });
      // Also persist to localStorage
      localStorage.setItem('fauna_confidence', confidenceThreshold.toString());
      localStorage.setItem('fauna_iou', iouThreshold.toString());
      localStorage.setItem('fauna_image_size', imageSize.toString());
      localStorage.setItem('fauna_tracking', trackingEnabled.toString());
      localStorage.setItem('fauna_stabilization', stabilizationFrames.toString());
      localStorage.setItem('fauna_min_box_area', minBoxAreaPct.toString());
      localStorage.setItem('fauna_model', modelName);
      localStorage.setItem('fauna_cooldown', cooldownSeconds.toString());
      localStorage.setItem('fauna_auto_capture', autoCaptureEnabled.toString());
      localStorage.setItem('fauna_sound', soundAlertEnabled.toString());
      localStorage.setItem('fauna_classes', JSON.stringify(activeClasses));

      onShowToast('success', 'Settings Synchronized', 'Inference configuration successfully updated across backend and client.');
    } catch (err: any) {
      onShowToast('error', 'Sync Failed', err.message || 'Could not save settings to backend');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setConfidenceThreshold(0.45);
    setIouThreshold(0.55);
    setImageSize(640);
    setTrackingEnabled(false);
    setStabilizationFrames(1);
    setMinBoxAreaPct(0);
    setModelName('yolov8n');
    setCooldownSeconds(3.0);
    setAutoCaptureEnabled(true);
    setSoundAlertEnabled(true);
    setActiveClasses(SUPPORTED_ANIMALS.map((a) => a.class_id));
    onShowToast('info', 'Defaults Restored', 'Restored recommended detection defaults (45% confidence, 3s cooldown).');
  };

  const testAudioChime = () => {
    audioService.setEnabled(true);
    audioService.playDetectionChime();
    onShowToast('info', 'Audio Test', 'Triggered harmonic arrival chime');
  };

  return (
    <div className="view-content" style={{ maxWidth: '960px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div className="editorial-hero">
          <span className="editorial-eyebrow">Parameters &amp; Control Matrix</span>
          <h2 className="editorial-heading">
            System <em>Configuration</em>
          </h2>
          <p className="editorial-lead">
            Tune neural inference filters, automated capture rates, audio chimes, and selective species monitoring.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleResetDefaults}>
            <RotateCcw size={14} />
            <span>Reset Defaults</span>
          </button>
          <button className="btn btn-primary" onClick={handleSaveToBackend} disabled={isSaving}>
            <Check size={14} />
            <span>{isSaving ? 'Syncing...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {/* Main Settings Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Detection & Inference Settings */}
        <div className="viewfinder-card" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={16} style={{ color: 'var(--accent-forest-bright)' }} />
            <span>Inference Sensitivity &amp; Filtering</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Confidence Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    Minimum Confidence Threshold (CONF_MIN)
                  </span>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Detections with confidence below this value will be ignored to prevent false positives.
                  </p>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, color: 'var(--accent-forest-light)' }}>
                  {Math.round(confidenceThreshold * 100)}%
                </span>
              </div>
              <input 
                type="range" 
                min="0.10" 
                max="0.95" 
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                className="control-slider"
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>10% (High Recall / Broad)</span>
                <span>45% (Recommended Default)</span>
                <span>95% (High Precision / Strict)</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Model weights (installed locally)
                <select className="control-select" value={modelName} onChange={(e) => setModelName(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '6px' }}>
                  {(status?.available_models.length ? status.available_models : [{ id: modelName, name: modelName.toUpperCase(), path: 'backend unavailable' }]).map((model) => <option key={model.id} value={model.id}>{model.name} · {model.path}</option>)}
                </select>
              </label>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Inference image size
                <select className="control-select" value={imageSize} onChange={(e) => setImageSize(Number(e.target.value))} style={{ display: 'block', width: '100%', marginTop: '6px' }}>
                  {[640, 832, 960].map((size) => <option key={size} value={size}>{size} × {size}</option>)}
                </select>
              </label>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                NMS IoU threshold · {Math.round(iouThreshold * 100)}%
                <input aria-label="NMS IoU threshold" type="range" min="0.30" max="0.80" step="0.05" value={iouThreshold} onChange={(e) => setIouThreshold(Number(e.target.value))} className="control-slider" style={{ display: 'block', width: '100%', marginTop: '8px' }} />
              </label>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Stabilization · {stabilizationFrames} consecutive frame{stabilizationFrames === 1 ? '' : 's'}
                <input aria-label="Detection persistence frames" type="range" min="1" max="4" step="1" value={stabilizationFrames} onChange={(e) => setStabilizationFrames(Number(e.target.value))} className="control-slider" style={{ display: 'block', width: '100%', marginTop: '8px' }} />
              </label>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Minimum box area · {minBoxAreaPct.toFixed(1)}% of frame
                <input aria-label="Minimum detection box area" type="range" min="0" max="5" step="0.25" value={minBoxAreaPct} onChange={(e) => setMinBoxAreaPct(Number(e.target.value))} className="control-slider" style={{ display: 'block', width: '100%', marginTop: '8px' }} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={trackingEnabled} onChange={(e) => setTrackingEnabled(e.target.checked)} />
                ByteTrack IDs across frames
              </label>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Higher image sizes and longer persistence can reduce throughput or delay small detections. Only weight files already present in the project are selectable.
            </p>
          </div>
        </div>

        {/* Automated Field Capture Settings */}
        <div className="viewfinder-card" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} style={{ color: 'var(--accent-amber)' }} />
            <span>Automated Visual Capture Protocol</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Auto Capture Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  Auto-Save Snapshot on Fauna Detection
                </span>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Automatically writes high-resolution JPEG frames into <code style={{ color: 'var(--text-primary)' }}>animal_captures/</code> whenever animals are verified.
                </p>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '42px', height: '22px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={autoCaptureEnabled}
                  onChange={(e) => setAutoCaptureEnabled(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute', inset: 0,
                  backgroundColor: autoCaptureEnabled ? 'var(--accent-forest)' : 'var(--bg-surface-elevated)',
                  borderRadius: '11px',
                  border: '1px solid var(--border-medium)',
                  transition: 'background-color 200ms'
                }}>
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    left: autoCaptureEnabled ? '22px' : '2px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                    transition: 'left 200ms'
                  }} />
                </span>
              </label>
            </div>

            {/* Cooldown Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    Capture Cooldown Period (Seconds)
                  </span>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Minimum delay between consecutive automated frame saves to prevent rapid disk flooding.
                  </p>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {cooldownSeconds}s
                </span>
              </div>
              <input 
                type="range" 
                min="1.0" 
                max="15.0" 
                step="0.5"
                value={cooldownSeconds}
                onChange={(e) => setCooldownSeconds(parseFloat(e.target.value))}
                className="control-slider"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Species Whitelist Selector */}
        <div className="viewfinder-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} style={{ color: 'var(--accent-forest-bright)' }} />
              <span>Monitored Species Filter ({activeClasses.length}/10 Active)</span>
            </h3>
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={selectAllClasses}>
              Enable All 10 Classes
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '10px' }}>
            {SUPPORTED_ANIMALS.map((animal) => {
              const isActive = activeClasses.includes(animal.class_id);
              return (
                <div 
                  key={animal.class_id}
                  onClick={() => toggleClass(animal.class_id)}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: isActive ? 'var(--bg-surface-elevated)' : 'var(--bg-canvas)',
                    border: `1px solid ${isActive ? animal.hex : 'var(--border-hairline)'}`,
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    opacity: isActive ? 1 : 0.45,
                    transition: 'all 150ms'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: animal.hex }}></span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{animal.name}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                    #{animal.class_id}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audio Alerts */}
        <div className="viewfinder-card" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Volume2 size={16} style={{ color: 'var(--accent-forest-bright)' }} />
            <span>Auditory Field Telemetry</span>
          </h3>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text-primary)' }}>
                Harmonic Audio Ping on Target Acquisition
              </span>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Plays a subtle dual-frequency chime when an animal first enters the video frame.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={testAudioChime}>
                Test Sound
              </button>
              <label style={{ position: 'relative', display: 'inline-block', width: '42px', height: '22px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={soundAlertEnabled}
                  onChange={(e) => {
                    setSoundAlertEnabled(e.target.checked);
                    audioService.setEnabled(e.target.checked);
                  }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute', inset: 0,
                  backgroundColor: soundAlertEnabled ? 'var(--accent-forest)' : 'var(--bg-surface-elevated)',
                  borderRadius: '11px',
                  border: '1px solid var(--border-medium)',
                  transition: 'background-color 200ms'
                }}>
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    left: soundAlertEnabled ? '22px' : '2px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                    transition: 'left 200ms'
                  }} />
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Model & Diagnostics Card */}
        <div className="viewfinder-card" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={16} style={{ color: 'var(--text-muted)' }} />
            <span>Model Specifications &amp; Hardware Diagnostics</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>ARCHITECTURE</span>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{status?.model_name?.toUpperCase() || modelName}</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>COMPUTE RUNTIME</span>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>PyTorch / {status?.device?.toUpperCase() || 'CPU'}</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>NMS IOU</span>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{Math.round((status?.iou_threshold ?? iouThreshold) * 100)}%</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>INPUT TENSOR</span>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{status?.image_size ?? imageSize} × {status?.image_size ?? imageSize} Resolution</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

