import React from 'react';
import { 
  Video, 
  Camera, 
  Image as ImageIcon, 
  Activity, 
  Cpu, 
  Clock, 
  Compass, 
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { SystemStatus, NavigationTab } from '../types';
import { SUPPORTED_ANIMALS } from '../constants/animals';

interface DashboardProps {
  status: SystemStatus | null;
  cameraActive: boolean;
  onNavigate: (tab: NavigationTab) => void;
  onTriggerSnapshot?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  status,
  cameraActive,
  onNavigate
}) => {
  const recentDetections = status?.recent_activity || [];
  const cumulative = status?.cumulative_animals || {};
  const totalCaptures = status?.total_captures ?? 0;
  const totalDetections = status?.total_detections ?? 0;
  const fps = status?.fps ?? 0;

  return (
    <div className="view-content">
      {/* Editorial Hero Header */}
      <div className="editorial-hero">
        <span className="editorial-eyebrow">Real-Time Computer Vision • COCO Fauna Class</span>
        <h2 className="editorial-heading">
          Precision wildlife observation <em>&amp; automated telemetry</em>
        </h2>
        <p className="editorial-lead">
          FAUNA integrates Ultralytics YOLOv8 neural network inference with real-time video stream analysis. 
          Designed for autonomous species categorization, telemetry capture, and field verification.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">CAMERA SENSOR</span>
            <span className={`status-dot ${cameraActive ? 'active' : ''}`}></span>
          </div>
          <div className="stat-number" style={{ fontSize: '20px' }}>
            {cameraActive ? 'STREAMING' : 'OFFLINE'}
          </div>
          <div className="stat-desc">
            {cameraActive ? 'Active frame processing at full framerate' : 'Standby mode — launch studio to connect'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">TOTAL DETECTIONS</span>
            <Activity size={15} style={{ color: 'var(--accent-forest-bright)' }} />
          </div>
          <div className="stat-number">{totalDetections}</div>
          <div className="stat-desc">Cumulative fauna instances verified</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">VAULT CAPTURES</span>
            <Camera size={15} style={{ color: 'var(--accent-amber)' }} />
          </div>
          <div className="stat-number">{totalCaptures}</div>
          <div className="stat-desc">Stored in local animal_captures/ archive</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">INFERENCE ENGINE</span>
            <Cpu size={15} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="stat-number" style={{ fontSize: '22px' }}>
            {fps > 0 ? `${fps.toFixed(1)} FPS` : status?.model_name?.toUpperCase() || 'WAITING'}
          </div>
          <div className="stat-desc">
            {status?.model_name?.toUpperCase() || 'Model pending'} • PyTorch {status?.device?.toUpperCase() || '—'} • {status?.image_size ?? '—'}px • {status?.inference_ms != null ? `${status.inference_ms.toFixed(1)}ms inference` : 'latency pending'}
          </div>
        </div>
      </div>

      {/* Hero Studio Banner */}
      <div className="viewfinder-card" style={{ padding: '24px 28px', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '580px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="status-pill" style={{ borderColor: 'var(--border-accent)' }}>
                <span className="status-dot active"></span>
                LIVE DETECTION STUDIO READY
              </span>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Open Camera Stream for Real-Time YOLO Inference
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Direct browser webcam connection via <code style={{ color: 'var(--accent-forest-light)', fontFamily: 'var(--font-mono)' }}>getUserMedia</code>.
              Renders real YOLOv8 coordinates, species confidence meters, automatic trigger snapshots, and audio alert pings.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary" onClick={() => onNavigate('studio')} style={{ padding: '12px 22px', fontSize: '14px' }}>
              <Video size={16} />
              <span>Launch Live Studio</span>
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigate('history')} style={{ padding: '12px 20px', fontSize: '14px' }}>
              <ImageIcon size={16} />
              <span>Browse Captures</span>
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Activity & Species Telemetry */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Left: Recent Activity Feed */}
        <div className="viewfinder-card">
          <div className="viewfinder-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
                Recent Field Activity
              </span>
            </div>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '4px 8px', fontSize: '11px' }}
              onClick={() => onNavigate('history')}
            >
              <span>View All</span>
              <ArrowUpRight size={12} />
            </button>
          </div>

          <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '260px' }}>
            {recentDetections.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: '10px', color: 'var(--text-muted)' }}>
                <Activity size={28} strokeWidth={1.5} />
                <span style={{ fontSize: '13px' }}>No live detections recorded yet</span>
                <span style={{ fontSize: '11.5px', color: 'var(--text-faint)' }}>Launch the Studio to begin field monitoring</span>
              </div>
            ) : (
              recentDetections.map((act) => (
                <div key={act.id} className="activity-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span 
                      className="species-chip" 
                      style={{ backgroundColor: 'var(--accent-forest-tint)', color: 'var(--accent-forest-bright)', border: '1px solid var(--border-accent)' }}
                    >
                      {act.primary_animal}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {act.count > 1 ? `+${act.count - 1} other` : ''}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{act.timestamp}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{Math.round(act.confidence * 100)}% CONF</span>
                    {act.captured && (
                      <span title="Saved to Vault" style={{ color: 'var(--accent-forest-light)', display: 'flex', alignItems: 'center' }}>
                        <Camera size={13} />
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Monitored Fauna Register */}
        <div className="viewfinder-card">
          <div className="viewfinder-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
                Monitored Species Register (10 Classes)
              </span>
            </div>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '4px 8px', fontSize: '11px' }}
              onClick={() => onNavigate('explorer')}
            >
              <span>Taxonomy</span>
              <ArrowUpRight size={12} />
            </button>
          </div>

          <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {SUPPORTED_ANIMALS.map((animal) => {
              const count = cumulative[animal.name] || 0;
              return (
                <div 
                  key={animal.class_id}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                  onClick={() => onNavigate('explorer')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: animal.hex }}></span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{animal.name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', color: 'var(--text-muted)' }}>Class {animal.class_id}</span>
                    </div>
                  </div>

                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: count > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
