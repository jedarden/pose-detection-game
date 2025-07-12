import { useState, useEffect } from 'react';
import type { CameraSelectorProps } from '../types';
import './CameraSelector.css';

const CameraSelector = ({
  devices,
  selectedDeviceId,
  onDeviceSelect
}: CameraSelectorProps) => {
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkCameraPermission();
  }, []);

  const checkCameraPermission = async () => {
    try {
      // Try to get user media to check permissions
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionStatus('granted');
    } catch (error) {
      console.error('Camera permission check failed:', error);
      setPermissionStatus('denied');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeviceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = event.target.value;
    onDeviceSelect(deviceId);
  };

  const requestPermission = async () => {
    setIsLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionStatus('granted');
      
      // Trigger device enumeration after permission granted
      const updatedDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = updatedDevices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length > 0 && !selectedDeviceId) {
        onDeviceSelect(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Failed to get camera permission:', error);
      setPermissionStatus('denied');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="camera-selector">
        <div className="loading-spinner">
          <span>Loading cameras...</span>
        </div>
      </div>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <div className="camera-selector">
        <div className="permission-denied">
          <p>Camera access denied. Please enable camera permissions.</p>
          <button onClick={requestPermission} className="permission-button">
            Request Camera Access
          </button>
        </div>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="camera-selector">
        <div className="no-devices">
          <p>No cameras available</p>
          <button onClick={checkCameraPermission} className="refresh-button">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="camera-selector">
      <label htmlFor="camera-select" className="camera-label">
        📹 Select Camera
      </label>
      <select
        id="camera-select"
        value={selectedDeviceId || ''}
        onChange={handleDeviceChange}
        className="camera-select"
        aria-label="Select Camera"
      >
        <option value="" disabled>
          Choose a camera...
        </option>
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Camera ${device.deviceId.slice(0, 8)}...`}
          </option>
        ))}
      </select>
      
      <div className="camera-info">
        <span className="device-count">
          {devices.length} camera{devices.length !== 1 ? 's' : ''} available
        </span>
      </div>
    </div>
  );
};

export default CameraSelector;