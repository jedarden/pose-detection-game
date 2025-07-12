import { useRef, useEffect, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import type { PoseDetectorProps, Pose } from '../types';
import './PoseDetector.css';

const PoseDetector = ({
  onPoseDetected,
  config,
  cameraSettings,
  videoRef: externalVideoRef
}: PoseDetectorProps) => {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef || internalVideoRef;
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const animationRef = useRef<number | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [fps, setFps] = useState(0);
  
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() });

  // Initialize TensorFlow.js and pose detection model
  const initializeModel = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Initialize TensorFlow.js
      await tf.ready();
      console.log('TensorFlow.js initialized');

      // Create pose detector
      const model = poseDetection.SupportedModels.MoveNet;
      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: config.enableSmoothing,
        minScore: config.minDetectionConfidence,
      };

      const detector = await poseDetection.createDetector(model, detectorConfig);
      detectorRef.current = detector;
      setModelLoaded(true);
      
      console.log('MoveNet model loaded successfully');
    } catch (err) {
      console.error('Failed to initialize pose detection:', err);
      setError('Failed to load pose detection model');
    } finally {
      setIsLoading(false);
    }
  }, [config.enableSmoothing, config.minDetectionConfidence]);

  // Initialize camera stream
  const initializeCamera = useCallback(async () => {
    try {
      setError(null);

      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Get new stream
      const constraints = {
        video: {
          deviceId: cameraSettings.deviceId ? { exact: cameraSettings.deviceId } : undefined,
          facingMode: cameraSettings.facingMode,
          width: { ideal: cameraSettings.width },
          height: { ideal: cameraSettings.height },
          frameRate: { ideal: 30, max: 60 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      console.log('Camera stream initialized');
    } catch (err) {
      console.error('Failed to initialize camera:', err);
      setError('Camera access denied');
    }
  }, [cameraSettings]);

  // Pose detection loop
  const detectPoses = useCallback(async () => {
    if (!videoRef.current || !detectorRef.current || videoRef.current.readyState !== 4) {
      animationRef.current = requestAnimationFrame(detectPoses);
      return;
    }

    try {
      const startTime = performance.now();
      
      // Estimate poses
      const poses = await detectorRef.current.estimatePoses(videoRef.current);
      
      const detectionTime = performance.now() - startTime;

      // Report detection time for diagnostics
      if (detectionTime > 100) {
        console.warn(`Slow pose detection: ${detectionTime.toFixed(1)}ms`);
      }

      // Convert to our pose format and filter by confidence
      const detectedPose: Pose | null = poses.length > 0 ? {
        keypoints: poses[0].keypoints.map(kp => ({
          x: kp.x,
          y: kp.y,
          z: kp.z,
          score: kp.score,
          name: kp.name
        })).filter(kp => {
          // Filter by confidence
          if ((kp.score || 0) < config.minTrackingConfidence) return false;
          
          // For arms-only mode, only keep arm keypoints
          if (config.detectionMode === 'arms-only') {
            const armKeypoints = ['left_shoulder', 'right_shoulder', 'left_elbow', 
                                  'right_elbow', 'left_wrist', 'right_wrist'];
            return kp.name && armKeypoints.includes(kp.name);
          }
          
          return true;
        }),
        score: poses[0].score
      } : null;

      // Update FPS counter
      const counter = fpsCounterRef.current;
      counter.frames++;
      const now = Date.now();
      let currentFps = fps;
      if (now - counter.lastTime >= 1000) {
        currentFps = Math.round((counter.frames * 1000) / (now - counter.lastTime));
        setFps(currentFps);
        counter.frames = 0;
        counter.lastTime = now;
      }

      // Calculate memory usage
      const memoryUsage = (performance as any).memory ? 
        Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : 0;

      // Call with pose and diagnostics data
      onPoseDetected(detectedPose, {
        fps: currentFps,
        detectionTime: Math.round(detectionTime),
        memoryUsage: memoryUsage
      });

    } catch (err) {
      console.error('Pose detection error:', err);
      setError('Pose detection failed');
    }

    animationRef.current = requestAnimationFrame(detectPoses);
  }, [config.minTrackingConfidence, onPoseDetected]);

  // Initialize everything on mount and when config changes
  useEffect(() => {
    initializeModel();
  }, [initializeModel]);

  useEffect(() => {
    if (modelLoaded) {
      initializeCamera();
    }
  }, [modelLoaded, initializeCamera]);

  // Start detection loop when both model and camera are ready
  useEffect(() => {
    if (modelLoaded && videoRef.current && streamRef.current) {
      animationRef.current = requestAnimationFrame(detectPoses);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [modelLoaded, detectPoses]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  if (error) {
    return (
      <div className="pose-detector error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={() => { setError(null); initializeModel(); }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pose-detector">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <span>Initializing pose detection...</span>
          </div>
        </div>
      )}
      
      <video
        ref={videoRef}
        data-testid="pose-detector-video"
        className="video-feed"
        autoPlay
        playsInline
        muted
        style={{
          width: cameraSettings.width,
          height: cameraSettings.height,
          transform: cameraSettings.facingMode === 'user' ? 'scaleX(-1)' : 'none'
        }}
      />
      
      <div className="detector-info">
        <div className="status-indicators">
          <span className={`status-indicator ${modelLoaded ? 'active' : ''}`}>
            🤖 Model: {modelLoaded ? 'Ready' : 'Loading...'}
          </span>
          <span className={`status-indicator ${streamRef.current ? 'active' : ''}`}>
            📹 Camera: {streamRef.current ? 'Active' : 'Connecting...'}
          </span>
          <span className="fps-indicator">
            ⚡ {fps} FPS
          </span>
        </div>
      </div>
    </div>
  );
};

export default PoseDetector;