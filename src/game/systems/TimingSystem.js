/**
 * Timing System - Manages target spawning, approach timing, and hit detection
 * Based on Beat Saber-like mechanics but without music dependency
 */

import { EventEmitter } from 'events';

export class TimingSystem extends EventEmitter {
    constructor(gameManager) {
        super();
        this.gameManager = gameManager;
        
        // Configuration
        this.config = {
            baseInterval: 1000,      // ms between targets
            approachTime: 3000,      // ms for targets to reach hit zone
            baseWindow: 200,         // ±200ms hit window
            maxTargets: 20           // Maximum active targets
        };
        
        // State
        this.isActive = false;
        this.isPaused = false;
        this.targets = new Map();
        this.targetIdCounter = 0;
        this.lastSpawnTime = 0;
        this.nextTargetTime = 0;
        this.currentInterval = this.config.baseInterval;
        
        // Performance tracking
        this.hitStats = {
            perfect: 0,
            great: 0,
            good: 0,
            ok: 0,
            miss: 0,
            total: 0
        };
        
        // Pose state
        this.currentPose = null;
        this.poseHistory = [];
        this.maxPoseHistory = 10;
        
        // Level data
        this.levelConfig = null;
        this.currentPoseSequence = [];
        this.sequenceIndex = 0;
        
        // Adaptive timing
        this.adaptiveWindow = new AdaptiveTimingWindow();
        
        console.log('⏱️ Timing System initialized');
    }
    
    loadLevel(levelConfig) {
        this.levelConfig = levelConfig;
        this.config.baseInterval = levelConfig.targetInterval;
        this.config.approachTime = levelConfig.approachTime || 3000;
        this.config.baseWindow = levelConfig.windowSize || 200;
        
        // Generate pose sequence for level
        this.generatePoseSequence(levelConfig);
        
        console.log(`📋 Timing system loaded level config:`, levelConfig);
    }
    
    generatePoseSequence(config) {
        const poses = config.poses || ['arms_up', 'squat', 'side_stretch'];
        const sequenceLength = config.sequenceLength || 50;
        
        this.currentPoseSequence = [];
        
        for (let i = 0; i < sequenceLength; i++) {
            // Select pose based on difficulty progression
            let poseIndex;
            if (i < 10) {
                // Start with first pose only
                poseIndex = 0;
            } else if (i < 25) {
                // Introduce second pose
                poseIndex = Math.floor(Math.random() * Math.min(2, poses.length));
            } else {
                // Use all available poses
                poseIndex = Math.floor(Math.random() * poses.length);
            }
            
            this.currentPoseSequence.push({
                pose: poses[poseIndex],
                difficulty: this.calculateTargetDifficulty(i),
                sequenceNumber: i + 1
            });
        }
        
        this.sequenceIndex = 0;
        console.log(`🎯 Generated pose sequence with ${this.currentPoseSequence.length} targets`);
    }
    
    calculateTargetDifficulty(index) {
        // Progressive difficulty within level
        if (index < 10) return 'easy';
        if (index < 25) return 'normal';
        if (index < 40) return 'hard';
        return 'expert';
    }
    
    start() {
        this.isActive = true;
        this.isPaused = false;
        this.lastSpawnTime = this.gameManager.scene.time.now;
        this.nextTargetTime = this.lastSpawnTime + this.config.baseInterval;
        
        // Clear existing targets
        this.targets.clear();
        this.targetIdCounter = 0;
        
        console.log('▶️ Timing system started');
    }
    
    pause() {
        this.isPaused = true;
        console.log('⏸️ Timing system paused');
    }
    
    resume() {
        this.isPaused = false;
        // Adjust next spawn time to account for pause
        const currentTime = this.gameManager.scene.time.now;
        this.nextTargetTime = currentTime + this.config.baseInterval;
        console.log('▶️ Timing system resumed');
    }
    
    stop() {
        this.isActive = false;
        this.targets.clear();
        console.log('⏹️ Timing system stopped');
    }
    
    update(time, delta) {
        if (!this.isActive || this.isPaused) return;
        
        // Spawn new targets
        this.updateTargetSpawning(time);
        
        // Update existing targets
        this.updateTargets(time);
        
        // Check for hits with current pose
        if (this.currentPose) {
            this.checkHits(time);
        }
        
        // Clean up old targets
        this.cleanupTargets(time);
    }
    
    updateTargetSpawning(time) {
        if (time >= this.nextTargetTime && this.targets.size < this.config.maxTargets) {
            this.spawnTarget(time);
            
            // Calculate next spawn time
            this.currentInterval = this.calculateDynamicInterval();
            this.nextTargetTime = time + this.currentInterval;
        }
    }
    
    calculateDynamicInterval() {
        // Apply difficulty scaling
        const difficultyMultiplier = this.gameManager.systems.difficulty.getSpeedMultiplier();
        return this.config.baseInterval / difficultyMultiplier;
    }
    
    spawnTarget(spawnTime) {
        if (this.sequenceIndex >= this.currentPoseSequence.length) {
            // Level complete
            return;
        }
        
        const targetConfig = this.currentPoseSequence[this.sequenceIndex];
        const targetId = ++this.targetIdCounter;
        
        const target = {
            id: targetId,
            pose: targetConfig.pose,
            difficulty: targetConfig.difficulty,
            sequenceNumber: targetConfig.sequenceNumber,
            spawnTime,
            hitTime: spawnTime + this.config.approachTime,
            window: this.adaptiveWindow.getAdjustedWindow(targetConfig.difficulty),
            windowCenter: this.adaptiveWindow.getAdjustedCenter(),
            hit: false,
            missed: false,
            position: this.calculateTargetPosition(targetId),
            approachProgress: 0
        };
        
        this.targets.set(targetId, target);
        this.sequenceIndex++;
        
        // Emit spawn event
        this.emit('targetSpawned', target);
        
        console.log(`🎯 Spawned target ${targetId}: ${target.pose} (difficulty: ${target.difficulty})`);
    }
    
    calculateTargetPosition(targetId) {
        // Calculate visual position for target
        // This would be used by the visual system to place targets
        const lane = targetId % 3; // 3 lanes for variety
        return {
            lane,
            x: 100 + (lane * 200), // Spread across screen
            y: 200,
            z: 0
        };
    }
    
    updateTargets(time) {
        for (const target of this.targets.values()) {
            if (target.hit || target.missed) continue;
            
            // Update approach progress
            const elapsed = time - target.spawnTime;
            target.approachProgress = elapsed / this.config.approachTime;
            
            // Check if target passed hit window (miss)
            const timeDiff = time - target.hitTime;
            if (timeDiff > (target.window + target.windowCenter)) {
                this.processTargetMiss(target, time);
            }
        }
    }
    
    checkHits(time) {
        const activeTargets = Array.from(this.targets.values()).filter(t => !t.hit && !t.missed);
        
        for (const target of activeTargets) {
            const timeDiff = time - (target.hitTime + target.windowCenter);
            const absTimeDiff = Math.abs(timeDiff);
            
            // Check if within hit window
            if (absTimeDiff <= target.window) {
                const accuracy = this.matchPose(target.pose, this.currentPose);
                
                if (accuracy >= this.getMinimumAccuracy(target.difficulty)) {
                    this.processTargetHit(target, timeDiff, accuracy, time);
                }
            }
        }
    }
    
    matchPose(targetPose, playerPose) {
        // Get pose definitions
        const targetDefinition = this.getPoseDefinition(targetPose);
        if (!targetDefinition || !playerPose) return 0;
        
        // Calculate similarity using weighted joint matching
        let totalScore = 0;
        let totalWeight = 0;
        
        for (const joint in targetDefinition.keypoints) {
            if (!playerPose[joint]) continue;
            
            const targetPoint = targetDefinition.keypoints[joint];
            const playerPoint = playerPose[joint];
            
            // Calculate joint distance
            const distance = this.calculateJointDistance(targetPoint, playerPoint);
            const weight = targetDefinition.weights[joint] || 1.0;
            
            // Convert distance to similarity score (0-1)
            const similarity = 1 - Math.min(distance / 0.5, 1); // 0.5 is max meaningful distance
            
            totalScore += similarity * weight * (playerPoint.confidence || 1);
            totalWeight += weight;
        }
        
        return totalWeight > 0 ? totalScore / totalWeight : 0;
    }
    
    calculateJointDistance(point1, point2) {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        const dz = (point1.z || 0) - (point2.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    getPoseDefinition(poseName) {
        // Define pose keypoint positions and weights
        const poseDefinitions = {
            arms_up: {
                keypoints: {
                    leftShoulder: { x: -0.3, y: -0.2, z: 0 },
                    rightShoulder: { x: 0.3, y: -0.2, z: 0 },
                    leftElbow: { x: -0.5, y: -0.6, z: 0 },
                    rightElbow: { x: 0.5, y: -0.6, z: 0 },
                    leftWrist: { x: -0.6, y: -0.8, z: 0 },
                    rightWrist: { x: 0.6, y: -0.8, z: 0 }
                },
                weights: {
                    leftShoulder: 1.5,
                    rightShoulder: 1.5,
                    leftElbow: 1.2,
                    rightElbow: 1.2,
                    leftWrist: 1.0,
                    rightWrist: 1.0
                }
            },
            squat: {
                keypoints: {
                    leftHip: { x: -0.2, y: 0.1, z: 0 },
                    rightHip: { x: 0.2, y: 0.1, z: 0 },
                    leftKnee: { x: -0.2, y: 0.4, z: 0 },
                    rightKnee: { x: 0.2, y: 0.4, z: 0 },
                    leftAnkle: { x: -0.2, y: 0.7, z: 0 },
                    rightAnkle: { x: 0.2, y: 0.7, z: 0 }
                },
                weights: {
                    leftHip: 1.5,
                    rightHip: 1.5,
                    leftKnee: 1.3,
                    rightKnee: 1.3,
                    leftAnkle: 1.0,
                    rightAnkle: 1.0
                }
            },
            side_stretch: {
                keypoints: {
                    leftShoulder: { x: -0.3, y: -0.2, z: 0 },
                    rightShoulder: { x: 0.3, y: -0.2, z: 0 },
                    leftElbow: { x: -0.7, y: -0.4, z: 0 },
                    rightElbow: { x: 0.1, y: -0.1, z: 0 },
                    leftWrist: { x: -0.8, y: -0.5, z: 0 },
                    rightWrist: { x: 0.4, y: 0.2, z: 0 }
                },
                weights: {
                    leftShoulder: 1.5,
                    rightShoulder: 1.5,
                    leftElbow: 1.3,
                    rightElbow: 1.0,
                    leftWrist: 1.2,
                    rightWrist: 0.8
                }
            }
        };
        
        return poseDefinitions[poseName];
    }
    
    getMinimumAccuracy(difficulty) {
        const thresholds = {
            easy: 0.6,
            normal: 0.7,
            hard: 0.8,
            expert: 0.85,
            master: 0.9
        };
        return thresholds[difficulty] || 0.7;
    }
    
    processTargetHit(target, timingOffset, accuracy, timestamp) {
        target.hit = true;
        
        const rating = this.getHitRating(Math.abs(timingOffset));
        const hit = {
            target,
            timing: timingOffset,
            accuracy,
            rating,
            timestamp,
            score: 0 // Will be calculated by scoring system
        };
        
        // Update hit statistics
        this.hitStats[rating.toLowerCase()]++;
        this.hitStats.total++;
        
        // Record for adaptive timing
        this.adaptiveWindow.recordHit(timingOffset, timestamp);
        
        // Emit hit event
        this.emit('targetHit', hit);
        
        console.log(`✅ Hit! ${target.pose} - ${rating} (${timingOffset.toFixed(0)}ms, ${(accuracy * 100).toFixed(1)}%)`);
    }
    
    processTargetMiss(target, timestamp) {
        target.missed = true;
        
        // Update miss statistics
        this.hitStats.miss++;
        this.hitStats.total++;
        
        // Emit miss event
        this.emit('targetMiss', target);
        
        console.log(`❌ Miss! ${target.pose} (sequence ${target.sequenceNumber})`);
    }
    
    getHitRating(absTimingOffset) {
        if (absTimingOffset <= 50) return 'Perfect';
        if (absTimingOffset <= 100) return 'Great';
        if (absTimingOffset <= 200) return 'Good';
        if (absTimingOffset <= 350) return 'OK';
        return 'Miss';
    }
    
    setCurrentPose(pose) {
        this.currentPose = pose;
        
        // Store in history
        this.poseHistory.push({
            pose,
            timestamp: this.gameManager.scene.time.now
        });
        
        // Limit history size
        if (this.poseHistory.length > this.maxPoseHistory) {
            this.poseHistory.shift();
        }
    }
    
    cleanupTargets(time) {
        // Remove targets that are far past their hit time
        const cleanupThreshold = 5000; // 5 seconds
        
        for (const [id, target] of this.targets) {
            if ((target.hit || target.missed) && 
                (time - target.hitTime) > cleanupThreshold) {
                this.targets.delete(id);
            }
        }
    }
    
    isLevelComplete() {
        return this.sequenceIndex >= this.currentPoseSequence.length && 
               this.targets.size === 0;
    }
    
    getHitStats() {
        return { ...this.hitStats };
    }
    
    getActiveTargets() {
        return Array.from(this.targets.values());
    }
    
    destroy() {
        this.stop();
        this.removeAllListeners();
        console.log('🧹 Timing System destroyed');
    }
}

// Adaptive timing window helper class
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
        this.playerStats.averageOffset = offsets.reduce((sum, offset) => sum + offset, 0) / offsets.length;
        
        // Calculate consistency (standard deviation)
        const variance = offsets.reduce((sum, offset) => {
            const diff = offset - this.playerStats.averageOffset;
            return sum + (diff * diff);
        }, 0) / offsets.length;
        
        this.playerStats.consistency = Math.sqrt(variance);
    }
    
    getAdjustedWindow(difficulty) {
        // Difficulty multipliers
        const difficultyMultipliers = {
            easy: 1.5,
            normal: 1.0,
            hard: 0.8,
            expert: 0.6,
            master: 0.4
        };
        
        const difficultyMultiplier = difficultyMultipliers[difficulty] || 1.0;
        
        // Wider window for inconsistent players
        const consistencyFactor = Math.max(0.5, Math.min(2.0, this.playerStats.consistency / 50));
        
        return this.baseWindow * difficultyMultiplier * consistencyFactor;
    }
    
    getAdjustedCenter() {
        // Shift window center based on player tendency
        return -this.playerStats.averageOffset * 0.5;
    }
}