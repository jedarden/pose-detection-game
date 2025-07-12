import { DetectionConfig } from '../types';
import './DetectionModeSelector.css';

interface DetectionModeSelectorProps {
  mode: DetectionConfig['detectionMode'];
  onModeChange: (mode: DetectionConfig['detectionMode']) => void;
}

const DetectionModeSelector = ({ mode, onModeChange }: DetectionModeSelectorProps) => {
  return (
    <div className="detection-mode-selector">
      <span className="mode-label">Detection Mode:</span>
      <div className="mode-buttons">
        <button
          className={`mode-button ${mode === 'arms-only' ? 'active' : ''}`}
          onClick={() => onModeChange('arms-only')}
          title="Better for mobile devices and smaller spaces"
        >
          <span className="mode-icon">💪</span>
          <span className="mode-text">Arms Only</span>
          <span className="mode-description">Recommended for mobile</span>
        </button>
        <button
          className={`mode-button ${mode === 'full-body' ? 'active' : ''}`}
          onClick={() => onModeChange('full-body')}
          title="Requires more space and camera distance"
        >
          <span className="mode-icon">🚶</span>
          <span className="mode-text">Full Body</span>
          <span className="mode-description">Requires more space</span>
        </button>
      </div>
    </div>
  );
};

export default DetectionModeSelector;