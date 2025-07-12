# Scoring Algorithms and Systems

## Core Scoring Philosophy
The scoring system rewards precision, consistency, and style while remaining accessible to players of all skill levels.

## Base Score Components

### 1. Timing Score
```javascript
class TimingScorer {
    constructor() {
        this.timingCurves = {
            linear: (offset) => Math.max(0, 1 - Math.abs(offset) / 350),
            exponential: (offset) => Math.exp(-Math.pow(offset / 100, 2)),
            stepped: (offset) => {
                const abs = Math.abs(offset);
                if (abs <= 50) return 1.0;    // Perfect
                if (abs <= 100) return 0.8;   // Great
                if (abs <= 200) return 0.6;   // Good
                if (abs <= 350) return 0.3;   // OK
                return 0;                      // Miss
            },
            forgiving: (offset) => {
                // More forgiving for early hits
                if (offset < 0) {
                    return Math.max(0, 1 - Math.abs(offset) / 400);
                }
                // Less forgiving for late hits
                return Math.max(0, 1 - Math.abs(offset) / 300);
            }
        };
        
        this.activeCurve = 'stepped';
    }
    
    calculateTimingScore(hitOffset, targetDifficulty) {
        const normalized = this.timingCurves[this.activeCurve](hitOffset);
        const baseScore = 500; // Max timing points
        
        // Apply difficulty multiplier
        const difficultyBonus = this.getDifficultyBonus(targetDifficulty);
        
        return Math.floor(baseScore * normalized * difficultyBonus);
    }
    
    getDifficultyBonus(difficulty) {
        // Harder targets worth more
        const bonuses = {
            easy: 0.8,
            normal: 1.0,
            hard: 1.3,
            expert: 1.6,
            master: 2.0
        };
        return bonuses[difficulty] || 1.0;
    }
}
```

### 2. Pose Accuracy Score
```javascript
class PoseAccuracyScorer {
    constructor() {
        this.jointWeights = this.initializeJointWeights();
        this.confidenceThreshold = 0.3;
    }
    
    initializeJointWeights() {
        return {
            // Core body (highest weight)
            nose: 2.0,
            spine: 2.0,
            hips: 2.0,
            
            // Arms (medium-high weight)
            leftShoulder: 1.5,
            rightShoulder: 1.5,
            leftElbow: 1.2,
            rightElbow: 1.2,
            leftWrist: 1.0,
            rightWrist: 1.0,
            
            // Legs (medium weight)
            leftHip: 1.3,
            rightHip: 1.3,
            leftKnee: 1.1,
            rightKnee: 1.1,
            leftAnkle: 0.9,
            rightAnkle: 0.9,
            
            // Extremities (lower weight)
            leftEar: 0.5,
            rightEar: 0.5,
            leftEye: 0.5,
            rightEye: 0.5
        };
    }
    
    calculatePoseScore(targetPose, playerPose, poseComplexity) {
        let weightedScore = 0;
        let totalWeight = 0;
        let confidenceMultiplier = 1.0;
        
        for (const joint in targetPose) {
            if (!playerPose[joint]) continue;
            
            const confidence = playerPose[joint].confidence || 1.0;
            if (confidence < this.confidenceThreshold) {
                confidenceMultiplier *= 0.9; // Penalty for low confidence
                continue;
            }
            
            const distance = this.calculateJointDistance(
                targetPose[joint],
                playerPose[joint]
            );
            
            const weight = this.jointWeights[joint] || 1.0;
            const jointScore = this.distanceToScore(distance, poseComplexity);
            
            weightedScore += jointScore * weight * confidence;
            totalWeight += weight;
        }
        
        const normalizedScore = (weightedScore / totalWeight) * confidenceMultiplier;
        const baseScore = 300; // Max pose accuracy points
        
        return Math.floor(baseScore * normalizedScore);
    }
    
    calculateJointDistance(targetJoint, playerJoint) {
        // Normalize positions to account for player size differences
        const dx = targetJoint.x - playerJoint.x;
        const dy = targetJoint.y - playerJoint.y;
        const dz = (targetJoint.z || 0) - (playerJoint.z || 0);
        
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    distanceToScore(distance, complexity) {
        // More complex poses allow for slightly more error
        const tolerance = 0.1 + (complexity * 0.02);
        
        if (distance < tolerance) return 1.0;
        if (distance < tolerance * 2) return 0.8;
        if (distance < tolerance * 3) return 0.5;
        if (distance < tolerance * 4) return 0.2;
        return 0;
    }
}
```

### 3. Combo Multiplier System
```javascript
class ComboSystem {
    constructor() {
        this.currentCombo = 0;
        this.maxCombo = 0;
        this.comboHistory = [];
        this.multiplierCurve = 'logarithmic';
        
        this.multiplierFormulas = {
            linear: (combo) => 1 + (combo * 0.02),
            logarithmic: (combo) => 1 + Math.log10(combo + 1) * 0.5,
            stepped: (combo) => {
                if (combo < 10) return 1.0;
                if (combo < 25) return 1.5;
                if (combo < 50) return 2.0;
                if (combo < 100) return 3.0;
                return 4.0;
            },
            exponential: (combo) => Math.pow(1.02, combo),
            capped: (combo) => Math.min(1 + (combo * 0.05), 5.0)
        };
        
        this.comboBreakRules = {
            strict: ['miss', 'ok'],
            normal: ['miss'],
            lenient: [] // Never breaks
        };
        
        this.activeBreakRule = 'normal';
    }
    
    processHit(rating, timestamp) {
        const shouldBreak = this.comboBreakRules[this.activeBreakRule]
            .includes(rating.toLowerCase());
        
        if (shouldBreak) {
            this.breakCombo(timestamp);
        } else {
            this.incrementCombo(rating, timestamp);
        }
        
        return this.getCurrentMultiplier();
    }
    
    incrementCombo(rating, timestamp) {
        this.currentCombo++;
        this.maxCombo = Math.max(this.maxCombo, this.currentCombo);
        
        this.comboHistory.push({
            combo: this.currentCombo,
            rating,
            timestamp,
            multiplier: this.getCurrentMultiplier()
        });
        
        // Trigger combo milestones
        this.checkMilestones();
    }
    
    breakCombo(timestamp) {
        if (this.currentCombo > 0) {
            this.comboHistory.push({
                combo: this.currentCombo,
                event: 'break',
                timestamp
            });
        }
        
        this.currentCombo = 0;
    }
    
    getCurrentMultiplier() {
        return this.multiplierFormulas[this.multiplierCurve](this.currentCombo);
    }
    
    checkMilestones() {
        const milestones = [10, 25, 50, 100, 250, 500, 1000];
        
        if (milestones.includes(this.currentCombo)) {
            return {
                milestone: this.currentCombo,
                reward: this.getMilestoneReward(this.currentCombo)
            };
        }
        
        return null;
    }
    
    getMilestoneReward(combo) {
        const rewards = {
            10: { type: 'powerup', value: 'score_boost' },
            25: { type: 'visual', value: 'aura_unlock' },
            50: { type: 'powerup', value: 'slow_motion' },
            100: { type: 'ability', value: 'combo_shield' },
            250: { type: 'multiplier', value: 1.5 },
            500: { type: 'title', value: 'combo_master' },
            1000: { type: 'legendary', value: 'infinite_power' }
        };
        
        return rewards[combo];
    }
}
```

### 4. Difficulty Scaling
```javascript
class DifficultyScaler {
    constructor() {
        this.baseDifficulty = 1.0;
        this.playerSkillRating = 1000; // ELO-style rating
        this.performanceWindow = [];
        this.windowSize = 20;
    }
    
    calculateScoreMultiplier(targetDifficulty, playerPerformance) {
        // Base multiplier from target difficulty
        const difficultyMultipliers = {
            tutorial: 0.5,
            easy: 0.8,
            normal: 1.0,
            hard: 1.5,
            expert: 2.0,
            master: 3.0,
            impossible: 5.0
        };
        
        let multiplier = difficultyMultipliers[targetDifficulty] || 1.0;
        
        // Adjust based on player skill vs target difficulty
        const skillGap = this.calculateSkillGap(targetDifficulty);
        if (skillGap > 0) {
            // Player below target skill - bonus for attempting hard content
            multiplier *= 1 + (skillGap * 0.1);
        }
        
        // Performance consistency bonus
        const consistency = this.calculateConsistency();
        multiplier *= 1 + (consistency * 0.2);
        
        return multiplier;
    }
    
    updatePlayerRating(score, targetDifficulty) {
        // Simple ELO-style update
        const expectedScore = this.getExpectedScore(targetDifficulty);
        const actualScore = score;
        const kFactor = 32; // Rating volatility
        
        const ratingChange = kFactor * (actualScore - expectedScore) / 1000;
        this.playerSkillRating += ratingChange;
        
        // Clamp rating
        this.playerSkillRating = Math.max(0, Math.min(3000, this.playerSkillRating));
    }
    
    calculateSkillGap(targetDifficulty) {
        const targetRatings = {
            tutorial: 0,
            easy: 500,
            normal: 1000,
            hard: 1500,
            expert: 2000,
            master: 2500,
            impossible: 3000
        };
        
        const targetRating = targetRatings[targetDifficulty] || 1000;
        return (targetRating - this.playerSkillRating) / 1000;
    }
}
```

### 5. Style Points System
```javascript
class StyleScorer {
    constructor() {
        this.styleFactors = {
            smoothness: 0.3,
            energy: 0.2,
            creativity: 0.2,
            precision: 0.3
        };
        
        this.movementHistory = [];
        this.historySize = 30;
    }
    
    calculateStyleScore(poseSequence, timing) {
        this.updateHistory(poseSequence);
        
        const scores = {
            smoothness: this.calculateSmoothness(),
            energy: this.calculateEnergy(),
            creativity: this.calculateCreativity(),
            precision: this.calculatePrecision(timing)
        };
        
        let totalScore = 0;
        for (const factor in scores) {
            totalScore += scores[factor] * this.styleFactors[factor];
        }
        
        const baseStylePoints = 200;
        return Math.floor(baseStylePoints * totalScore);
    }
    
    calculateSmoothness() {
        if (this.movementHistory.length < 3) return 0.5;
        
        let smoothnessScore = 0;
        
        for (let i = 2; i < this.movementHistory.length; i++) {
            const acceleration = this.calculateAcceleration(
                this.movementHistory[i - 2],
                this.movementHistory[i - 1],
                this.movementHistory[i]
            );
            
            // Lower acceleration = smoother movement
            smoothnessScore += 1 / (1 + acceleration);
        }
        
        return smoothnessScore / (this.movementHistory.length - 2);
    }
    
    calculateEnergy() {
        let totalMovement = 0;
        
        for (let i = 1; i < this.movementHistory.length; i++) {
            const movement = this.calculateMovementMagnitude(
                this.movementHistory[i - 1],
                this.movementHistory[i]
            );
            totalMovement += movement;
        }
        
        // Normalize to 0-1 range
        const avgMovement = totalMovement / this.movementHistory.length;
        return Math.min(avgMovement / 2, 1); // Cap at reasonable threshold
    }
    
    calculateCreativity() {
        // Measure variation in movement patterns
        const patterns = this.extractMovementPatterns();
        const uniquePatterns = new Set(patterns);
        
        // More unique patterns = higher creativity
        return uniquePatterns.size / patterns.length;
    }
    
    calculatePrecision(timingAccuracy) {
        // Combine pose holding stability with timing accuracy
        const holdStability = this.calculateHoldStability();
        return (holdStability + timingAccuracy) / 2;
    }
}
```

### 6. Bonus Systems
```javascript
class BonusCalculator {
    constructor() {
        this.bonusTypes = {
            // Timing bonuses
            allPerfect: { condition: 'all_perfect', multiplier: 2.0 },
            neverLate: { condition: 'never_late', multiplier: 1.3 },
            neverEarly: { condition: 'never_early', multiplier: 1.3 },
            
            // Combo bonuses
            fullCombo: { condition: 'no_breaks', multiplier: 1.5 },
            megaCombo: { condition: 'combo_100+', multiplier: 1.8 },
            
            // Accuracy bonuses
            flawless: { condition: 'all_poses_90%+', multiplier: 1.6 },
            consistent: { condition: 'low_variance', multiplier: 1.4 },
            
            // Special bonuses
            speedDemon: { condition: 'fast_completion', multiplier: 1.5 },
            endurance: { condition: 'long_session', multiplier: 1.4 },
            comeback: { condition: 'recovery_from_low', multiplier: 1.7 }
        };
    }
    
    calculateBonuses(sessionData) {
        const earnedBonuses = [];
        let totalMultiplier = 1.0;
        
        for (const [name, bonus] of Object.entries(this.bonusTypes)) {
            if (this.checkCondition(bonus.condition, sessionData)) {
                earnedBonuses.push({
                    name,
                    multiplier: bonus.multiplier,
                    points: this.calculateBonusPoints(bonus, sessionData)
                });
                
                totalMultiplier *= bonus.multiplier;
            }
        }
        
        return {
            bonuses: earnedBonuses,
            totalMultiplier: Math.min(totalMultiplier, 5.0) // Cap total bonus
        };
    }
    
    checkCondition(condition, sessionData) {
        switch (condition) {
            case 'all_perfect':
                return sessionData.ratings.every(r => r === 'perfect');
                
            case 'never_late':
                return sessionData.timingOffsets.every(o => o <= 0);
                
            case 'no_breaks':
                return sessionData.maxCombo === sessionData.totalHits;
                
            case 'combo_100+':
                return sessionData.maxCombo >= 100;
                
            case 'all_poses_90%+':
                return sessionData.poseAccuracies.every(a => a >= 0.9);
                
            case 'low_variance':
                const variance = calculateVariance(sessionData.timingOffsets);
                return variance < 50; // ms
                
            case 'fast_completion':
                return sessionData.completionTime < sessionData.targetTime * 0.9;
                
            default:
                return false;
        }
    }
}
```

### 7. Leaderboard Scoring
```javascript
class LeaderboardScore {
    constructor() {
        this.scoreCategories = {
            overall: 1.0,
            timing: 0.3,
            accuracy: 0.3,
            style: 0.2,
            combo: 0.2
        };
    }
    
    calculateLeaderboardScore(sessionScore) {
        // Normalized score for fair comparison
        const normalized = {
            timing: sessionScore.timing / 500,
            accuracy: sessionScore.accuracy / 300,
            style: sessionScore.style / 200,
            combo: Math.min(sessionScore.maxCombo / 100, 1)
        };
        
        // Weighted combination
        let totalScore = 0;
        for (const category in normalized) {
            totalScore += normalized[category] * this.scoreCategories[category];
        }
        
        // Apply session modifiers
        totalScore *= sessionScore.difficultyMultiplier;
        totalScore *= sessionScore.bonusMultiplier;
        
        // Convert to points
        return Math.floor(totalScore * 10000);
    }
    
    generateScoreSignature(score, playerData) {
        // Anti-cheat signature
        const data = {
            score,
            timestamp: Date.now(),
            sessionId: generateSessionId(),
            playerStats: playerData,
            checksum: this.calculateChecksum(score, playerData)
        };
        
        return encrypt(JSON.stringify(data));
    }
}
```