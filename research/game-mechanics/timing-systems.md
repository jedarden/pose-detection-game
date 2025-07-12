# Timing Systems Deep Dive

## Beat-Less Rhythm Mechanics

Unlike traditional rhythm games that sync to music, our timing system creates its own rhythm through visual and mechanical design.

### Visual Rhythm Generators

#### 1. Pendulum System
```javascript
class PendulumTimer {
    constructor(bpm = 120) {
        this.period = 60000 / bpm; // ms per beat
        this.phase = 0;
    }
    
    update(deltaTime) {
        this.phase += deltaTime / this.period;
        return {
            position: Math.sin(this.phase * Math.PI * 2),
            velocity: Math.cos(this.phase * Math.PI * 2),
            nextBeat: (1 - (this.phase % 1)) * this.period
        };
    }
}
```

#### 2. Cascading Targets
- Targets appear at consistent intervals
- Visual acceleration creates anticipation
- Multiple lanes for complexity

```javascript
class TargetLane {
    constructor(config) {
        this.spawnInterval = config.interval || 1000;
        this.travelTime = config.travelTime || 3000;
        this.targets = [];
        this.nextSpawn = 0;
    }
    
    spawnTarget(currentTime) {
        const target = {
            id: generateId(),
            spawnTime: currentTime,
            hitTime: currentTime + this.travelTime,
            pose: this.selectPose(),
            lane: this.laneIndex
        };
        this.targets.push(target);
        this.nextSpawn = currentTime + this.spawnInterval;
    }
}
```

### Adaptive Timing Windows

#### Player Skill Adaptation
```javascript
class AdaptiveTimingWindow {
    constructor() {
        this.baseWindow = 200; // ms
        this.playerStats = {
            averageOffset: 0,
            consistency: 1.0,
            recentHits: []
        };
    }
    
    recordHit(offset, timestamp) {
        this.playerStats.recentHits.push({ offset, timestamp });
        
        // Keep only last 20 hits
        if (this.playerStats.recentHits.length > 20) {
            this.playerStats.recentHits.shift();
        }
        
        this.updateStats();
    }
    
    updateStats() {
        const offsets = this.playerStats.recentHits.map(h => h.offset);
        
        // Calculate average offset (player tends to be early/late)
        this.playerStats.averageOffset = average(offsets);
        
        // Calculate consistency (standard deviation)
        this.playerStats.consistency = standardDeviation(offsets);
    }
    
    getAdjustedWindow(difficulty) {
        // Wider window for inconsistent players
        const consistencyFactor = Math.max(0.5, 
            Math.min(2.0, this.playerStats.consistency / 50)
        );
        
        return this.baseWindow * difficulty * consistencyFactor;
    }
    
    getAdjustedCenter() {
        // Shift window center based on player tendency
        return -this.playerStats.averageOffset * 0.5;
    }
}
```

### Frame-Perfect Detection

#### Interpolation System
```javascript
class FrameInterpolator {
    constructor(targetFPS = 60) {
        this.targetFrameTime = 1000 / targetFPS;
        this.poseHistory = [];
        this.maxHistory = 10;
    }
    
    addPoseFrame(pose, timestamp) {
        this.poseHistory.push({ pose, timestamp });
        if (this.poseHistory.length > this.maxHistory) {
            this.poseHistory.shift();
        }
    }
    
    getPoseAtTime(targetTime) {
        // Find surrounding frames
        let before = null, after = null;
        
        for (let i = 0; i < this.poseHistory.length - 1; i++) {
            if (this.poseHistory[i].timestamp <= targetTime &&
                this.poseHistory[i + 1].timestamp > targetTime) {
                before = this.poseHistory[i];
                after = this.poseHistory[i + 1];
                break;
            }
        }
        
        if (!before || !after) return null;
        
        // Interpolate between frames
        const factor = (targetTime - before.timestamp) / 
                      (after.timestamp - before.timestamp);
        
        return this.interpolatePoses(before.pose, after.pose, factor);
    }
    
    interpolatePoses(pose1, pose2, factor) {
        const interpolated = {};
        for (const joint in pose1) {
            interpolated[joint] = {
                x: lerp(pose1[joint].x, pose2[joint].x, factor),
                y: lerp(pose1[joint].y, pose2[joint].y, factor),
                z: lerp(pose1[joint].z, pose2[joint].z, factor),
                confidence: Math.min(pose1[joint].confidence, 
                                   pose2[joint].confidence)
            };
        }
        return interpolated;
    }
}
```

### Latency Compensation

#### Predictive Hit Detection
```javascript
class LatencyCompensator {
    constructor() {
        this.estimatedLatency = 50; // ms
        this.latencyHistory = [];
    }
    
    measureLatency(inputTime, detectionTime) {
        const latency = detectionTime - inputTime;
        this.latencyHistory.push(latency);
        
        if (this.latencyHistory.length > 30) {
            this.latencyHistory.shift();
        }
        
        // Use median for stability
        this.estimatedLatency = median(this.latencyHistory);
    }
    
    predictHitTime(currentPose, targetPose, currentTime) {
        // Estimate when the pose will be completed
        const poseVelocity = this.calculatePoseVelocity();
        const poseDistance = this.calculatePoseDistance(
            currentPose, targetPose
        );
        
        const timeToComplete = poseDistance / poseVelocity;
        const predictedHitTime = currentTime + timeToComplete;
        
        // Compensate for system latency
        return predictedHitTime - this.estimatedLatency;
    }
}
```

### Multi-Target Timing

#### Simultaneous Hit Windows
```javascript
class MultiTargetTimingSystem {
    constructor() {
        this.activeTargets = new Map();
        this.hitPriority = 'closest'; // 'closest', 'earliest', 'highest-score'
    }
    
    checkHits(playerPose, currentTime) {
        const hits = [];
        
        for (const [id, target] of this.activeTargets) {
            const timing = Math.abs(currentTime - target.hitTime);
            const accuracy = matchPose(target.pose, playerPose);
            
            if (timing <= target.window && accuracy >= target.threshold) {
                hits.push({
                    id,
                    timing,
                    accuracy,
                    score: this.calculateScore(timing, accuracy)
                });
            }
        }
        
        // Resolve conflicts
        if (hits.length > 1) {
            return this.resolvePriority(hits);
        }
        
        return hits[0] || null;
    }
    
    resolvePriority(hits) {
        switch (this.hitPriority) {
            case 'closest':
                return hits.reduce((best, hit) => 
                    hit.timing < best.timing ? hit : best
                );
            case 'earliest':
                return hits[0]; // Already sorted by time
            case 'highest-score':
                return hits.reduce((best, hit) => 
                    hit.score > best.score ? hit : best
                );
        }
    }
}
```

### Rhythm Patterns

#### Pattern Templates
```javascript
const RHYTHM_PATTERNS = {
    steady: {
        name: "Steady Beat",
        intervals: [1000, 1000, 1000, 1000],
        loop: true
    },
    
    accelerating: {
        name: "Speed Up",
        intervals: [1200, 1000, 800, 600, 400],
        loop: false
    },
    
    syncopated: {
        name: "Off-Beat",
        intervals: [750, 250, 750, 250, 1000],
        loop: true
    },
    
    burst: {
        name: "Rapid Fire",
        intervals: [200, 200, 200, 200, 1600],
        loop: true
    },
    
    random: {
        name: "Chaos",
        generator: () => 500 + Math.random() * 1500,
        loop: false
    }
};

class RhythmSequencer {
    constructor(pattern) {
        this.pattern = RHYTHM_PATTERNS[pattern];
        this.index = 0;
        this.nextBeat = 0;
    }
    
    getNextInterval() {
        if (this.pattern.generator) {
            return this.pattern.generator();
        }
        
        const interval = this.pattern.intervals[this.index];
        this.index++;
        
        if (this.index >= this.pattern.intervals.length) {
            if (this.pattern.loop) {
                this.index = 0;
            } else {
                return null; // Pattern complete
            }
        }
        
        return interval;
    }
}
```

### Visual Timing Aids

#### Approach Indicators
```javascript
class ApproachCircle {
    constructor(targetTime, duration = 3000) {
        this.targetTime = targetTime;
        this.startTime = targetTime - duration;
        this.duration = duration;
    }
    
    getVisualState(currentTime) {
        const progress = (currentTime - this.startTime) / this.duration;
        
        if (progress < 0 || progress > 1.2) {
            return { visible: false };
        }
        
        // Exponential scaling for better feel
        const scale = Math.pow(1 - Math.min(progress, 1), 2) * 3 + 0.5;
        const opacity = Math.min(progress * 2, 1);
        const color = this.getProgressColor(progress);
        
        return {
            visible: true,
            scale,
            opacity,
            color,
            rotation: progress * 360,
            glow: progress > 0.8
        };
    }
    
    getProgressColor(progress) {
        if (progress < 0.5) return '#3498db';      // Blue - far
        if (progress < 0.8) return '#f39c12';      // Orange - approaching
        if (progress < 0.95) return '#2ecc71';     // Green - hit zone
        if (progress < 1.05) return '#27ae60';     // Dark green - perfect
        return '#e74c3c';                          // Red - late
    }
}
```

### Performance Metrics

#### Timing Analysis
```javascript
class TimingAnalyzer {
    constructor() {
        this.sessionData = {
            hits: [],
            misses: [],
            distribution: new Map()
        };
    }
    
    recordHit(offset, rating) {
        const hit = {
            offset,
            rating,
            timestamp: Date.now()
        };
        
        this.sessionData.hits.push(hit);
        this.updateDistribution(offset);
    }
    
    getStatistics() {
        const offsets = this.sessionData.hits.map(h => h.offset);
        
        return {
            totalHits: this.sessionData.hits.length,
            averageOffset: average(offsets),
            standardDeviation: standardDeviation(offsets),
            earlyTendency: offsets.filter(o => o < 0).length / offsets.length,
            distribution: this.getDistributionData(),
            consistency: this.calculateConsistency(),
            improvement: this.calculateImprovement()
        };
    }
    
    calculateConsistency() {
        // Lower standard deviation = higher consistency
        const std = standardDeviation(
            this.sessionData.hits.map(h => h.offset)
        );
        return Math.max(0, 100 - std);
    }
    
    calculateImprovement() {
        if (this.sessionData.hits.length < 20) return 0;
        
        const firstHalf = this.sessionData.hits.slice(0, 
            Math.floor(this.sessionData.hits.length / 2)
        );
        const secondHalf = this.sessionData.hits.slice(
            Math.floor(this.sessionData.hits.length / 2)
        );
        
        const firstAvg = average(firstHalf.map(h => Math.abs(h.offset)));
        const secondAvg = average(secondHalf.map(h => Math.abs(h.offset)));
        
        return ((firstAvg - secondAvg) / firstAvg) * 100;
    }
}
```