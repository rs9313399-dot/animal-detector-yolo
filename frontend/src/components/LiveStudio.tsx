import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Video, 
  VideoOff, 
  Camera, 
  Sliders, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  AlertTriangle,
  Zap,
  Layers,
  Activity,
  Maximize2,
  CheckCircle2
} from 'lucide-react';
import { DetectionBox, DetectionResponse } from '../types';
import { detectFrame, sendManualCapture } from '../services/api';
import { audioService } from '../services/audio';

interface LiveStudioProps {
  confidenceThreshold: number;
  setConfidenceThreshold: (val: number) => void;
  iouThreshold: number;
  imageSize: number;
  trackingEnabled: boolean;
  stabilizationFrames: number;
  minBoxAreaPct: number;
  cooldownSeconds: number;
  autoCaptureEnabled: boolean;
  activeClasses: number[];
  soundAlertEnabled: boolean;
  setSoundAlertEnabled: (val: boolean) => void;
  onCameraStateChange: (active: boolean) => void;
  onSnapshotSaved: (filename: string, animal: string) => void;
}

export const LiveStudio: React.FC<LiveStudioProps> = ({
  confidenceThreshold,
  setConfidenceThreshold,
  iouThreshold,
  imageSize,
  trackingEnabled,
  stabilizationFrames,
  minBoxAreaPct,
  cooldownSeconds,
  autoCaptureEnabled,
  activeClasses,
  soundAlertEnabled,
  setSoundAlertEnabled,
  onCameraStateChange,
  onSnapshotSaved
}) => {
  // Video and Canvas refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraStartRef = useRef(false);
  const trackingSessionRef = useRef<string>('');

  // Camera State
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [resolution, setResolution] = useState<{ width: number; height: number }>({ width: 1280, height: 720 });

  // Detection & Inference State
  const [activeBoxes, setActiveBoxes] = useState<DetectionBox[]>([]);
  const [currentDetections, setCurrentDetections] = useState<string[]>([]);
  const [inferenceMs, setInferenceMs] = useState<number>(0);
  const [inferenceError, setInferenceError] = useState<string | null>(null);
  const [clientFps, setClientFps] = useState<number>(0);
  const [highestConf, setHighestConf] = useState<number>(0);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [shutterEffect, setShutterEffect] = useState<boolean>(false);
  const [cooldownCountdown, setCooldownCountdown] = useState<number>(0);
  const [overlayStyle, setOverlayStyle] = useState<'hud' | 'minimal' | 'clean'>('hud');

  // Tracking State for Sound Alert Triggering
  const wasAnimalDetectedRef = useRef<boolean>(false);
  const isDetectingRef = useRef<boolean>(false);
  const lastCaptureTimeRef = useRef<number>(0);
  const prevTimeRef = useRef<number>(performance.now());

  // Enumerate video devices on mount
  useEffect(() => {
    async function getDevices() {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      } catch (err) {
        console.warn('Could not enumerate video devices:', err);
      }
    }
    getDevices();
  }, [selectedDeviceId]);

  // Start Camera Stream
  const startCamera = async () => {
    if (cameraStartRef.current) return;
    cameraStartRef.current = true;
    setCameraLoading(true);
    setCameraError(null);
    trackingSessionRef.current = globalThis.crypto?.randomUUID?.() ?? `stream-${Date.now()}`;
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          width: { ideal: resolution.width },
          height: { ideal: resolution.height },
          facingMode: 'user'
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          setIsStreaming(false);
          setActiveBoxes([]);
          setCurrentDetections([]);
          onCameraStateChange(false);
          setCameraError('Camera disconnected. Reconnect the device and start the stream again.');
        }, { once: true });
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsStreaming(true);
      onCameraStateChange(true);
      // Refresh devices in case labels were previously blocked
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAvailableDevices(devices.filter((d) => d.kind === 'videoinput'));
      setCameraLoading(false);
      cameraStartRef.current = false;
    } catch (err: any) {
      console.error('Camera access error:', err);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      let msg = 'Failed to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Please allow browser camera access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No video capture hardware detected on this device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera is currently locked or being used by another application.';
      }
      setCameraError(msg);
      setCameraLoading(false);
      cameraStartRef.current = false;
      setIsStreaming(false);
      onCameraStateChange(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setActiveBoxes([]);
    setCurrentDetections([]);
    onCameraStateChange(false);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Frame Capture & Inference Loop
  const runInferenceCycle = useCallback(async () => {
    if (!isStreaming || !videoRef.current || !hiddenCanvasRef.current || isDetectingRef.current) {
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth === 0) {
      animationFrameRef.current = requestAnimationFrame(runInferenceCycle);
      return;
    }

    // Measure Client FPS
    const now = performance.now();
    const dt = now - prevTimeRef.current;
    prevTimeRef.current = now;
    const currentFps = dt > 0 ? 1000 / dt : 0;
    setClientFps((prev) => Math.round(0.85 * prev + 0.15 * currentFps));

    // Capture Video Frame into Canvas
    const canvas = hiddenCanvasRef.current;
    const targetW = imageSize;
    const targetH = Math.round((video.videoHeight / video.videoWidth) * imageSize) || 360;
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(runInferenceCycle);
      return;
    }

    // Draw mirrored to match video display
    ctx.drawImage(video, 0, 0, targetW, targetH);
    const frameBase64 = canvas.toDataURL('image/jpeg', 0.85);

    isDetectingRef.current = true;

    try {
      const result: DetectionResponse = await detectFrame(
        frameBase64,
        confidenceThreshold,
        autoCaptureEnabled,
        activeClasses,
        {
          iou_threshold: iouThreshold,
          image_size: imageSize,
          tracking_enabled: trackingEnabled,
          stabilization_frames: stabilizationFrames,
          min_box_area_pct: minBoxAreaPct,
          tracking_session: trackingSessionRef.current
        }
      );

      setInferenceError(result.error || null);
      setActiveBoxes(result.boxes || []);
      setCurrentDetections(result.found_animals || []);
      setInferenceMs(result.inference_ms || 0);
      setHighestConf(result.highest_confidence || 0);

      // Sound Alert Triggering (State change: from 0 animals to 1+ animals)
      if (result.found_animals && result.found_animals.length > 0) {
        if (!wasAnimalDetectedRef.current) {
          if (soundAlertEnabled) {
            audioService.playDetectionChime();
          }
          wasAnimalDetectedRef.current = true;
        }

        // Notify parent if auto-captured on backend
        if (result.auto_captured && result.capture_file) {
          audioService.playShutterSound();
          setShutterEffect(true);
          setTimeout(() => setShutterEffect(false), 300);
          onSnapshotSaved(result.capture_file, result.primary_animal || 'Animal');
          lastCaptureTimeRef.current = Date.now();
        }
      } else {
        wasAnimalDetectedRef.current = false;
      }
    } catch (err: any) {
      console.warn('Inference frame dropped:', err);
      setInferenceError(err.message || 'Inference request failed');
      setActiveBoxes([]);
      setCurrentDetections([]);
    } finally {
      isDetectingRef.current = false;
      // Trigger next frame after modest pacing (~20-25 FPS to conserve CPU)
      setTimeout(() => {
        if (isStreaming) {
          animationFrameRef.current = requestAnimationFrame(runInferenceCycle);
        }
      }, 35);
    }
  }, [isStreaming, confidenceThreshold, iouThreshold, imageSize, trackingEnabled, stabilizationFrames, minBoxAreaPct, autoCaptureEnabled, activeClasses, soundAlertEnabled, onSnapshotSaved]);

  // Launch inference loop once streaming
  useEffect(() => {
    if (isStreaming) {
      animationFrameRef.current = requestAnimationFrame(runInferenceCycle);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isStreaming, runInferenceCycle]);

  // Cooldown timer tracker for auto-capture
  useEffect(() => {
    if (!autoCaptureEnabled) {
      setCooldownCountdown(0);
      return;
    }
    const interval = setInterval(() => {
      const elapsed = (Date.now() - lastCaptureTimeRef.current) / 1000;
      const rem = Math.max(0, cooldownSeconds - elapsed);
      setCooldownCountdown(Math.round(rem * 10) / 10);
    }, 200);
    return () => clearInterval(interval);
  }, [autoCaptureEnabled, cooldownSeconds]);

  // Trigger Manual Snapshot
  const handleManualSnapshot = async () => {
    if (!videoRef.current || !isStreaming) return;
    setIsCapturing(true);

    try {
      // Create high-res canvas snapshot from full video resolution
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = videoRef.current.videoWidth || 1280;
      snapCanvas.height = videoRef.current.videoHeight || 720;
      const ctx = snapCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, snapCanvas.width, snapCanvas.height);
        const highResB64 = snapCanvas.toDataURL('image/jpeg', 0.94);

        audioService.playShutterSound();
        setShutterEffect(true);
        setTimeout(() => setShutterEffect(false), 300);

        const primary = currentDetections.length > 0 ? currentDetections[0] : 'Manual_Capture';
        const res = await sendManualCapture(highResB64, primary, highestConf, activeBoxes);
        onSnapshotSaved(res.filename, primary);
      }
    } catch (err: any) {
      console.error('Manual capture failed:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="view-content">
      {/* Hidden processing canvas */}
      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />

      {/* Main Studio Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: Viewfinder & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Main Viewfinder Card */}
          <div className="viewfinder-card">
            {/* Viewfinder Header */}
            <div className="viewfinder-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`status-dot ${isStreaming ? 'active' : ''}`}></span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.04em' }}>
                  {isStreaming ? 'OPTICAL FEED ACTIVE' : 'SENSOR STANDBY'}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>•</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {isStreaming ? `${resolution.width}x${resolution.height}` : 'NO STREAM'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* HUD Overlay Mode Selector */}
                <div style={{ display: 'flex', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xs)', overflow: 'hidden' }}>
                  <button 
                    onClick={() => setOverlayStyle('hud')}
                    style={{ 
                      padding: '3px 8px', 
                      fontSize: '10px', 
                      fontFamily: 'var(--font-mono)', 
                      backgroundColor: overlayStyle === 'hud' ? 'var(--accent-forest)' : 'transparent',
                      color: overlayStyle === 'hud' ? 'var(--text-primary)' : 'var(--text-muted)'
                    }}
                  >
                    HUD
                  </button>
                  <button 
                    onClick={() => setOverlayStyle('minimal')}
                    style={{ 
                      padding: '3px 8px', 
                      fontSize: '10px', 
                      fontFamily: 'var(--font-mono)', 
                      backgroundColor: overlayStyle === 'minimal' ? 'var(--accent-forest)' : 'transparent',
                      color: overlayStyle === 'minimal' ? 'var(--text-primary)' : 'var(--text-muted)'
                    }}
                  >
                    MIN
                  </button>
                  <button 
                    onClick={() => setOverlayStyle('clean')}
                    style={{ 
                      padding: '3px 8px', 
                      fontSize: '10px', 
                      fontFamily: 'var(--font-mono)', 
                      backgroundColor: overlayStyle === 'clean' ? 'var(--accent-forest)' : 'transparent',
                      color: overlayStyle === 'clean' ? 'var(--text-primary)' : 'var(--text-muted)'
                    }}
                  >
                    OFF
                  </button>
                </div>

                {/* Sound Alert Toggle */}
                <button 
                  className="btn btn-secondary btn-icon-only" 
                  onClick={() => {
                    const next = !soundAlertEnabled;
                    setSoundAlertEnabled(next);
                    audioService.setEnabled(next);
                  }}
                  title={soundAlertEnabled ? 'Mute Alert Chimes' : 'Enable Alert Chimes'}
                  style={{ width: '28px', height: '28px' }}
                >
                  {soundAlertEnabled ? <Volume2 size={13} /> : <VolumeX size={13} style={{ color: 'var(--text-muted)' }} />}
                </button>
              </div>
            </div>

            {/* Video Viewport Stage */}
            <div className="viewfinder-stage">
              {/* Shutter flash effect */}
              {shutterEffect && <div className="shutter-flash" />}

              {/* Real HTML5 Video element */}
              <video 
                ref={videoRef} 
                className="viewfinder-video"
                playsInline 
                muted 
                autoPlay 
              />

              {/* Reticle Corner Brackets */}
              <div className="reticle-corner reticle-tl" />
              <div className="reticle-corner reticle-tr" />
              <div className="reticle-corner reticle-bl" />
              <div className="reticle-corner reticle-br" />

              {/* Empty / Inactive Placeholder */}
              {!isStreaming && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', backgroundColor: '#07090B', padding: '24px', textAlign: 'center' }}>
                  {cameraError ? (
                    <>
                      <AlertTriangle size={36} style={{ color: 'var(--accent-amber)' }} strokeWidth={1.5} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '420px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Camera Access Blocked</span>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{cameraError}</span>
                      </div>
                      <button className="btn btn-primary" onClick={startCamera} style={{ marginTop: '8px' }}>
                        <RefreshCw size={14} />
                        <span>Grant Permission &amp; Retry</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Video size={42} style={{ color: 'var(--text-muted)', opacity: 0.6 }} strokeWidth={1.2} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Camera Optical Sensor Idle</span>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Click below to connect your webcam for real-time YOLOv8 animal detection.</span>
                      </div>
                      <button className="btn btn-primary" onClick={startCamera} disabled={cameraLoading} style={{ padding: '10px 22px' }}>
                        {cameraLoading ? <RefreshCw size={14} className="spin" /> : <Video size={14} />}
                        <span>{cameraLoading ? 'Initializing Sensor...' : 'Start Camera Stream'}</span>
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Bounding Box SVG Overlay (Coordinates mapped responsive to video aspect) */}
              {isStreaming && overlayStyle !== 'clean' && (
                <svg className="viewfinder-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none">
                  {activeBoxes.map((box, idx) => {
                    // Mirror X coordinate because video element is mirrored (scaleX(-1))
                    // Normal X: [nx1, nx2] -> In mirrored: [1 - nx2, 1 - nx1]
                    const rx1 = (1 - box.nx2) * 1000;
                    const ry1 = box.ny1 * 1000;
                    const rwidth = (box.nx2 - box.nx1) * 1000;
                    const rheight = (box.ny2 - box.ny1) * 1000;
                    const rx2 = rx1 + rwidth;
                    const ry2 = ry1 + rheight;

                    const cl = Math.min(24, rwidth * 0.25, rheight * 0.25); // Corner bracket length
                    const color = box.hex || '#387B5C';

                    return (
                      <g key={box.track_id != null ? `track_${box.track_id}` : `${box.class_id}_${idx}`}>
                        {/* Main Bounding Box Rectangle */}
                        <rect 
                          x={rx1} 
                          y={ry1} 
                          width={rwidth} 
                          height={rheight} 
                          fill="none" 
                          stroke={color} 
                          strokeWidth="2" 
                          strokeDasharray={overlayStyle === 'minimal' ? '4 2' : 'none'}
                        />

                        {/* Corner Accents (matching original Python draw_animal_box) */}
                        {overlayStyle === 'hud' && (
                          <>
                            {/* Top-Left */}
                            <line x1={rx1} y1={ry1} x2={rx1 + cl} y2={ry1} stroke={color} strokeWidth="3.5" />
                            <line x1={rx1} y1={ry1} x2={rx1} y2={ry1 + cl} stroke={color} strokeWidth="3.5" />
                            {/* Top-Right */}
                            <line x1={rx2} y1={ry1} x2={rx2 - cl} y2={ry1} stroke={color} strokeWidth="3.5" />
                            <line x1={rx2} y1={ry1} x2={rx2} y2={ry1 + cl} stroke={color} strokeWidth="3.5" />
                            {/* Bottom-Left */}
                            <line x1={rx1} y1={ry2} x2={rx1 + cl} y2={ry2} stroke={color} strokeWidth="3.5" />
                            <line x1={rx1} y1={ry2} x2={rx1} y2={ry2 - cl} stroke={color} strokeWidth="3.5" />
                            {/* Bottom-Right */}
                            <line x1={rx2} y1={ry2} x2={rx2 - cl} y2={ry2} stroke={color} strokeWidth="3.5" />
                            <line x1={rx2} y1={ry2} x2={rx2} y2={ry2 - cl} stroke={color} strokeWidth="3.5" />
                          </>
                        )}

                        {/* Species Tag & Confidence Label */}
                        <g transform={`translate(${rx1}, ${Math.max(26, ry1)})`}>
                          <rect 
                            x="0" 
                            y="-24" 
                            width={Math.max(110, box.name.length * 11 + 54)} 
                            height="24" 
                            fill="rgba(10, 13, 16, 0.9)" 
                            stroke={color}
                            strokeWidth="1"
                            rx="2"
                          />
                          <text 
                            x="8" 
                            y="-7" 
                            fill="#F5F3EF" 
                            fontSize="13" 
                            fontWeight="600"
                            fontFamily="Inter, sans-serif"
                          >
                            {box.name}{box.track_id != null ? ` #${box.track_id}` : ''}
                          </text>
                          <text 
                            x={Math.max(102, box.name.length * 11 + 46)} 
                            y="-7" 
                            textAnchor="end"
                            fill={color} 
                            fontSize="11" 
                            fontWeight="700"
                            fontFamily="'JetBrains Mono', monospace"
                          >
                            {box.confidence_pct}%
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Viewfinder Telemetry HUD */}
              {isStreaming && (
                <>
                  <div className="viewfinder-hud-top">
                    <div className="hud-chip">
                      <span className="status-dot active"></span>
                      <span>INFERENCE: {inferenceMs}ms</span>
                    </div>

                    <div className="hud-chip">
                      <span>FPS: {clientFps}</span>
                    </div>
                    {inferenceError && <div className="hud-chip" role="status" style={{ color: 'var(--accent-amber)' }}>INFERENCE ERROR: {inferenceError}</div>}
                  </div>

                  <div className="viewfinder-hud-bottom">
                    <div className="hud-chip">
                      <span>FAUNA IN SIGHT: {currentDetections.length > 0 ? currentDetections.join(', ') : 'None'}</span>
                    </div>

                    {autoCaptureEnabled && (
                      <div className="hud-chip" style={{ color: cooldownCountdown > 0 ? 'var(--text-muted)' : 'var(--accent-forest-light)' }}>
                        <Zap size={11} />
                        <span>{cooldownCountdown > 0 ? `COOLDOWN ${cooldownCountdown}s` : 'AUTO-CAPTURE ARMED'}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Controls Toolbar */}
            <div className="studio-controls-bar">
              <div className="control-group">
                {isStreaming ? (
                  <button className="btn btn-danger" onClick={stopCamera}>
                    <VideoOff size={14} />
                    <span>Stop Camera</span>
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={startCamera} disabled={cameraLoading}>
                    <Video size={14} />
                    <span>{cameraLoading ? 'Starting...' : 'Start Camera'}</span>
                  </button>
                )}

                <button 
                  className="btn btn-secondary" 
                  onClick={handleManualSnapshot} 
                  disabled={!isStreaming || isCapturing}
                >
                  <Camera size={14} />
                  <span>{isCapturing ? 'Saving...' : 'Take Snapshot'}</span>
                </button>
              </div>

              {/* Sliders & Device Pickers */}
              <div className="control-group">
                {/* Confidence Threshold */}
                <div className="control-item">
                  <span className="control-label">CONFIDENCE:</span>
                  <input 
                    type="range" 
                    min="0.10" 
                    max="0.95" 
                    step="0.05" 
                    value={confidenceThreshold} 
                    onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                    className="control-slider"
                    style={{ width: '80px' }}
                  />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, minWidth: '32px' }}>
                    {Math.round(confidenceThreshold * 100)}%
                  </span>
                </div>

                {/* Device Selector */}
                {availableDevices.length > 1 && (
                  <div className="control-item">
                    <span className="control-label">CAMERA:</span>
                    <select 
                      className="control-select"
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                    >
                      {availableDevices.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>
                          {d.label || `Camera ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Detection Telemetry Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Active Targets Card */}
          <div className="viewfinder-card">
            <div className="viewfinder-header">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Active Targets in Frame ({activeBoxes.length})
              </span>
              <Activity size={13} style={{ color: activeBoxes.length > 0 ? 'var(--accent-forest-light)' : 'var(--text-muted)' }} />
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '220px' }}>
              {activeBoxes.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px 12px', gap: '8px', color: 'var(--text-muted)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>SCANNING FIELD...</span>
                  <span style={{ fontSize: '12px', textAlign: 'center', color: 'var(--text-faint)' }}>
                    {isStreaming ? 'No supported fauna detected above threshold' : 'Camera stream is currently inactive'}
                  </span>
                </div>
              ) : (
                activeBoxes.map((box, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      padding: '12px 14px', 
                      backgroundColor: 'var(--bg-surface-elevated)', 
                      border: '1px solid var(--border-subtle)', 
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: box.hex }}></span>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{box.name}{box.track_id != null ? ` #${box.track_id}` : ''}</span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: box.hex }}>
                        {box.confidence_pct}%
                      </span>
                    </div>

                    {/* Confidence Meter Bar */}
                    <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${box.confidence_pct}%`, 
                          height: '100%', 
                          backgroundColor: box.hex, 
                          transition: 'width 200ms ease-out' 
                        }} 
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                      <span>CLASS ID {box.class_id}</span>
                      <span>{box.width} x {box.height} PX</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                      BOX ({box.x1}, {box.y1}) → ({box.x2}, {box.y2})
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Configuration Card */}
          <div className="viewfinder-card">
            <div className="viewfinder-header">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Automated Capture Protocol
              </span>
              <Zap size={13} style={{ color: autoCaptureEnabled ? 'var(--accent-amber)' : 'var(--text-muted)' }} />
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Auto-Capture on Sight</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: autoCaptureEnabled ? 'var(--accent-forest-light)' : 'var(--text-muted)' }}>
                  {autoCaptureEnabled ? 'ENABLED' : 'MUTED'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Cooldown Interval</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {cooldownSeconds}s
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Destination Vault</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                  ./animal_captures/
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
