import React from 'react';
import { 
  LayoutDashboard, 
  Video, 
  Image as ImageIcon, 
  Compass, 
  Sliders, 
  Activity,
  Cpu
} from 'lucide-react';
import { NavigationTab, SystemStatus } from '../types';

interface SidebarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  status: SystemStatus | null;
  cameraActive: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  status,
  cameraActive,
  isOpen,
  onClose
}) => {
  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
    { id: 'studio', label: 'Live Studio', icon: <Video /> },
    { id: 'history', label: 'Detection History', icon: <ImageIcon /> },
    { id: 'explorer', label: 'Animal Explorer', icon: <Compass /> },
    { id: 'settings', label: 'System Settings', icon: <Sliders /> },
  ];

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-row">
          <div className="brand-monogram">F</div>
          <span className="brand-name">FAUNA</span>
        </div>
        <span className="brand-subtitle">Wildlife Intelligence</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(item.id);
              onClose();
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Engine Status / Telemetry */}
      <div className="sidebar-telemetry">
        <div className="telemetry-row">
          <span className="telemetry-label">SYSTEM CORE</span>
          <span className="status-pill" style={{ padding: '2px 6px', fontSize: '10px' }}>
            <span className={`status-dot ${status?.model_loaded ? 'active' : 'amber'}`}></span>
            {status?.model_loaded ? 'YOLOv8N' : 'INITIALIZING'}
          </span>
        </div>

        <div className="telemetry-row">
          <span className="telemetry-label">CAMERA SENSOR</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: cameraActive ? 'var(--accent-forest-light)' : 'var(--text-muted)' }}>
            {cameraActive ? 'STREAMING' : 'STANDBY'}
          </span>
        </div>

        <div className="telemetry-row">
          <span className="telemetry-label">DEVICE COMPUTE</span>
          <span className="telemetry-val" style={{ textTransform: 'uppercase' }}>
            {status?.device || 'CPU'}
          </span>
        </div>

        <div className="telemetry-row">
          <span className="telemetry-label">SAVED CAPTURES</span>
          <span className="telemetry-val">
            {status?.total_captures ?? 0}
          </span>
        </div>
      </div>
    </aside>
  );
};
