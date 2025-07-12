// Core game types
export interface Pose {
  keypoints: Keypoint[];
  score?: number;
}

export interface Keypoint {
  x: number;
  y: number;
  z?: number;
  score?: number;
  name?: string;
}

export interface GameState {
  isPlaying: boolean;
  score: number;
  level: number;
  currentPose?: Pose;
  targetPose?: string;
  timeRemaining: number;
  isGameOver: boolean;
}

export interface CameraSettings {
  deviceId: string;
  facingMode: 'user' | 'environment';
  width: number;
  height: number;
}

export interface DetectionConfig {
  modelType: 'MoveNet' | 'BlazePose';
  enableSmoothing: boolean;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
  detectionMode: 'full-body' | 'arms-only';
}

export interface DiagnosticsData {
  fps: number;
  detectionTime: number;
  memoryUsage: number;
  modelLoaded: boolean;
  cameraActive: boolean;
  errors: string[];
}

// Store types
export interface AppStore {
  // Game state
  gameState: GameState;
  startGame: () => void;
  pauseGame: () => void;
  endGame: () => void;
  updateScore: (points: number) => void;
  
  // Camera state
  cameraSettings: CameraSettings;
  availableDevices: MediaDeviceInfo[];
  setCameraDevice: (deviceId: string) => void;
  updateCameraSettings: (settings: Partial<CameraSettings>) => void;
  
  // Detection state
  detectionConfig: DetectionConfig;
  currentPose: Pose | null;
  updateDetectionConfig: (config: Partial<DetectionConfig>) => void;
  setPose: (pose: Pose | null) => void;
  
  // Diagnostics
  diagnostics: DiagnosticsData;
  showDiagnostics: boolean;
  toggleDiagnostics: () => void;
  updateDiagnostics: (data: Partial<DiagnosticsData>) => void;
}

// Component props types
export interface CameraSelectorProps {
  onDeviceSelect: (deviceId: string) => void;
  selectedDeviceId?: string;
  devices: MediaDeviceInfo[];
}

export interface PoseDetectorProps {
  onPoseDetected: (pose: Pose | null, diagnostics?: any) => void;
  config: DetectionConfig;
  cameraSettings: CameraSettings;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

export interface GameCanvasProps {
  pose: Pose | null;
  gameState: GameState;
  width: number;
  height: number;
}

export interface DiagnosticsOverlayProps {
  data: DiagnosticsData;
  isVisible: boolean;
  onToggle: () => void;
}