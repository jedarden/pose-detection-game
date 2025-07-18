import { useRef, useEffect, useCallback, useState } from 'react';
import type { Pose, Keypoint } from '../types';
import './PoseGameOverlay.css';

interface GameBlock {
  id: string;
  x: number;
  y: number;
  z: number;
  direction: 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';
  color: 'red' | 'blue';
  spawnTime: number;
  hitTime: number;
  hit: boolean;
}

interface SwipeDetection {
  direction: string | null;
  velocity: number;
  startTime: number;
  limb: 'left' | 'right';
}

interface PoseGameOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  pose: Pose | null;
  isPlaying: boolean;
  onScoreUpdate: (score: number) => void;
  showDiagnostics: boolean;
  detectionMode: 'full-body' | 'arms-only';
}

const PoseGameOverlay = ({ 
  videoRef, 
  pose, 
  isPlaying, 
  onScoreUpdate,
  showDiagnostics,
  detectionMode 
}: PoseGameOverlayProps) => {
  console.log('PoseGameOverlay render:', { isPlaying, pose: !!pose, detectionMode });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameBlocks, setGameBlocks] = useState<GameBlock[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [recentSwipes, setRecentSwipes] = useState<SwipeDetection[]>([]);
  const [lastPose, setLastPose] = useState<Pose | null>(null);

  // Pose connections for skeleton drawing
  const armConnections = [
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
    ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist']
  ];
  
  const fullBodyConnections = [
    ...armConnections,
    ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
    ['left_hip', 'right_hip'],
    ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
    ['right_hip', 'right_knee'], ['right_knee', 'right_ankle']
  ];
  
  const poseConnections = detectionMode === 'arms-only' ? armConnections : fullBodyConnections;
  
  // Keypoints to track based on mode
  const relevantKeypoints = detectionMode === 'arms-only' 
    ? ['left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist']
    : null; // null means all keypoints

  // Calculate limb velocity for swipe detection
  const calculateVelocity = useCallback((prev: Keypoint, current: Keypoint): number => {
    if (!prev || !current) return 0;
    const dx = current.x - prev.x;
    const dy = current.y - prev.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Detect swipe direction based on limb movement
  const detectSwipeDirection = useCallback((prev: Keypoint, current: Keypoint): string | null => {
    if (!prev || !current) return null;
    
    const dx = current.x - prev.x;
    const dy = current.y - prev.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 20) return null; // Minimum movement threshold
    
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Convert angle to direction (8 directions)
    if (angle >= -22.5 && angle < 22.5) return 'right';
    if (angle >= 22.5 && angle < 67.5) return 'down-right';
    if (angle >= 67.5 && angle < 112.5) return 'down';
    if (angle >= 112.5 && angle < 157.5) return 'down-left';
    if (angle >= 157.5 || angle < -157.5) return 'left';
    if (angle >= -157.5 && angle < -112.5) return 'up-left';
    if (angle >= -112.5 && angle < -67.5) return 'up';
    if (angle >= -67.5 && angle < -22.5) return 'up-right';
    
    return null;
  }, []);

  // Spawn new game blocks
  const spawnBlock = useCallback(() => {
    if (!isPlaying) {
      console.log('Block spawn skipped: game not playing');
      return;
    }
    
    const directions: GameBlock['direction'][] = ['up', 'down', 'left', 'right', 'up-left', 'up-right', 'down-left', 'down-right'];
    const colors: GameBlock['color'][] = ['red', 'blue'];
    
    // FIX #3: Dynamically get canvas dimensions for proper block spawning
    // Blocks now spawn within the actual canvas bounds instead of hardcoded 640x480
    const canvas = canvasRef.current;
    const canvasWidth = canvas?.width || 640;
    const canvasHeight = canvas?.height || 480;
    
    const newBlock: GameBlock = {
      id: `block-${Date.now()}-${Math.random()}`,
      x: Math.random() * (canvasWidth - 200) + 100, // Random X position with padding
      y: Math.random() * (canvasHeight - 200) + 100, // Random Y position with padding
      z: 1000, // Start far away
      direction: directions[Math.floor(Math.random() * directions.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      spawnTime: Date.now(),
      hitTime: Date.now() + 3000, // 3 seconds to reach player
      hit: false
    };
    
    console.log('Spawning new block:', newBlock);
    setGameBlocks(prev => {
      const updated = [...prev, newBlock];
      console.log('Total blocks after spawn:', updated.length);
      return updated;
    });
  }, [isPlaying]);

  // Check collision between limb and blocks
  const checkCollisions = useCallback((pose: Pose) => {
    if (!pose.keypoints) return;
    
    const currentTime = Date.now();
    const leftWrist = pose.keypoints.find(kp => kp.name === 'left_wrist');
    const rightWrist = pose.keypoints.find(kp => kp.name === 'right_wrist');
    
    setGameBlocks(prev => {
      return prev.map(block => {
        if (block.hit || block.z > 100) return block;
        
        const relevantWrist = block.color === 'red' ? leftWrist : rightWrist;
        if (!relevantWrist || (relevantWrist.score || 0) < 0.5) return block;
        
        // Calculate distance between wrist and block (scale block position)
        const blockX = (block.x / 640) * 640; // Normalize to video coordinates
        const blockY = (block.y / 480) * 480;
        const distance = Math.sqrt(
          Math.pow(relevantWrist.x - blockX, 2) + 
          Math.pow(relevantWrist.y - blockY, 2)
        );
        
        // Check if within hit range and timing window
        const timingDiff = Math.abs(currentTime - block.hitTime);
        if (distance < 50 && timingDiff < 200) {
          // Check if swipe direction matches block direction
          const lastSwipe = recentSwipes.find(s => 
            s.limb === (block.color === 'red' ? 'left' : 'right') &&
            currentTime - s.startTime < 300
          );
          
          if (lastSwipe && lastSwipe.direction === block.direction) {
            // Successful hit!
            const hitScore = calculateHitScore(timingDiff, distance);
            setScore(s => s + hitScore);
            setCombo(c => c + 1);
            onScoreUpdate(score + hitScore);
            return { ...block, hit: true };
          }
        }
        
        return block;
      });
    });
  }, [recentSwipes, onScoreUpdate, score]);

  // Calculate hit score based on timing and accuracy
  const calculateHitScore = useCallback((timingDiff: number, distance: number): number => {
    const timingScore = Math.max(0, 70 - (timingDiff / 200) * 70); // 0-70 points
    const accuracyScore = Math.max(0, 30 - (distance / 50) * 30); // 0-30 points
    const comboMultiplier = Math.min(4, 1 + combo * 0.1);
    
    return Math.round((timingScore + accuracyScore) * comboMultiplier);
  }, [combo]);

  // Detect swipes from pose changes
  useEffect(() => {
    if (!pose || !lastPose || !isPlaying) return;
    
    const currentLeftWrist = pose.keypoints.find(kp => kp.name === 'left_wrist');
    const currentRightWrist = pose.keypoints.find(kp => kp.name === 'right_wrist');
    const prevLeftWrist = lastPose.keypoints.find(kp => kp.name === 'left_wrist');
    const prevRightWrist = lastPose.keypoints.find(kp => kp.name === 'right_wrist');
    
    const currentTime = Date.now();
    
    // Detect left hand swipes
    if (currentLeftWrist && prevLeftWrist) {
      const velocity = calculateVelocity(prevLeftWrist, currentLeftWrist);
      const direction = detectSwipeDirection(prevLeftWrist, currentLeftWrist);
      
      if (velocity > 15 && direction) {
        setRecentSwipes(prev => [...prev.slice(-5), {
          direction,
          velocity,
          startTime: currentTime,
          limb: 'left'
        }]);
      }
    }
    
    // Detect right hand swipes
    if (currentRightWrist && prevRightWrist) {
      const velocity = calculateVelocity(prevRightWrist, currentRightWrist);
      const direction = detectSwipeDirection(prevRightWrist, currentRightWrist);
      
      if (velocity > 15 && direction) {
        setRecentSwipes(prev => [...prev.slice(-5), {
          direction,
          velocity,
          startTime: currentTime,
          limb: 'right'
        }]);
      }
    }
    
    // Check for collisions
    checkCollisions(pose);
    
    setLastPose(pose);
  }, [pose, lastPose, isPlaying, calculateVelocity, detectSwipeDirection, checkCollisions]);

  // Game loop for block spawning and movement
  useEffect(() => {
    console.log('Game loop effect triggered, isPlaying:', isPlaying);
    if (!isPlaying) return;
    
    console.log('Starting game loop with block spawning');
    const spawnInterval = setInterval(spawnBlock, 2000); // Spawn block every 2 seconds
    
    const updateInterval = setInterval(() => {
      const currentTime = Date.now();
      
      // Update block positions
      setGameBlocks(prev => {
        return prev
          .map(block => {
            const progress = (currentTime - block.spawnTime) / (block.hitTime - block.spawnTime);
            const newZ = 1000 - (progress * 1000);
            return { ...block, z: newZ };
          })
          .filter(block => !block.hit && block.z > -100); // Remove missed blocks
      });
      
      // Clean up old swipes
      setRecentSwipes(prev => prev.filter(swipe => currentTime - swipe.startTime < 1000));
    }, 16); // ~60 FPS
    
    return () => {
      clearInterval(spawnInterval);
      clearInterval(updateInterval);
    };
  }, [isPlaying, spawnBlock]);

  // Draw everything on canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) {
      console.log('Canvas draw skipped: missing canvas or video');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('Canvas draw skipped: no 2d context');
      return;
    }
    
    // FIX #1: Use getBoundingClientRect() for accurate video dimensions
    // This ensures canvas matches the actual rendered video size, not the stream size
    const rect = video.getBoundingClientRect();
    const width = rect.width || video.offsetWidth || 640;
    const height = rect.height || video.offsetHeight || 480;
    
    if (canvas.width !== width || canvas.height !== height) {
      console.log('Canvas resized to:', width, 'x', height);
      canvas.width = width;
      canvas.height = height;
    }
    
    // Debug canvas visibility
    console.log('🎨 Canvas render:', {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      videoWidth: video.offsetWidth,
      videoHeight: video.offsetHeight,
      blocksCount: gameBlocks.length,
      pose: !!pose
    });
    
    // Scale factor for pose coordinates
    const scaleX = canvas.width / (video.videoWidth || 640);
    const scaleY = canvas.height / (video.videoHeight || 480);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // FIX #2: Explicitly set global alpha to ensure all drawings are fully visible
    // This prevents any inherited transparency issues
    ctx.globalAlpha = 1.0;
    
    // DEBUG: Enhanced visibility test to verify canvas is rendering properly
    // Shows canvas status and current block count for debugging
    ctx.save();
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.fillRect(10, 10, 150, 60);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Canvas Active', 20, 35);
    ctx.font = '12px Arial';
    ctx.fillText(`Blocks: ${gameBlocks.length}`, 20, 55);
    ctx.restore();
    
    // Draw pose skeleton if available
    if (pose && pose.keypoints) {
      // Create keypoint lookup
      const keypointMap = new Map<string, Keypoint>();
      pose.keypoints.forEach(kp => {
        if (kp.name && (kp.score || 0) > 0.3) {
          keypointMap.set(kp.name, kp);
        }
      });
      
      // Draw connections (skeleton)
      ctx.strokeStyle = '#00ff41';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00ff41';
      ctx.shadowBlur = 10;
      
      poseConnections.forEach(([start, end]) => {
        const startPoint = keypointMap.get(start);
        const endPoint = keypointMap.get(end);
        
        if (startPoint && endPoint) {
          ctx.beginPath();
          ctx.moveTo(startPoint.x * scaleX, startPoint.y * scaleY);
          ctx.lineTo(endPoint.x * scaleX, endPoint.y * scaleY);
          ctx.stroke();
        }
      });
      
      // Draw keypoints
      pose.keypoints.forEach(kp => {
        if ((kp.score || 0) > 0.3) {
          // Filter keypoints based on detection mode
          if (relevantKeypoints && kp.name && !relevantKeypoints.includes(kp.name)) {
            return;
          }
          
          const radius = 6;
          
          // Special highlighting for wrists (game controllers)
          if (kp.name?.includes('wrist')) {
            ctx.fillStyle = kp.name.includes('left') ? '#ff0040' : '#0080ff';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.shadowColor = kp.name.includes('left') ? '#ff0040' : '#0080ff';
            ctx.shadowBlur = 15;
          } else {
            ctx.fillStyle = '#00ff41';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 5;
          }
          
          ctx.beginPath();
          ctx.arc(kp.x * scaleX, kp.y * scaleY, radius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        }
      });
      
      ctx.shadowBlur = 0; // Reset shadow
    }
    
    // Draw game blocks
    console.log('Drawing blocks:', gameBlocks.length);
    gameBlocks.forEach((block, index) => {
      if (block.hit) {
        console.log(`Block ${index} skipped: already hit`);
        return;
      }
      
      // Calculate block size based on distance (z-depth)
      const scale = Math.max(0.1, 1 - (block.z / 1000));
      const size = 40 * scale;
      
      // FIX #5: Enhanced block visibility with better opacity and shadow effects
      // Blocks are more visible when far away (increased base alpha)
      // Added shadow blur for better visual depth perception
      ctx.save();
      ctx.globalAlpha = Math.min(1, scale + 0.3); // More visible when far
      ctx.fillStyle = block.color === 'red' ? '#ff0040' : '#0080ff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.shadowColor = block.color === 'red' ? '#ff0040' : '#0080ff';
      ctx.shadowBlur = 20 * scale;
      
      // FIX #4: Use block coordinates directly without scaling
      // Previous scaling was causing blocks to appear in wrong positions
      const blockX = block.x;
      const blockY = block.y;
      
      console.log(`Drawing block ${index}:`, {
        originalPos: { x: block.x, y: block.y, z: block.z },
        canvasPos: { x: blockX, y: blockY },
        size: size,
        scale: scale,
        color: block.color,
        direction: block.direction
      });
      
      ctx.fillRect(blockX - size/2, blockY - size/2, size, size);
      ctx.strokeRect(blockX - size/2, blockY - size/2, size, size);
      
      // Draw direction arrow
      ctx.fillStyle = '#ffffff';
      ctx.font = `${size * 0.6}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const arrow = getDirectionArrow(block.direction);
      ctx.fillText(arrow, blockX, blockY);
      ctx.restore();
    });
    
    // Draw score and combo
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    
    ctx.strokeText(`Score: ${score}`, 20, 40);
    ctx.fillText(`Score: ${score}`, 20, 40);
    
    if (combo > 0) {
      ctx.font = 'bold 18px Arial';
      ctx.strokeText(`Combo: ${combo}x`, 20, 70);
      ctx.fillText(`Combo: ${combo}x`, 20, 70);
    }
    
    // Draw diagnostics if enabled
    if (showDiagnostics) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(canvas.width - 250, 10, 240, 150);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      
      let y = 30;
      ctx.fillText(`Blocks: ${gameBlocks.length}`, canvas.width - 240, y);
      y += 15;
      ctx.fillText(`Recent swipes: ${recentSwipes.length}`, canvas.width - 240, y);
      y += 15;
      
      recentSwipes.slice(-8).forEach((swipe) => {
        ctx.fillText(
          `${swipe.limb}: ${swipe.direction} (${swipe.velocity.toFixed(1)})`,
          canvas.width - 240, y
        );
        y += 12;
      });
    }
  }, [pose, gameBlocks, score, combo, recentSwipes, showDiagnostics, videoRef, poseConnections, relevantKeypoints]);

  // Helper function to get direction arrow
  const getDirectionArrow = (direction: string): string => {
    const arrows = {
      'up': '↑',
      'down': '↓',
      'left': '←',
      'right': '→',
      'up-left': '↖',
      'up-right': '↗',
      'down-left': '↙',
      'down-right': '↘'
    };
    return arrows[direction as keyof typeof arrows] || '•';
  };

  // Animation loop
  useEffect(() => {
    const animate = () => {
      drawCanvas();
      requestAnimationFrame(animate);
    };
    animate();
  }, [drawCanvas]);

  return (
    <div className="pose-game-overlay">
      <canvas
        ref={canvasRef}
        className="pose-overlay-canvas"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 100, // FIX #6: Increased z-index to ensure canvas renders above video
          backgroundColor: 'transparent',
          display: 'block' // FIX #7: Explicitly set display to prevent any CSS override
        }}
      />
      
      {isPlaying && (
        <div className="game-ui-overlay">
          <div className="game-instructions">
            <p>🔴 Red blocks = Left hand</p>
            <p>🔵 Blue blocks = Right hand</p>
            <p>Follow the arrows with your arms!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoseGameOverlay;