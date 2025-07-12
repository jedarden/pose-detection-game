# Beat Saber Analysis for Pose Detection Adaptation

## Beat Saber Core Mechanics

### Directional Block System
- **8 Directions**: up, down, left, right, and 4 diagonals
- **Color Coding**: Red (left hand), Blue (right hand)
- **Dot Blocks**: Can be hit from any direction
- **Timing**: Blocks approach on musical beats

### Scoring System (Adaptable to Pose Detection)
1. **Pre-swing angle** (70 points): 90-degree approach angle
2. **Follow-through** (30 points): 60-degree continuation
3. **Accuracy** (10 points): Cut through center of block
4. **Total**: 110 points maximum per block

### Key Differences from Traditional Rhythm Games
- **Technique over timing**: Swing form matters more than perfect beat timing
- **Physical movement**: Requires full arm/body motion, not just finger taps
- **Spatial awareness**: 3D movement and positioning crucial

## Adaptation Strategy for Pose Detection

### Limb Movement Detection
1. **Hand/Wrist Tracking**: Map to VR controller positions
2. **Directional Swipes**: Detect limb velocity and direction
3. **Swing Angles**: Calculate pre-movement and follow-through angles
4. **Center Accuracy**: Determine if limb passes through target center

### Pose-Based Mechanics
- **Left Arm**: Handle red blocks (Beat Saber left controller)
- **Right Arm**: Handle blue blocks (Beat Saber right controller)
- **Full Body**: Add legs for dodging obstacles
- **Head Movement**: Avoid incoming walls/obstacles

### Timing Windows
- **Perfect**: ±50ms (110 points)
- **Great**: ±100ms (80-90 points)
- **Good**: ±150ms (60-70 points)
- **Miss**: >150ms (0 points)

### Visual Feedback System
1. **Approach Indicators**: Show blocks coming toward camera
2. **Direction Arrows**: Clear directional indicators on blocks
3. **Hit Effects**: Particle explosions for successful hits
4. **Score Popups**: Real-time score feedback
5. **Combo Multipliers**: Visual combo chain indicators

### Implementation Plan

#### Phase 1: Camera Overlay
- Overlay pose skeleton directly on camera feed
- Remove side-by-side preview
- Add confidence indicators for pose keypoints

#### Phase 2: Block Spawning System
- Create directional blocks that approach from depth
- Implement 8-directional arrow system
- Add color coding for left/right hand

#### Phase 3: Collision Detection
- Detect when limbs intersect with blocks
- Calculate swing angles and accuracy
- Implement timing windows

#### Phase 4: Scoring & Feedback
- Real-time score calculation
- Visual hit effects and particles
- Combo system with multipliers

#### Phase 5: Game Progression
- Multiple difficulty levels
- Song/beat-less rhythm system
- Achievement system

### Technical Requirements

#### Pose Detection Enhancements
```javascript
// Track limb velocity for swipe detection
const limbVelocity = {
  leftHand: calculateVelocity(prevPose.leftWrist, currentPose.leftWrist),
  rightHand: calculateVelocity(prevPose.rightWrist, currentPose.rightWrist)
};

// Detect directional swipes
const swipeDirection = getSwipeDirection(limbVelocity, minimumVelocity);
```

#### Game Object System
```javascript
// Block object with direction and timing
class GameBlock {
  constructor(direction, color, spawnTime, hitTime) {
    this.direction = direction; // 'up', 'down', 'left', 'right', etc.
    this.color = color; // 'red', 'blue'
    this.spawnTime = spawnTime;
    this.hitTime = hitTime;
    this.position = { x, y, z };
  }
}
```

#### Collision Detection
```javascript
// Check if limb intersects with block
function checkCollision(limbPosition, block) {
  const distance = calculateDistance(limbPosition, block.position);
  const timing = Math.abs(currentTime - block.hitTime);
  
  if (distance < hitboxRadius && timing < maxTimingWindow) {
    return calculateScore(timing, swipeAccuracy, swipeDirection);
  }
  return null;
}
```

### Performance Considerations
- **30+ FPS** pose detection for responsive gameplay
- **Low latency** (<50ms) from pose to visual feedback
- **Smooth interpolation** for natural block movement
- **Efficient particle systems** for visual effects

### Accessibility Features
- **Adjustable difficulty**: Slower blocks, larger hitboxes
- **Visual indicators**: High contrast mode, larger arrows
- **Alternative controls**: Upper body only mode
- **Practice mode**: Slow motion for learning

This analysis provides the foundation for creating an engaging pose-based adaptation of Beat Saber's core mechanics while maintaining the essence of directional, rhythm-based gameplay.