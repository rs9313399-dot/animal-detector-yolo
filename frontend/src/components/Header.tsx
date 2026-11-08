import React from 'react';
import { Menu, Camera, Video, ShieldCheck, ShieldAlert } from 'lucide-react';
import { NavigationTab, SystemStatus } from '../types';

interface HeaderProps {
  activeTab: NavigationTab;
  status: SystemStatus | null;
  cameraActive: boolean;
  onToggleMobileNav: () => void;
  onOpenStudio: () => void;
  onTriggerSnapshot?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  status,
  cameraActive,
  onToggleMobileNav,
  onOpenStudio,
  onTriggerSnapshot
}) => {
  const getTabMetadata = (tab: NavigationTab) => {
    switch (tab) {
      case 'dashboard':
        return { crumb: 'Overview', title: 'Operational Command' };
      case 'studio':
        return { crumb: 'Real-Time Inference', title: 'Live Detection Studio' };
      case 'history':
        return { crumb: 'Vault', title: 'Captured Fauna Records' };
      case 'explorer':
        return { crumb: 'Species Index', title: 'Fauna Taxonomy Explorer' };
      case 'settings':
        return { crumb: 'Configuration', title: 'Inference & System Settings' };
    }
  };

  const { crumb, title } = getTabMetadata(activeTab);

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="mobile-nav-toggle" onClick={onToggleMobileNav} aria-label="Toggle Navigation">
          <Menu size={18} />
        </button>
        <div className="header-title-box">
          <span className="header-breadcrumb">{crumb}</span>
          <h1 className="header-title">{title}</h1>
        </div>
      </div>

      <div className="header-right">
        {/* Model Status Pill */}
        <div className="status-pill">
          <span className={`status-dot ${status?.model_loaded ? 'active' : 'amber'}`}></span>
          <span>{status?.model_loaded ? 'YOLOv8 Active' : 'Loading Model'}</span>
        </div>

        {/* Camera Status Pill */}
        <div className="status-pill">
          <span className={`status-dot ${cameraActive ? 'active' : ''}`}></span>
          <span>{cameraActive ? 'Camera Live' : 'Camera Idle'}</span>
        </div>

        {/* Quick Action Button */}
        {activeTab !== 'studio' ? (
          <button className="btn btn-primary" onClick={onOpenStudio}>
            <Video size={14} />
            <span>Launch Studio</span>
          </button>
        ) : (
          cameraActive && onTriggerSnapshot && (
            <button className="btn btn-secondary" onClick={onTriggerSnapshot} title="Capture Current Frame">
              <Camera size={14} />
              <span>Snapshot</span>
            </button>
          )
        )}
      </div>
    </header>
  );
};
