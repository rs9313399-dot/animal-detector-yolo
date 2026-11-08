import React from 'react';
import { X, Globe, Shield, Tag, Eye } from 'lucide-react';
import { AnimalReference } from '../types';

interface AnimalDetailModalProps {
  animal: AnimalReference | null;
  onClose: () => void;
}

export const AnimalDetailModal: React.FC<AnimalDetailModalProps> = ({ animal, onClose }) => {
  if (!animal) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-dialog" 
        style={{ maxWidth: '780px', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-hairline)', backgroundColor: 'var(--bg-surface-elevated)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: animal.hex }}></span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              Species Dossier • Class #{animal.class_id}
            </span>
          </div>

          <button className="btn btn-secondary btn-icon-only" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        {/* Hero Photo Banner */}
        <div style={{ width: '100%', height: '280px', overflow: 'hidden', position: 'relative' }}>
          <img 
            src={animal.imageUrl} 
            alt={animal.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-surface) 0%, transparent 70%)' }} />
          
          <div style={{ position: 'absolute', bottom: '16px', left: '20px', right: '20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 600, color: '#fff', letterSpacing: '-0.02em' }}>
                {animal.name}
              </h2>
              <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '15px', color: 'var(--text-secondary)' }}>
                {animal.scientific}
              </span>
            </div>

            <span className="status-pill" style={{ borderColor: animal.hex, color: animal.hex }}>
              {animal.iucn.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-forest-bright)', letterSpacing: '0.06em', marginBottom: '6px' }}>
              BIOLOGICAL OVERVIEW
            </h4>
            <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
              {animal.description}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div style={{ padding: '14px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                HABITAT &amp; BIOME
              </span>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                {animal.habitat}
              </p>
            </div>

            <div style={{ padding: '14px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                YOLOv8 VISUAL FEATURES
              </span>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                {animal.yoloInfo}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

