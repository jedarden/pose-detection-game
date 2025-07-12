# Implementation Guide: Pose-Based Timing Game

## Quick Reference Architecture

### Core Systems Overview
```
┌─────────────────────────────────────────────────────────┐
│                    Game Manager                          │
├─────────────┬───────────────┬─────────────┬────────────┤
│   Timing    │  Pose Match   │   Scoring   │  Visual    │
│   System    │    System     │   System    │ Feedback   │
├─────────────┼───────────────┼─────────────┼────────────┤
│ • Windows   │ • Detection   │ • Base      │ • Particles│
│ • Rhythm    │ • Matching    │ • Combos    │ • UI       │
│ • Latency   │ • Confidence  │ • Bonuses   │ • Effects  │
└─────────────┴───────────────┴─────────────┴────────────┘
```

## Implementation Priority

### Phase 1: MVP (Week 1-2)
1. **Basic Pose Detection**
   - Integrate pose detection library
   - Define 5 basic poses
   - Simple joint matching

2. **Timing System**
   - Fixed timing windows
   - Visual approach indicators
   - Basic hit/miss detection

3. **Simple Scoring**
   - Points for hits
   - Basic combo counter
   - Session score display

4. **Minimal UI**
   - Start/stop controls
   - Score display
   - Pose indicator

### Phase 2: Core Features (Week 3-4)
1. **Enhanced Detection**
   - Confidence thresholds
   - Pose interpolation
   - Better accuracy matching

2. **Visual Feedback**
   - Particle effects
   - Hit animations
   - Combo visualizations

3. **Scoring Depth**
   - Timing grades
   - Accuracy scoring
   - Combo multipliers

4. **Level Progression**
   - 10 tutorial levels
   - Difficulty ramping
   - Unlock system

### Phase 3: Polish (Week 5-6)
1. **Advanced Features**
   - Dynamic difficulty
   - Style scoring
   - Power-ups

2. **Performance**
   - Optimization
   - Latency compensation
   - Frame interpolation

3. **User Experience**
   - Settings menu
   - Accessibility options
   - Progress tracking

## Key Implementation Files

### 1. Core Game Loop
```javascript
// src/game/GameManager.js
export class GameManager {
    constructor() {
        this.systems = {
            timing: new TimingSystem(),
            poseDetection: new PoseDetectionSystem(),
            scoring: new ScoringSystem(),
            visual: new VisualFeedbackSystem()
        };
        
        this.gameState = {
            isPlaying: false,
            currentLevel: null,
            score: 0,
            combo: 0
        };
    }
    
    update(deltaTime) {
        if (!this.gameState.isPlaying) return;
        
        // Update all systems
        this.systems.timing.update(deltaTime);
        const playerPose = this.systems.poseDetection.getCurrentPose();
        
        // Check for hits
        const hits = this.systems.timing.checkHits(playerPose);
        
        // Process hits
        hits.forEach(hit => {
            const score = this.systems.scoring.processHit(hit);
            this.systems.visual.triggerHitEffect(hit);
            this.updateGameState(score);
        });
        
        // Render
        this.systems.visual.render();
    }
}
```

### 2. Timing System Core
```javascript
// src/game/systems/TimingSystem.js
export class TimingSystem {
    constructor() {
        this.targets = [];
        this.approachTime = 3000; // 3 seconds
        this.baseInterval = 1000; // 1 second between targets
    }
    
    spawnTarget(pose, spawnTime) {
        this.targets.push({
            id: generateId(),
            pose,
            spawnTime,
            hitTime: spawnTime + this.approachTime,
            window: 200, // ±200ms
            hit: false
        });
    }
    
    checkHits(playerPose, currentTime) {
        const hits = [];
        
        this.targets.forEach(target => {
            if (target.hit) return;
            
            const timeDiff = Math.abs(currentTime - target.hitTime);
            if (timeDiff <= target.window) {
                const accuracy = this.matchPose(target.pose, playerPose);
                if (accuracy >= 0.7) {
                    hits.push({
                        target,
                        timing: timeDiff,
                        accuracy,
                        rating: this.getHitRating(timeDiff)
                    });
                    target.hit = true;
                }
            }
        });
        
        return hits;
    }
}
```

### 3. Pose Matching
```javascript
// src/game/systems/PoseDetection.js
export class PoseDetectionSystem {
    constructor() {
        this.detector = null;
        this.currentPose = null;
        this.poseHistory = [];
    }
    
    async initialize() {
        // Initialize pose detection library
        this.detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
        );
    }
    
    async detectPose(videoElement) {
        const poses = await this.detector.estimatePoses(videoElement);
        if (poses.length > 0) {
            this.currentPose = this.normalizePose(poses[0]);
            this.poseHistory.push({
                pose: this.currentPose,
                timestamp: performance.now()
            });
        }
    }
    
    normalizePose(rawPose) {
        // Normalize coordinates to [-1, 1] range
        const normalized = {};
        rawPose.keypoints.forEach(keypoint => {
            normalized[keypoint.name] = {
                x: (keypoint.x / 640) * 2 - 1,
                y: (keypoint.y / 480) * 2 - 1,
                confidence: keypoint.score
            };
        });
        return normalized;
    }
}
```

### 4. Visual Effects Manager
```javascript
// src/game/systems/VisualFeedback.js
export class VisualFeedbackSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.effects = [];
        this.particles = new ParticleSystem();
    }
    
    triggerHitEffect(hit) {
        const effect = new HitEffect({
            position: this.getHitPosition(hit),
            rating: hit.rating,
            color: this.getRatingColor(hit.rating)
        });
        
        this.effects.push(effect);
        
        // Spawn particles
        this.particles.burst({
            position: effect.position,
            count: this.getParticleCount(hit.rating),
            color: effect.color
        });
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render effects
        this.effects = this.effects.filter(effect => {
            effect.update();
            effect.render(this.ctx);
            return !effect.isComplete();
        });
        
        // Render particles
        this.particles.render(this.ctx);
    }
}
```

## Performance Optimization Tips

### 1. Pose Detection Optimization
- Run detection at 15-30 FPS, not 60
- Use lightweight models for real-time
- Cache detection results between frames
- Skip detection during non-critical moments

### 2. Rendering Optimization
- Use object pooling for effects
- Batch similar draw calls
- Implement LOD for particles
- Use CSS transforms for UI elements

### 3. Memory Management
- Limit history buffers
- Clean up completed targets
- Pool particle objects
- Remove old effects

## Testing Checklist

### Core Functionality
- [ ] Pose detection works with different body types
- [ ] Timing windows feel responsive
- [ ] Scoring calculations are accurate
- [ ] Visual feedback is clear

### Performance
- [ ] Maintains 60 FPS during gameplay
- [ ] No memory leaks over extended play
- [ ] Smooth on mid-range devices
- [ ] Handles detection failures gracefully

### User Experience
- [ ] Tutorial is clear and helpful
- [ ] Difficulty progression feels natural
- [ ] Feedback is satisfying
- [ ] Controls are responsive

## Common Pitfalls to Avoid

1. **Over-precise Detection**: Players can't match poses perfectly
2. **Unclear Timing**: Visual indicators don't clearly show when to act
3. **Frustrating Difficulty**: Too hard too fast
4. **Boring Progression**: Not enough variety or rewards
5. **Technical Issues**: Lag, detection failures, or crashes

## Next Steps

1. Set up development environment
2. Integrate pose detection library
3. Create basic game loop
4. Implement MVP features
5. Test with real users
6. Iterate based on feedback

Remember: Start simple, test often, and prioritize fun over complexity!