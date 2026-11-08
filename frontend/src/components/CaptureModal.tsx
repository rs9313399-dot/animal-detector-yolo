import React from 'react';
import { X, Download, Trash2, Calendar, FileText, CheckCircle2, Shield } from 'lucide-react';
import { CaptureItem } from '../types';

interface CaptureModalProps {
  capture: CaptureItem | null;
  onClose: () => void;
  onDelete: (capture: CaptureItem) => void;
}

export const CaptureModal: React.FC<CaptureModalProps> = ({
  capture,
  onClose,
  onDelete
}) => {
  if (!capture) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-dialog" 
        style={{ maxWidth: '840px', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-hairline)', backgroundColor: 'var(--bg-surface-elevated)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: capture.animal_color || 'var(--accent-forest)' }}></span>
            <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>
              {capture.animal} Observation Record
            </span>
            {capture.confidence_pct !== undefined && capture.confidence_pct !== null && (
              <span className="status-pill" style={{ borderColor: capture.animal_color }}>
                {capture.confidence_pct}% CONF
              </span>
            )}
          </div>

          <button className="btn btn-secondary btn-icon-only" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Main High-Res Image View */}
          <div style={{ width: '100%', maxHeight: '520px', backgroundColor: '#050708', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img 
              src={capture.url} 
              alt={capture.animal} 
              style={{ width: '100%', height: 'auto', maxHeight: '520px', objectFit: 'contain' }}
            />
          </div>

          {/* Details & Actions Footer */}
          <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>TIMESTAMP: </span>
                <span style={{ color: 'var(--text-primary)' }}>{capture.display_date} • {capture.display_time}</span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)' }}>FILE: </span>
                <span style={{ color: 'var(--text-primary)' }}>{capture.filename}</span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)' }}>SIZE: </span>
                <span style={{ color: 'var(--text-primary)' }}>{capture.size_kb} KB</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button 
                className="btn btn-danger" 
                onClick={() => {
                  onDelete(capture);
                  onClose();
                }}
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>

              <a 
                href={capture.download_url} 
                className="btn btn-primary"
                download
              >
                <Download size={13} />
                <span>Download Snapshot</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

