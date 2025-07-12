import { useRef, useEffect, useCallback } from 'react';
import type { GameCanvasProps, Pose, Keypoint } from '../types';
import './GameCanvas.css';

const GameCanvas = ({
  pose,
  gameState,
  width,
  height
}: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pose connections for skeleton drawing
  const connections = [
    ['nose', 'left_eye'], ['nose', 'right_eye'],
    ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
    ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
    ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
    ['left_hip', 'right_hip'],
    ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
    ['right_hip', 'right_knee'], ['right_knee', 'right_ankle']
  ];

  const drawPose = useCallback((ctx: CanvasRenderingContext2D, pose: Pose) => {
    if (!pose.keypoints || pose.keypoints.length === 0) return;

    // Create keypoint lookup
    const keypointMap = new Map<string, Keypoint>();
    pose.keypoints.forEach(kp => {
      if (kp.name && (kp.score || 0) > 0.3) {
        keypointMap.set(kp.name, kp);
      }
    });

    // Draw connections (skeleton)
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    connections.forEach(([start, end]) => {
      const startPoint = keypointMap.get(start);
      const endPoint = keypointMap.get(end);
      
      if (startPoint && endPoint) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
      }
    });

    // Draw keypoints
    pose.keypoints.forEach(kp => {
      if ((kp.score || 0) > 0.3) {
        const confidence = kp.score || 0;
        const radius = 4 + (confidence * 4);
        
        // Color based on confidence
        const alpha = confidence;
        ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Draw keypoint name for debugging
        if (kp.name) {
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.font = '10px Arial';
          ctx.fillText(kp.name, kp.x + 8, kp.y - 8);
        }
      }
    });
  }, [connections]);

  const drawGameUI = useCallback((ctx: CanvasRenderingContext2D) => {
    // Clear background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, width, height);

    // Draw grid for reference
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw game info
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`Score: ${gameState.score}`, 20, 40);
    ctx.fillText(`Level: ${gameState.level}`, 20, 70);
    ctx.fillText(`Time: ${gameState.timeRemaining}s`, 20, 100);

    if (gameState.targetPose) {
      ctx.fillText(`Target: ${gameState.targetPose}`, 20, 130);
    }

    // Game state messages
    if (gameState.isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over!', width / 2, height / 2 - 30);
      
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`Final Score: ${gameState.score}`, width / 2, height / 2 + 20);
      ctx.textAlign = 'left';
    } else if (!gameState.isPlaying && !gameState.isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Game Paused', width / 2, height / 2);
      ctx.textAlign = 'left';
    }

    // Draw pose score if available
    if (pose?.score) {
      ctx.fillStyle = 'white';
      ctx.font = '16px Arial';
      ctx.fillText(`Pose Confidence: ${(pose.score * 100).toFixed(1)}%`, 20, height - 20);
    }
  }, [width, height, gameState, pose]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw game UI
    drawGameUI(ctx);

    // Draw pose if available
    if (pose) {
      drawPose(ctx, pose);
    }
  }, [pose, drawGameUI, drawPose, width, height]);

  // Redraw canvas when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  return (
    <div className="game-canvas-container">
      <canvas
        ref={canvasRef}
        data-testid="game-canvas"
        className="game-canvas"
        width={width}
        height={height}
      />
      
      <div className="canvas-overlay">
        <div className="game-stats">
          <div className="stat-item">
            <span className="stat-label">Score:</span>
            <span className="stat-value">{gameState.score}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Time:</span>
            <span className="stat-value">{gameState.timeRemaining}s</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Level:</span>
            <span className="stat-value">{gameState.level}</span>
          </div>
          {gameState.targetPose && (
            <div className="stat-item target">
              <span className="stat-label">Target:</span>
              <span className="stat-value">{gameState.targetPose}</span>
            </div>
          )}
        </div>
        
        {pose && (
          <div className="pose-info">
            <span className="keypoint-count">
              {pose.keypoints.filter(kp => (kp.score || 0) > 0.3).length} keypoints detected
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameCanvas;