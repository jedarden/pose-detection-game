import { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAppStore } from './store';
import CameraSelector from './components/CameraSelector';
import PoseDetector from './components/PoseDetector';
import PoseGameOverlay from './components/PoseGameOverlay';
import DiagnosticsOverlay from './components/DiagnosticsOverlay';
import './App.css';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    cameraSettings,
    availableDevices,
    setCameraDevice,
    detectionConfig,
    currentPose,
    setPose,
    gameState,
    diagnostics,
    showDiagnostics,
    toggleDiagnostics,
    updateDiagnostics,
    startGame,
    pauseGame,
    endGame,
    updateScore
  } = useAppStore();

  // Get available camera devices on mount
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        // Update store with available devices
        useAppStore.setState({ availableDevices: videoDevices });
        
        // Set default device if none selected
        if (!cameraSettings.deviceId && videoDevices.length > 0) {
          setCameraDevice(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error('Failed to get camera devices:', error);
        updateDiagnostics({ 
          errors: ['Failed to access camera devices'] 
        });
      }
    };

    getDevices();
  }, [setCameraDevice, updateDiagnostics, cameraSettings.deviceId]);

  const handlePoseDetected = (pose: any) => {
    setPose(pose);
    
    // Update diagnostics with detection info
    if (pose) {
      updateDiagnostics({
        modelLoaded: true,
        cameraActive: true
      });
    }
  };

  const handleGameToggle = () => {
    if (gameState.isPlaying) {
      pauseGame();
    } else if (gameState.isGameOver) {
      // Reset game
      endGame();
      startGame();
    } else {
      startGame();
    }
  };

  return (
    <Router>
      <div className="App">
        <header className="app-header">
          <h1>Pose Detection Game</h1>
          <button 
            className="diagnostics-toggle"
            onClick={toggleDiagnostics}
            aria-label="Toggle diagnostics"
          >
            🔧 Diagnostics
          </button>
        </header>

        <main className="app-container" role="main">
          <Routes>
            <Route path="/" element={
              <div className="game-layout">
                <div className="control-panel">
                  <CameraSelector
                    devices={availableDevices}
                    selectedDeviceId={cameraSettings.deviceId}
                    onDeviceSelect={setCameraDevice}
                  />
                  
                  <div className="game-controls">
                    <button 
                      className={`game-button ${gameState.isPlaying ? 'pause' : 'play'}`}
                      onClick={handleGameToggle}
                    >
                      {gameState.isPlaying ? '⏸️ Pause' : 
                       gameState.isGameOver ? '🔄 New Game' : '▶️ Start'}
                    </button>
                  </div>
                </div>

                <div className="game-area">
                  <div className="camera-overlay-container">
                    <PoseDetector
                      cameraSettings={cameraSettings}
                      config={detectionConfig}
                      onPoseDetected={handlePoseDetected}
                      videoRef={videoRef}
                    />
                    
                    <PoseGameOverlay
                      videoRef={videoRef}
                      pose={currentPose}
                      isPlaying={gameState.isPlaying}
                      onScoreUpdate={updateScore}
                      showDiagnostics={showDiagnostics}
                    />
                  </div>
                </div>

                <DiagnosticsOverlay
                  data={diagnostics}
                  isVisible={showDiagnostics}
                  onToggle={toggleDiagnostics}
                />
              </div>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;