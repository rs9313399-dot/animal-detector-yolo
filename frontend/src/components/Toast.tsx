import React from 'react';
import { CheckCircle2, AlertTriangle, Info, AlertCircle, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastShelfProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastShelf: React.FC<ToastShelfProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-shelf">
      {toasts.map((t) => {
        let Icon = CheckCircle2;
        let iconColor = 'var(--accent-forest-light)';
        if (t.type === 'alert') {
          Icon = AlertTriangle;
          iconColor = 'var(--accent-amber)';
        } else if (t.type === 'error') {
          Icon = AlertCircle;
          iconColor = 'var(--accent-crimson)';
        } else if (t.type === 'info') {
          Icon = Info;
          iconColor = 'var(--accent-cyan)';
        }

        return (
          <div key={t.id} className="toast-item">
            <Icon size={18} style={{ color: iconColor, flexShrink: 0, marginTop: '2px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{t.message}</span>
            </div>
            <button 
              onClick={() => onDismiss(t.id)} 
              style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
              aria-label="Dismiss toast"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

