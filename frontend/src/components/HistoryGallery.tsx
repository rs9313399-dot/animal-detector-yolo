import React, { useState, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  Search, 
  Download, 
  Trash2, 
  Calendar, 
  Maximize2, 
  Filter, 
  ArrowUpDown,
  RefreshCw,
  Video,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { CaptureItem, NavigationTab } from '../types';
import { fetchCaptures, deleteCapture } from '../services/api';
import { SUPPORTED_ANIMALS } from '../constants/animals';

interface HistoryGalleryProps {
  onNavigate: (tab: NavigationTab) => void;
  onShowToast: (type: 'success' | 'alert' | 'error' | 'info', title: string, message: string) => void;
  onPreviewCapture: (capture: CaptureItem) => void;
}

export const HistoryGallery: React.FC<HistoryGalleryProps> = ({
  onNavigate,
  onShowToast,
  onPreviewCapture
}) => {
  const [captures, setCaptures] = useState<CaptureItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAnimal, setSelectedAnimal] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [deleteTarget, setDeleteTarget] = useState<CaptureItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const loadCaptures = async () => {
    setLoading(true);
    try {
      const data = await fetchCaptures(selectedAnimal, searchQuery, sortOrder);
      setCaptures(data);
    } catch (err) {
      console.error('Failed to load captures:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaptures();
  }, [selectedAnimal, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCaptures();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteCapture(deleteTarget.filename);
      onShowToast('success', 'Capture Deleted', `Removed ${deleteTarget.filename} from the archive`);
      setDeleteTarget(null);
      loadCaptures();
    } catch (err: any) {
      onShowToast('error', 'Delete Failed', err.message || 'Could not delete file');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="view-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div className="editorial-hero">
          <span className="editorial-eyebrow">Visual Evidence Vault</span>
          <h2 className="editorial-heading">
            Detection <em>&amp; Capture Archive</em>
          </h2>
          <p className="editorial-lead">
            High-resolution visual telemetry recorded automatically and manually to <code style={{ color: 'var(--accent-forest-light)', fontFamily: 'var(--font-mono)' }}>./animal_captures/</code>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={loadCaptures} disabled={loading} title="Refresh Archive">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('studio')}>
            <Video size={14} />
            <span>Launch Studio</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', padding: '16px 20px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
        {/* Animal Category Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', maxWidth: '100%', paddingBottom: '2px' }}>
          <button 
            className={`btn ${selectedAnimal === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={() => setSelectedAnimal('all')}
          >
            All Classes
          </button>
          {SUPPORTED_ANIMALS.map((a) => (
            <button
              key={a.class_id}
              className={`btn ${selectedAnimal.toLowerCase() === a.name.toLowerCase() ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => setSelectedAnimal(a.name)}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: a.hex }}></span>
              <span>{a.name}</span>
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search filename or species..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                padding: '6px 12px 6px 32px', 
                fontSize: '12px', 
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                width: '210px'
              }}
            />
          </form>

          {/* Sort Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowUpDown size={13} style={{ color: 'var(--text-muted)' }} />
            <select 
              className="control-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              style={{ fontSize: '12px', padding: '5px 8px' }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '12px', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="spin" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>ACCESSING VAULT STORAGE...</span>
        </div>
      ) : captures.length === 0 ? (
        /* Empty State */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '16px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--bg-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <ImageIcon size={22} strokeWidth={1.5} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '440px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
              No Animal Captures Recorded
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              The vault is currently empty. Start the camera in Live Studio to begin automated snapshot capture upon fauna detection or trigger manual screenshots.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => onNavigate('studio')}>
            <Video size={14} />
            <span>Launch Live Detection Studio</span>
          </button>
        </div>
      ) : (
        <div className="gallery-grid">
          {captures.map((item) => (
            <div 
              key={item.id} 
              className="capture-card"
              onClick={() => onPreviewCapture(item)}
            >
              {/* Thumbnail Container */}
              <div className="capture-thumb-box">
                <img 
                  src={item.url} 
                  alt={item.animal} 
                  className="capture-thumb"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback placeholder if image load fails
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" fill="%23111519"><rect width="100%" height="100%"/><text x="50%" y="50%" fill="%235F666D" text-anchor="middle" font-family="sans-serif" font-size="12">Capture Preview</text></svg>';
                  }}
                />
                
                {/* Confidence Badge */}
                {item.confidence_pct !== undefined && item.confidence_pct !== null && (
                  <span 
                    style={{ 
                      position: 'absolute', 
                      top: '10px', 
                      right: '10px', 
                      padding: '3px 7px', 
                      backgroundColor: 'rgba(10, 13, 16, 0.85)',
                      backdropFilter: 'blur(6px)',
                      border: `1px solid ${item.animal_color || 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-xs)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: item.animal_color || 'var(--text-primary)'
                    }}
                  >
                    {item.confidence_pct}% CONF
                  </span>
                )}
              </div>

              {/* Card Meta Box */}
              <div className="capture-meta-box">
                <div className="capture-title-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: item.animal_color || 'var(--accent-forest)' }}></span>
                    <span className="capture-animal-name">{item.animal}</span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                    <a 
                      href={item.download_url} 
                      className="btn btn-secondary btn-icon-only" 
                      style={{ width: '26px', height: '26px' }}
                      title="Download image"
                      download
                    >
                      <Download size={12} />
                    </a>
                    <button 
                      className="btn btn-danger btn-icon-only"
                      style={{ width: '26px', height: '26px' }}
                      title="Delete capture"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="capture-date-row">
                  <span>{item.display_date}</span>
                  <span>{item.display_time}</span>
                  <span>{item.size_kb} KB</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-dialog" style={{ maxWidth: '440px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'var(--accent-crimson-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-crimson)' }}>
                <Trash2 size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Delete Capture Record?</h4>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{deleteTarget.filename}</span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
              Are you sure you want to permanently delete this detection snapshot from the <code style={{ color: 'var(--text-primary)' }}>animal_captures/</code> directory? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
