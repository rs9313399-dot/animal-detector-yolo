import React, { useState, useEffect, useCallback } from 'react';
import { NavigationTab, SystemStatus, CaptureItem, AnimalReference, ToastMessage, SystemSettings } from './types';
import { fetchStatus, fetchSettings, saveSettings } from './services/api';
import { audioService } from './services/audio';
import { SUPPORTED_ANIMALS } from './constants/animals';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { LiveStudio } from './components/LiveStudio';
import { HistoryGallery } from './components/HistoryGallery';
import { AnimalExplorer } from './components/AnimalExplorer';
import { SettingsView } from './components/SettingsView';
import { CaptureModal } from './components/CaptureModal';
import { AnimalDetailModal } from './components/AnimalDetailModal';
import { ToastShelf } from './components/Toast';

import './styles/theme.css';
import './styles/layout.css';
import './styles/components.css';

export const App: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

  // System & Telemetry State
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);

  // Settings State (loaded from localStorage or server defaults)
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('fauna_confidence');
    return saved ? parseFloat(saved) : 0.45;
  });
  const [iouThreshold, setIouThreshold] = useState<number>(() => Number(localStorage.getItem('fauna_iou') ?? 0.55));
  const [imageSize, setImageSize] = useState<number>(() => Number(localStorage.getItem('fauna_image_size') ?? 640));
  const [trackingEnabled, setTrackingEnabled] = useState<boolean>(() => localStorage.getItem('fauna_tracking') === 'true');
  const [stabilizationFrames, setStabilizationFrames] = useState<number>(() => Number(localStorage.getItem('fauna_stabilization') ?? 1));
  const [minBoxAreaPct, setMinBoxAreaPct] = useState<number>(() => Number(localStorage.getItem('fauna_min_box_area') ?? 0));
  const [modelName, setModelName] = useState<string>(() => localStorage.getItem('fauna_model') ?? 'yolov8n');
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(() => {
    const saved = localStorage.getItem('fauna_cooldown');
    return saved ? parseFloat(saved) : 3.0;
  });
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('fauna_auto_capture');
    return saved !== null ? saved === 'true' : true;
  });
  const [soundAlertEnabled, setSoundAlertEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('fauna_sound');
    return saved !== null ? saved === 'true' : true;
  });
  const [activeClasses, setActiveClasses] = useState<number[]>(() => {
    const saved = localStorage.getItem('fauna_classes');
    return saved ? JSON.parse(saved) : SUPPORTED_ANIMALS.map((a) => a.class_id);
  });

  // Modals & Overlays
  const [previewCapture, setPreviewCapture] = useState<CaptureItem | null>(null);
  const [selectedAnimalRef, setSelectedAnimalRef] = useState<AnimalReference | null>(null);

  // Toast Queue
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'alert' | 'error' | 'info', title: string, message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastMessage = { id, type, title, message, timestamp: Date.now() };
    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss after 4.5s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync Audio Service on sound setting change
  useEffect(() => {
    audioService.setEnabled(soundAlertEnabled);
  }, [soundAlertEnabled]);

  useEffect(() => {
    fetchSettings().then(async (settings) => {
      const overrides: Partial<SystemSettings> = {};
      const readNumber = (key: string, fallback: number, property: keyof SystemSettings) => {
        const stored = localStorage.getItem(key);
        const parsed = stored === null ? fallback : Number(stored);
        const value = Number.isFinite(parsed) ? parsed : fallback;
        if (stored !== null && Number.isFinite(parsed)) Object.assign(overrides, { [property]: value });
        return value;
      };
      setConfidenceThreshold(readNumber('fauna_confidence', settings.confidence_threshold, 'confidence_threshold'));
      setIouThreshold(readNumber('fauna_iou', settings.iou_threshold, 'iou_threshold'));
      setImageSize(readNumber('fauna_image_size', settings.image_size, 'image_size'));
      const tracking = localStorage.getItem('fauna_tracking');
      setTrackingEnabled(tracking === null ? settings.tracking_enabled : tracking === 'true');
      if (tracking !== null) overrides.tracking_enabled = tracking === 'true';
      setStabilizationFrames(readNumber('fauna_stabilization', settings.stabilization_frames, 'stabilization_frames'));
      setMinBoxAreaPct(readNumber('fauna_min_box_area', settings.min_box_area_pct, 'min_box_area_pct'));
      const storedModel = localStorage.getItem('fauna_model');
      const selectedModel = storedModel && settings.available_models.some((model) => model.id === storedModel) ? storedModel : settings.model_name;
      setModelName(selectedModel);
      if (storedModel && selectedModel !== settings.model_name) overrides.model_name = selectedModel;
      setCooldownSeconds(readNumber('fauna_cooldown', settings.cooldown_seconds, 'cooldown_seconds'));
      const autoCapture = localStorage.getItem('fauna_auto_capture');
      setAutoCaptureEnabled(autoCapture === null ? settings.auto_capture_enabled : autoCapture === 'true');
      if (autoCapture !== null) overrides.auto_capture_enabled = autoCapture === 'true';
      const classes = localStorage.getItem('fauna_classes');
      setActiveClasses(classes ? JSON.parse(classes) : settings.active_classes);
      if (classes) overrides.active_classes = JSON.parse(classes);
      if (Object.keys(overrides).length) await saveSettings(overrides);
    }).catch(() => console.warn('Could not synchronize backend settings'));
  }, []);

  // Polling System Status
  const refreshStatus = useCallback(async () => {
    try {
      const data = await fetchStatus();
      setStatus(data);
    } catch (err) {
      // Backend may be starting or offline
      console.warn('System status poll dropped');
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 4000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  // Handle Snapshot Saved Notification
  const handleSnapshotSaved = (filename: string, animal: string) => {
    addToast('success', 'Fauna Verified & Saved', `Captured ${animal} snapshot to ./animal_captures/${filename}`);
    refreshStatus();
  };

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        status={status}
        cameraActive={cameraActive}
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Main Viewport */}
      <main className="main-viewport">
        {/* App Header */}
        <Header 
          activeTab={activeTab}
          status={status}
          cameraActive={cameraActive}
          onToggleMobileNav={() => setMobileNavOpen(!mobileNavOpen)}
          onOpenStudio={() => setActiveTab('studio')}
        />

        {/* View Switcher */}
        {activeTab === 'dashboard' && (
          <Dashboard 
            status={status}
            cameraActive={cameraActive}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'studio' && (
          <LiveStudio 
            confidenceThreshold={confidenceThreshold}
            setConfidenceThreshold={setConfidenceThreshold}
            iouThreshold={iouThreshold}
            imageSize={imageSize}
            trackingEnabled={trackingEnabled}
            stabilizationFrames={stabilizationFrames}
            minBoxAreaPct={minBoxAreaPct}
            cooldownSeconds={cooldownSeconds}
            autoCaptureEnabled={autoCaptureEnabled}
            activeClasses={activeClasses}
            soundAlertEnabled={soundAlertEnabled}
            setSoundAlertEnabled={setSoundAlertEnabled}
            onCameraStateChange={setCameraActive}
            onSnapshotSaved={handleSnapshotSaved}
          />
        )}

        {activeTab === 'history' && (
          <HistoryGallery 
            onNavigate={(tab) => setActiveTab(tab)}
            onShowToast={addToast}
            onPreviewCapture={(cap) => setPreviewCapture(cap)}
          />
        )}

        {activeTab === 'explorer' && (
          <AnimalExplorer 
            onSelectAnimal={(animal) => setSelectedAnimalRef(animal)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView 
            status={status}
            confidenceThreshold={confidenceThreshold}
            setConfidenceThreshold={setConfidenceThreshold}
            iouThreshold={iouThreshold}
            setIouThreshold={setIouThreshold}
            imageSize={imageSize}
            setImageSize={setImageSize}
            trackingEnabled={trackingEnabled}
            setTrackingEnabled={setTrackingEnabled}
            stabilizationFrames={stabilizationFrames}
            setStabilizationFrames={setStabilizationFrames}
            minBoxAreaPct={minBoxAreaPct}
            setMinBoxAreaPct={setMinBoxAreaPct}
            modelName={modelName}
            setModelName={setModelName}
            cooldownSeconds={cooldownSeconds}
            setCooldownSeconds={setCooldownSeconds}
            autoCaptureEnabled={autoCaptureEnabled}
            setAutoCaptureEnabled={setAutoCaptureEnabled}
            soundAlertEnabled={soundAlertEnabled}
            setSoundAlertEnabled={setSoundAlertEnabled}
            activeClasses={activeClasses}
            setActiveClasses={setActiveClasses}
            onShowToast={addToast}
          />
        )}
      </main>

      {/* Modals */}
      <CaptureModal 
        capture={previewCapture}
        onClose={() => setPreviewCapture(null)}
        onDelete={(cap) => {
          setPreviewCapture(null);
          refreshStatus();
        }}
      />

      <AnimalDetailModal 
        animal={selectedAnimalRef}
        onClose={() => setSelectedAnimalRef(null)}
      />

      {/* Floating Toast Shelf */}
      <ToastShelf toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

