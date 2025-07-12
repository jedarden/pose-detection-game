import { create } from 'zustand';
import type { AppStore, GameState, CameraSettings, DetectionConfig, DiagnosticsData, Pose } from '../types';

const initialGameState: GameState = {
  isPlaying: false,
  score: 0,
  level: 1,
  currentPose: undefined,
  targetPose: undefined,
  timeRemaining: 60,
  isGameOver: false,
};

const initialCameraSettings: CameraSettings = {
  deviceId: '',
  facingMode: 'user',
  width: 640,
  height: 480,
};

const initialDetectionConfig: DetectionConfig = {
  modelType: 'MoveNet',
  enableSmoothing: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
};

const initialDiagnostics: DiagnosticsData = {
  fps: 0,
  detectionTime: 0,
  memoryUsage: 0,
  modelLoaded: false,
  cameraActive: false,
  errors: [],
};

export const useAppStore = create<AppStore>((set, get) => ({
  // Game state
  gameState: initialGameState,
  
  startGame: () => set((state) => ({
    gameState: {
      ...state.gameState,
      isPlaying: true,
      isGameOver: false,
      score: 0,
      timeRemaining: 60,
    }
  })),
  
  pauseGame: () => set((state) => ({
    gameState: {
      ...state.gameState,
      isPlaying: false,
    }
  })),
  
  endGame: () => set((state) => ({
    gameState: {
      ...state.gameState,
      isPlaying: false,
      isGameOver: true,
    }
  })),
  
  updateScore: (points: number) => set((state) => ({
    gameState: {
      ...state.gameState,
      score: state.gameState.score + points,
    }
  })),
  
  // Camera state
  cameraSettings: initialCameraSettings,
  availableDevices: [],
  
  setCameraDevice: (deviceId: string) => set((state) => ({
    cameraSettings: {
      ...state.cameraSettings,
      deviceId,
    }
  })),
  
  updateCameraSettings: (settings: Partial<CameraSettings>) => set((state) => ({
    cameraSettings: {
      ...state.cameraSettings,
      ...settings,
    }
  })),
  
  // Detection state
  detectionConfig: initialDetectionConfig,
  currentPose: null,
  
  updateDetectionConfig: (config: Partial<DetectionConfig>) => set((state) => ({
    detectionConfig: {
      ...state.detectionConfig,
      ...config,
    }
  })),
  
  setPose: (pose: Pose | null) => set(() => ({
    currentPose: pose,
  })),
  
  // Diagnostics
  diagnostics: initialDiagnostics,
  showDiagnostics: false,
  
  toggleDiagnostics: () => set((state) => ({
    showDiagnostics: !state.showDiagnostics,
  })),
  
  updateDiagnostics: (data: Partial<DiagnosticsData>) => set((state) => ({
    diagnostics: {
      ...state.diagnostics,
      ...data,
    }
  })),
}));