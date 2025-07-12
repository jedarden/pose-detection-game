# Pose Detection Implementation Guide

## Quick Start Examples

### 1. MediaPipe Pose - Production Setup

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js"></script>
</head>
<body>
  <video id="input-video"></video>
  <canvas id="output-canvas"></canvas>
  
  <script>
    const videoElement = document.getElementById('input-video');
    const canvasElement = document.getElementById('output-canvas');
    const canvasCtx = canvasElement.getContext('2d');
    
    const pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });
    
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    pose.onResults(onResults);
    
    function onResults(results) {
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
      
      if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
                       {color: '#00FF00', lineWidth: 4});
        drawLandmarks(canvasCtx, results.poseLandmarks,
                      {color: '#FF0000', lineWidth: 2});
      }
      canvasCtx.restore();
    }
    
    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await pose.send({image: videoElement});
      },
      width: 1280,
      height: 720
    });
    camera.start();
  </script>
</body>
</html>
```

### 2. MoveNet with TensorFlow.js - High Performance

```javascript
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

class MoveNetDetector {
  constructor() {
    this.detector = null;
    this.videoElement = null;
    this.isDetecting = false;
  }
  
  async initialize(videoElement) {
    this.videoElement = videoElement;
    
    // Wait for TensorFlow.js to initialize
    await tf.ready();
    
    // Create detector with MoveNet Lightning for speed
    this.detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true,
        minPoseScore: 0.3
      }
    );
  }
  
  async detectPose() {
    if (!this.detector || !this.videoElement || this.isDetecting) return null;
    
    this.isDetecting = true;
    
    try {
      const poses = await this.detector.estimatePoses(this.videoElement, {
        maxPoses: 1,
        flipHorizontal: false,
        scoreThreshold: 0.3
      });
      
      return poses[0] || null;
    } finally {
      this.isDetecting = false;
    }
  }
  
  // Optimized render loop
  startDetection(callback, targetFPS = 30) {
    const frameDelay = 1000 / targetFPS;
    let lastFrameTime = 0;
    
    const detect = async (currentTime) => {
      if (currentTime - lastFrameTime >= frameDelay) {
        const pose = await this.detectPose();
        if (pose) callback(pose);
        lastFrameTime = currentTime;
      }
      
      requestAnimationFrame(detect);
    };
    
    requestAnimationFrame(detect);
  }
}

// Usage
const detector = new MoveNetDetector();
const video = document.getElementById('video');

navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
    video.play();
    
    video.addEventListener('loadedmetadata', async () => {
      await detector.initialize(video);
      detector.startDetection(pose => {
        console.log('Detected pose:', pose);
        // Render pose keypoints
      });
    });
  });
```

### 3. ml5.js - Beginner Friendly

```javascript
// Simple ml5.js pose detection with p5.js
let video;
let poseNet;
let poses = [];

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO);
  video.size(640, 480);
  
  // Create poseNet with ml5
  poseNet = ml5.poseNet(video, {
    architecture: 'MoveNet',
    modelType: 'SINGLEPOSE_LIGHTNING',
    minPoseScore: 0.25
  }, modelLoaded);
  
  // Listen to new poses
  poseNet.on('pose', results => {
    poses = results;
  });
  
  video.hide();
}

function modelLoaded() {
  console.log('Model Loaded!');
}

function draw() {
  image(video, 0, 0);
  
  // Draw keypoints and skeleton
  for (let pose of poses) {
    // Draw keypoints
    for (let keypoint of pose.pose.keypoints) {
      if (keypoint.score > 0.2) {
        fill(255, 0, 0);
        noStroke();
        ellipse(keypoint.position.x, keypoint.position.y, 10, 10);
      }
    }
    
    // Draw skeleton
    let skeleton = pose.skeleton;
    for (let connection of skeleton) {
      let partA = connection[0];
      let partB = connection[1];
      stroke(255, 0, 0);
      line(partA.position.x, partA.position.y, 
           partB.position.x, partB.position.y);
    }
  }
}
```

## Advanced Implementation Patterns

### 1. Performance Optimization Pattern

```javascript
class OptimizedPoseDetector {
  constructor(options = {}) {
    this.options = {
      dynamicFPS: true,
      targetFPS: 30,
      minFPS: 15,
      maxFPS: 60,
      autoQuality: true,
      ...options
    };
    
    this.performanceMonitor = new PerformanceMonitor();
    this.currentQuality = 'medium';
  }
  
  async adaptiveDetection() {
    const stats = this.performanceMonitor.getStats();
    
    // Adjust quality based on performance
    if (this.options.autoQuality) {
      if (stats.fps < this.options.minFPS) {
        await this.decreaseQuality();
      } else if (stats.fps > this.options.targetFPS + 10) {
        await this.increaseQuality();
      }
    }
    
    // Dynamic frame rate adjustment
    if (this.options.dynamicFPS) {
      const delay = Math.max(16, 1000 / this.options.targetFPS);
      return delay;
    }
    
    return 33; // Default ~30 FPS
  }
  
  async decreaseQuality() {
    const qualityLevels = ['high', 'medium', 'low', 'minimal'];
    const currentIndex = qualityLevels.indexOf(this.currentQuality);
    
    if (currentIndex < qualityLevels.length - 1) {
      this.currentQuality = qualityLevels[currentIndex + 1];
      await this.updateDetectorSettings();
    }
  }
}
```

### 2. Multi-Framework Abstraction

```javascript
class UniversalPoseDetector {
  constructor(framework = 'movenet') {
    this.framework = framework;
    this.detector = null;
  }
  
  async initialize(videoElement) {
    switch (this.framework) {
      case 'movenet':
        await this.initializeMoveNet(videoElement);
        break;
      case 'mediapipe':
        await this.initializeMediaPipe(videoElement);
        break;
      case 'ml5':
        await this.initializeML5(videoElement);
        break;
    }
  }
  
  async detect() {
    // Unified detection interface
    const rawPose = await this.getRawPose();
    return this.normalizePose(rawPose);
  }
  
  normalizePose(rawPose) {
    // Convert to common format
    const normalized = {
      keypoints: [],
      score: 0,
      keypoints3D: null
    };
    
    // Framework-specific normalization
    switch (this.framework) {
      case 'movenet':
        normalized.keypoints = rawPose.keypoints.map(kp => ({
          name: kp.name,
          x: kp.x,
          y: kp.y,
          score: kp.score
        }));
        break;
      case 'mediapipe':
        // Convert MediaPipe format
        break;
    }
    
    return normalized;
  }
}
```

### 3. Game-Specific Integration

```javascript
class PoseGameController {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.poseDetector = new OptimizedPoseDetector();
    this.calibration = null;
    this.poseBuffer = [];
    this.bufferSize = 5;
  }
  
  async calibrate() {
    console.log('Stand in T-pose for calibration...');
    
    const calibrationPoses = [];
    for (let i = 0; i < 30; i++) {
      const pose = await this.poseDetector.detect();
      calibrationPoses.push(pose);
      await this.sleep(100);
    }
    
    this.calibration = this.calculateAveragesPose(calibrationPoses);
    console.log('Calibration complete!');
  }
  
  smoothPose(newPose) {
    this.poseBuffer.push(newPose);
    if (this.poseBuffer.length > this.bufferSize) {
      this.poseBuffer.shift();
    }
    
    // Apply smoothing
    const smoothed = this.calculateAveragesPose(this.poseBuffer);
    return smoothed;
  }
  
  detectGestures(pose) {
    const gestures = [];
    
    // Example: Detect raised hands
    const leftWrist = pose.keypoints.find(kp => kp.name === 'left_wrist');
    const leftShoulder = pose.keypoints.find(kp => kp.name === 'left_shoulder');
    
    if (leftWrist && leftShoulder && leftWrist.y < leftShoulder.y) {
      gestures.push({ type: 'LEFT_HAND_RAISED', confidence: leftWrist.score });
    }
    
    return gestures;
  }
  
  mapToGameControls(pose) {
    const gestures = this.detectGestures(pose);
    
    // Convert gestures to game commands
    gestures.forEach(gesture => {
      switch (gesture.type) {
        case 'LEFT_HAND_RAISED':
          this.gameEngine.jump();
          break;
        case 'SQUAT':
          this.gameEngine.duck();
          break;
      }
    });
  }
}
```

## Error Handling and Edge Cases

```javascript
class RobustPoseDetector {
  constructor() {
    this.lastValidPose = null;
    this.noDetectionFrames = 0;
    this.maxNoDetectionFrames = 10;
  }
  
  async detectWithFallback() {
    try {
      const pose = await this.detect();
      
      if (this.isValidPose(pose)) {
        this.lastValidPose = pose;
        this.noDetectionFrames = 0;
        return pose;
      } else {
        this.noDetectionFrames++;
        
        if (this.noDetectionFrames < this.maxNoDetectionFrames) {
          // Use last valid pose with confidence decay
          return this.decayConfidence(this.lastValidPose);
        } else {
          // Too many frames without detection
          return null;
        }
      }
    } catch (error) {
      console.error('Pose detection error:', error);
      
      // Attempt recovery
      if (error.message.includes('WebGL')) {
        await this.reinitializeWithCPU();
      }
      
      return this.lastValidPose;
    }
  }
  
  isValidPose(pose) {
    if (!pose || !pose.keypoints) return false;
    
    // Check minimum keypoint detection
    const detectedKeypoints = pose.keypoints.filter(kp => kp.score > 0.3);
    return detectedKeypoints.length >= 10;
  }
  
  decayConfidence(pose, decayFactor = 0.95) {
    if (!pose) return null;
    
    return {
      ...pose,
      keypoints: pose.keypoints.map(kp => ({
        ...kp,
        score: kp.score * decayFactor
      }))
    };
  }
}
```

## Testing and Debugging

```javascript
// Debug visualization overlay
class PoseDebugger {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.debugInfo = {
      fps: 0,
      detectionTime: 0,
      keypointCount: 0,
      confidence: 0
    };
  }
  
  drawDebugOverlay(pose) {
    const ctx = this.ctx;
    
    // Draw debug info
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 200, 100);
    
    ctx.fillStyle = 'white';
    ctx.font = '14px monospace';
    ctx.fillText(`FPS: ${this.debugInfo.fps}`, 20, 30);
    ctx.fillText(`Detection: ${this.debugInfo.detectionTime}ms`, 20, 50);
    ctx.fillText(`Keypoints: ${this.debugInfo.keypointCount}`, 20, 70);
    ctx.fillText(`Confidence: ${this.debugInfo.confidence.toFixed(2)}`, 20, 90);
    
    // Draw confidence bars for each keypoint
    if (pose && pose.keypoints) {
      pose.keypoints.forEach((kp, i) => {
        const barWidth = kp.score * 100;
        const barY = 120 + (i * 15);
        
        ctx.fillStyle = kp.score > 0.5 ? 'green' : 'orange';
        ctx.fillRect(20, barY, barWidth, 10);
        ctx.fillStyle = 'white';
        ctx.fillText(kp.name, 130, barY + 8);
      });
    }
  }
}
```

## Deployment Checklist

1. **Model Hosting**
   - [ ] Host models on CDN with proper caching headers
   - [ ] Implement service worker for offline support
   - [ ] Set up model versioning strategy

2. **Performance**
   - [ ] Test on target devices
   - [ ] Implement quality auto-adjustment
   - [ ] Add FPS monitoring

3. **Privacy**
   - [ ] Add privacy notice
   - [ ] Ensure no data leaves device
   - [ ] Implement data retention policies

4. **Error Handling**
   - [ ] Handle camera permission denied
   - [ ] Fallback for unsupported devices
   - [ ] Recovery from WebGL context loss

5. **User Experience**
   - [ ] Loading indicators
   - [ ] Calibration instructions
   - [ ] Performance warnings

*Implementation guide last updated: January 2025*