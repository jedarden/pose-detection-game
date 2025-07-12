import React from 'react';
import type { DiagnosticsOverlayProps } from '../types';
import './DiagnosticsOverlay.css';

const DiagnosticsOverlay: React.FC<DiagnosticsOverlayProps> = ({
  data,
  isVisible,
  onToggle
}) => {
  if (!isVisible) return null;

  const getPerformanceStatus = () => {
    const warnings = [];
    const errors = [];

    if (data.fps < 15) {
      errors.push('Low FPS detected');
    } else if (data.fps < 24) {
      warnings.push('Low FPS detected');
    }

    if (data.detectionTime > 100) {
      warnings.push('High detection time');
    } else if (data.detectionTime > 200) {
      errors.push('High detection time');
    }

    if (data.memoryUsage > 85) {
      errors.push('High memory usage');
    } else if (data.memoryUsage > 70) {
      warnings.push('High memory usage');
    }

    return { warnings, errors };
  };

  const { warnings, errors } = getPerformanceStatus();

  return (
    <div className="diagnostics-overlay">
      <div className="diagnostics-panel">
        <div className="diagnostics-header">
          <h3>Diagnostics</h3>
          <button 
            className="close-button"
            onClick={onToggle}
            aria-label="Close diagnostics"
          >
            ✕
          </button>
        </div>

        <div className="diagnostics-content">
          {/* Performance Metrics */}
          <div className="diagnostics-section">
            <h4>Performance</h4>
            <div className="metrics-grid">
              <div className={`metric-item ${data.fps < 24 ? 'warning' : data.fps < 15 ? 'error' : 'good'}`}>
                <span className="metric-label">FPS:</span>
                <span className="metric-value">{data.fps}</span>
              </div>
              
              <div className={`metric-item ${data.detectionTime > 100 ? 'warning' : data.detectionTime > 200 ? 'error' : 'good'}`}>
                <span className="metric-label">Detection Time:</span>
                <span className="metric-value">{data.detectionTime}ms</span>
              </div>
              
              <div className={`metric-item ${data.memoryUsage > 70 ? 'warning' : data.memoryUsage > 85 ? 'error' : 'good'}`}>
                <span className="metric-label">Memory:</span>
                <span className="metric-value">{data.memoryUsage}%</span>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="diagnostics-section">
            <h4>System Status</h4>
            <div className="status-grid">
              <div className={`status-item ${data.modelLoaded ? 'active' : 'inactive'}`}>
                <span className="status-indicator"></span>
                <span className="status-label">Model: {data.modelLoaded ? 'Loaded' : 'Not Loaded'}</span>
              </div>
              
              <div className={`status-item ${data.cameraActive ? 'active' : 'inactive'}`}>
                <span className="status-indicator"></span>
                <span className="status-label">Camera: {data.cameraActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>

          {/* Performance Warnings */}
          {(warnings.length > 0 || errors.length > 0) && (
            <div className="diagnostics-section">
              <h4>Performance Alerts</h4>
              <div className="alerts-list">
                {errors.map((error, index) => (
                  <div key={`error-${index}`} className="alert-item error">
                    <span className="alert-icon">⚠️</span>
                    <span className="alert-text">{error}</span>
                  </div>
                ))}
                {warnings.map((warning, index) => (
                  <div key={`warning-${index}`} className="alert-item warning">
                    <span className="alert-icon">⚡</span>
                    <span className="alert-text">{warning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          <div className="diagnostics-section">
            <h4>Errors</h4>
            <div className="errors-list">
              {data.errors.length === 0 ? (
                <div className="no-errors">
                  <span className="success-icon">✅</span>
                  <span>No errors</span>
                </div>
              ) : (
                data.errors.map((error, index) => (
                  <div key={index} className="error-item">
                    <span className="error-icon">❌</span>
                    <span className="error-text">{error}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Technical Details */}
          <div className="diagnostics-section">
            <h4>Technical Details</h4>
            <div className="technical-grid">
              <div className="tech-item">
                <span className="tech-label">Browser:</span>
                <span className="tech-value">{navigator.userAgent.split(' ').pop()}</span>
              </div>
              <div className="tech-item">
                <span className="tech-label">Screen:</span>
                <span className="tech-value">{window.screen.width}x{window.screen.height}</span>
              </div>
              <div className="tech-item">
                <span className="tech-label">Timestamp:</span>
                <span className="tech-value">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticsOverlay;