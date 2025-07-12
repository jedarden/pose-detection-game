# Pose Detection Game - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

Based on our research synthesis, here's the fastest way to start building your pose detection game.

## Prerequisites

- Node.js 18+ installed
- Modern web browser (Chrome/Edge recommended)
- Webcam for testing

## Step 1: Create Project

```bash
# Create project with Vite
npm create vite@latest pose-detection-game -- --template react-ts
cd pose-detection-game
npm install
```

## Step 2: Install Core Dependencies

```bash
# Pose detection
npm install @mediapipe/pose @mediapipe/camera_utils

# Game engine
npm install phaser

# State management
npm install zustand

# UI components (optional but recommended)
npm install @radix-ui/react-dialog @radix-ui/react-slider
```

## Step 3: Basic Pose Detection Setup

Create `src/pose/PoseDetector.ts`:

```typescript
import { Pose, Results } from '@mediapipe/pose';

export class PoseDetector {
  private pose: Pose;
  private onResults: (results: Results) => void;

  constructor(onResults: (results: Results) => void) {
    this.onResults = onResults;
    
    this.pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });

    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.pose.onResults(this.onResults);
  }

  async detectPose(videoElement: HTMLVideoElement) {
    await this.pose.send({ image: videoElement });
  }
}
```

## Step 4: Camera Component

Create `src/components/Camera.tsx`:

```typescript
import { useRef, useEffect } from 'react';
import { Camera } from '@mediapipe/camera_utils';
import { PoseDetector } from '../pose/PoseDetector';

export function CameraView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const poseDetector = new PoseDetector((results) => {
      // Draw pose landmarks on canvas
      const ctx = canvasRef.current!.getContext('2d')!;
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      
      if (results.poseLandmarks) {
        // Draw landmarks
        results.poseLandmarks.forEach(landmark => {
          ctx.beginPath();
          ctx.arc(
            landmark.x * canvasRef.current!.width,
            landmark.y * canvasRef.current!.height,
            5,
            0,
            2 * Math.PI
          );
          ctx.fillStyle = '#00ff00';
          ctx.fill();
        });
      }
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await poseDetector.detectPose(videoRef.current!);
      },
      width: 640,
      height: 480
    });

    camera.start();

    return () => {
      camera.stop();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: 640, height: 480 }}>
      <video
        ref={videoRef}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />
    </div>
  );
}
```

## Step 5: Basic Game Integration

Create `src/game/scenes/MainScene.ts`:

```typescript
import Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
  private poseTarget!: Phaser.GameObjects.Image;
  private score = 0;
  private scoreText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    // Load your assets here
    this.load.image('pose1', '/assets/pose1.png');
  }

  create() {
    // Create game objects
    this.poseTarget = this.add.image(400, 300, 'pose1');
    
    this.scoreText = this.add.text(16, 16, 'Score: 0', {
      fontSize: '32px',
      color: '#ffffff'
    });
  }

  update() {
    // Game logic here
  }

  updatePose(poseData: any) {
    // Process pose data and update game
    // Check if player matches target pose
    // Update score
  }
}
```

## Step 6: Wire Everything Together

Update `src/App.tsx`:

```typescript
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { CameraView } from './components/Camera';
import { MainScene } from './game/scenes/MainScene';
import './App.css';

function App() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: 'game-container',
      scene: [MainScene],
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false
        }
      }
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
    };
  }, []);

  return (
    <div className="App">
      <h1>Pose Detection Game</h1>
      <div style={{ display: 'flex', gap: '20px' }}>
        <CameraView />
        <div id="game-container" />
      </div>
    </div>
  );
}

export default App;
```

## Step 7: Run Your Game!

```bash
npm run dev
```

Open http://localhost:5173 and allow camera permissions.

## Next Steps

1. **Add Gesture Recognition**
   - Implement pose matching algorithms
   - Create gesture library
   - Add visual feedback

2. **Enhance Game Mechanics**
   - Add more poses to match
   - Implement scoring system
   - Create difficulty levels

3. **Improve Performance**
   - Add frame skipping
   - Implement pose smoothing
   - Optimize rendering

4. **Polish UI/UX**
   - Add game menu
   - Create settings panel
   - Implement sound effects

## Troubleshooting

### Camera Not Working?
- Check browser permissions
- Ensure HTTPS (or localhost)
- Try different browser

### Low FPS?
- Reduce pose model complexity
- Implement frame skipping
- Lower camera resolution

### Pose Not Detected?
- Ensure good lighting
- Check camera angle
- Verify full body visible

## Resources

- [MediaPipe Pose Docs](https://google.github.io/mediapipe/solutions/pose.html)
- [Phaser 3 Docs](https://photonstorm.github.io/phaser3-docs/)
- [Our Full Research Report](./final-report.md)

## Join the Community

Building a pose detection game? We'd love to see it! Share your progress and get help:
- GitHub Discussions: [Your repo]/discussions
- Discord: [Your Discord]

Happy coding! 🎮🏃‍♂️