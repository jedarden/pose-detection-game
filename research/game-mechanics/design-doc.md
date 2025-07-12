# Pose-Based Timing Game: Design Document

## Game Overview
A rhythm-action game where players match body poses to targets at precise timing intervals, similar to Beat Saber but using full-body movements without music dependency.

## Core Mechanics

### 1. Timing Window System

#### Window Classifications
- **Perfect**: ±50ms from target time
- **Great**: ±100ms from target time
- **Good**: ±200ms from target time
- **OK**: ±350ms from target time
- **Miss**: >350ms or no pose detected

#### Dynamic Window Adjustment
```
Base Window = 200ms
Adjusted Window = Base Window × Difficulty Modifier × Player Skill Factor

Difficulty Modifiers:
- Easy: 1.5x
- Normal: 1.0x
- Hard: 0.7x
- Expert: 0.5x
- Master: 0.3x
```

### 2. Pose Target System

#### Target Types
1. **Static Poses**: Hold a specific pose for duration
2. **Dynamic Poses**: Transition between poses
3. **Sequential Poses**: Chain multiple poses in order
4. **Mirrored Poses**: Match opposite-side movements
5. **Free-form Zones**: Any movement within body regions

#### Pose Complexity Levels
- **Level 1**: Single limb movements (arm raise, leg lift)
- **Level 2**: Two-limb coordination (both arms, opposite arm/leg)
- **Level 3**: Full-body poses (jumping jacks, squats)
- **Level 4**: Balance poses (one-leg stands, lean positions)
- **Level 5**: Complex transitions (spin-to-pose, jump-to-land)

### 3. Scoring Algorithm

#### Base Score Calculation
```javascript
function calculateScore(timing, poseAccuracy, combo, difficulty) {
    // Timing score component (0-500 points)
    const timingScore = getTimingScore(timing);
    
    // Pose accuracy component (0-300 points)
    const accuracyScore = poseAccuracy * 300;
    
    // Combo multiplier (1.0x - 4.0x)
    const comboMultiplier = Math.min(1 + (combo * 0.1), 4.0);
    
    // Difficulty multiplier
    const difficultyMultiplier = getDifficultyMultiplier(difficulty);
    
    // Final score
    return Math.floor(
        (timingScore + accuracyScore) * 
        comboMultiplier * 
        difficultyMultiplier
    );
}

function getTimingScore(timingDiff) {
    if (timingDiff <= 50) return 500;      // Perfect
    if (timingDiff <= 100) return 400;     // Great
    if (timingDiff <= 200) return 300;     // Good
    if (timingDiff <= 350) return 100;     // OK
    return 0;                               // Miss
}

function getDifficultyMultiplier(difficulty) {
    const multipliers = {
        'easy': 0.5,
        'normal': 1.0,
        'hard': 1.5,
        'expert': 2.0,
        'master': 3.0
    };
    return multipliers[difficulty] || 1.0;
}
```

### 4. Combo System

#### Combo Rules
- **Build**: Consecutive "Good" or better hits
- **Break**: Any "Miss" or "OK" rating
- **Freeze**: During free-form zones (maintains but doesn't build)

#### Combo Rewards
- **10 Combo**: Speed burst power-up
- **25 Combo**: Score multiplier boost
- **50 Combo**: Slow-motion zone
- **100 Combo**: Perfect streak shield (one miss protection)

#### Combo Multiplier Progression
```
Combo Range    | Multiplier | Visual Effect
0-9           | 1.0x       | None
10-24         | 1.5x       | Glow outline
25-49         | 2.0x       | Particle trail
50-99         | 3.0x       | Energy aura
100+          | 4.0x       | Full body effects
```

### 5. Hit Detection System

#### Pose Matching Algorithm
```javascript
function matchPose(targetPose, playerPose, threshold = 0.85) {
    const jointWeights = {
        // Core joints (most important)
        'spine': 1.5,
        'hips': 1.5,
        
        // Arms
        'leftShoulder': 1.0,
        'rightShoulder': 1.0,
        'leftElbow': 0.8,
        'rightElbow': 0.8,
        'leftWrist': 0.6,
        'rightWrist': 0.6,
        
        // Legs
        'leftHip': 1.0,
        'rightHip': 1.0,
        'leftKnee': 0.8,
        'rightKnee': 0.8,
        'leftAnkle': 0.6,
        'rightAnkle': 0.6
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const joint in jointWeights) {
        const distance = calculateJointDistance(
            targetPose[joint], 
            playerPose[joint]
        );
        const jointScore = 1 - (distance / MAX_DISTANCE);
        totalScore += jointScore * jointWeights[joint];
        totalWeight += jointWeights[joint];
    }
    
    return totalScore / totalWeight;
}
```

#### Confidence Thresholds
- **High Confidence**: >0.9 similarity
- **Medium Confidence**: 0.7-0.9 similarity  
- **Low Confidence**: 0.5-0.7 similarity
- **No Match**: <0.5 similarity

### 6. Visual Feedback Systems

#### Target Visualization
1. **Approach Indicators**
   - 3D silhouettes approaching from distance
   - Color coding: Blue (far) → Yellow (near) → Green (hit zone)
   - Pulsing at beat intervals

2. **Hit Zone Markers**
   - Floor projections showing standing positions
   - Body outline overlays
   - Limb trajectory guides

3. **Success Feedback**
   - Particle explosions on successful hits
   - Screen flash effects
   - Combo streak visualizations

#### Player Feedback
1. **Real-time Skeleton**
   - Colored by accuracy (green=good, red=off)
   - Joint confidence indicators
   - Movement trails

2. **Performance Meters**
   - Timing accuracy bar
   - Combo counter with effects
   - Score popups with rating

3. **Warning Systems**
   - Pose mismatch indicators
   - Timing warning flashes
   - Lost tracking alerts

### 7. Difficulty Progression

#### Dynamic Difficulty Adjustment (DDA)
```javascript
class DifficultyManager {
    constructor() {
        this.performanceHistory = [];
        this.currentDifficulty = 1.0;
    }
    
    updateDifficulty(performance) {
        this.performanceHistory.push(performance);
        if (this.performanceHistory.length > 10) {
            this.performanceHistory.shift();
        }
        
        const avgPerformance = this.calculateAverage();
        
        // Increase difficulty if performing well
        if (avgPerformance > 0.85) {
            this.currentDifficulty = Math.min(
                this.currentDifficulty + 0.1, 
                2.0
            );
        }
        // Decrease if struggling
        else if (avgPerformance < 0.60) {
            this.currentDifficulty = Math.max(
                this.currentDifficulty - 0.1, 
                0.5
            );
        }
    }
    
    getDifficultySettings() {
        return {
            targetSpeed: 1.0 / this.currentDifficulty,
            windowSize: 200 * (2 - this.currentDifficulty),
            poseComplexity: Math.floor(this.currentDifficulty * 3),
            targetFrequency: this.currentDifficulty * 2
        };
    }
}
```

#### Level Design Principles
1. **Tutorial (Levels 1-5)**
   - Single poses, wide timing windows
   - Visual guides for every movement
   - No fail condition

2. **Beginner (Levels 6-20)**
   - Two-pose combinations
   - Introduction of timing pressure
   - Basic combo system

3. **Intermediate (Levels 21-50)**
   - Full-body movements
   - Tighter timing windows
   - Special pose types introduced

4. **Advanced (Levels 51-100)**
   - Complex pose chains
   - Minimal visual guides
   - Speed variations

5. **Expert (Levels 100+)**
   - Freestyle sections
   - Extreme timing precision
   - Multiple simultaneous targets

### 8. Power-ups and Modifiers

#### Power-up Types
1. **Time Dilation**: Slows approaching targets by 50%
2. **Auto-Perfect**: Next 5 poses automatically score perfect
3. **Combo Shield**: Protects combo from one miss
4. **Score Burst**: 2x score for 10 seconds
5. **Ghost Mode**: Shows perfect pose overlay

#### Game Modifiers (Unlockable)
- **Mirror Mode**: All poses are horizontally flipped
- **Speed Demon**: 1.5x target speed
- **Precision Master**: Narrower timing windows, higher scores
- **Zen Mode**: No fail, focus on form
- **Chaos Mode**: Random pose requirements

### 9. Progression Systems

#### Experience and Levels
```javascript
const XP_FORMULA = {
    baseXP: (score, difficulty) => score * difficulty * 0.1,
    comboBonus: (maxCombo) => maxCombo * 5,
    perfectBonus: (perfectCount) => perfectCount * 10,
    completionBonus: 100
};

const LEVEL_REQUIREMENTS = Array.from({length: 100}, (_, i) => 
    Math.floor(100 * Math.pow(1.5, i))
);
```

#### Unlockables
1. **Pose Packs**: New pose sets every 10 levels
2. **Visual Themes**: Environments and effects
3. **Difficulty Modes**: Unlock harder challenges
4. **Customization**: Player avatars and trails
5. **Leaderboards**: Global and friend rankings

### 10. Performance Optimization

#### Pose Detection Optimization
- Keyframe only critical joints for performance
- Reduce detection rate in non-critical moments
- Predictive pose matching using motion vectors
- Confidence-based frame skipping

#### Visual Optimization
- LOD system for particle effects
- Dynamic quality adjustment based on FPS
- Culling of off-screen visual elements
- Batch rendering for similar effects

## Technical Specifications

### Minimum Viable Product (MVP)
1. 5 basic poses with detection
2. Simple timing window system
3. Basic scoring without combos
4. 10 levels of progression
5. Visual feedback for hits/misses

### Full Release Features
1. 50+ unique poses
2. Advanced combo system
3. Dynamic difficulty
4. 100+ levels
5. Multiplayer modes
6. Custom level editor
7. Social features

### Performance Targets
- 60 FPS gameplay
- <100ms pose detection latency
- <16ms input to feedback
- Support for 1080p and 4K displays