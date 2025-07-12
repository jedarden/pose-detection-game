/**
 * Core Game Manager for Pose Detection Game
 * Orchestrates all game systems and manages the main game loop
 */

import { TimingSystem } from './systems/TimingSystem.js';
import { PoseDetectionSystem } from './systems/PoseDetectionSystem.js';
import { ScoringSystem } from './systems/ScoringSystem.js';
import { VisualFeedbackSystem } from './systems/VisualFeedbackSystem.js';
import { ComboSystem } from './systems/ComboSystem.js';
import { DifficultyManager } from './systems/DifficultyManager.js';
import { ParticleSystem } from './effects/ParticleSystem.js';

export class GameManager {
    constructor(scene) {
        this.scene = scene;
        this.isInitialized = false;
        
        // Game state
        this.gameState = {
            isPlaying: false,
            isPaused: false,
            currentLevel: 1,
            score: 0,
            lives: 3,
            sessionStartTime: 0,
            sessionDuration: 0
        };
        
        // Performance tracking
        this.performance = {
            frameCount: 0,
            lastFrameTime: 0,
            fps: 60,
            poseDetectionLatency: 0,
            averageFrameTime: 16.67
        };
        
        // Initialize systems
        this.initializeSystems();
    }
    
    initializeSystems() {
        try {
            // Core systems
            this.systems = {
                timing: new TimingSystem(this),
                poseDetection: new PoseDetectionSystem(this),
                scoring: new ScoringSystem(this),
                visual: new VisualFeedbackSystem(this),
                combo: new ComboSystem(this),
                difficulty: new DifficultyManager(this),
                particles: new ParticleSystem(this.scene)
            };
            
            // System event listeners
            this.setupSystemEvents();
            
            console.log('✅ Game systems initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize game systems:', error);
            throw error;
        }
    }
    
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Initialize pose detection
            await this.systems.poseDetection.initialize();
            
            // Initialize visual system
            await this.systems.visual.initialize();
            
            // Setup default level
            this.loadLevel(1);
            
            this.isInitialized = true;
            console.log('🎮 Game Manager initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Game Manager:', error);
            throw error;
        }
    }
    
    setupSystemEvents() {
        // Timing system events
        this.systems.timing.on('targetHit', (hit) => this.onTargetHit(hit));
        this.systems.timing.on('targetMiss', (target) => this.onTargetMiss(target));
        this.systems.timing.on('targetSpawned', (target) => this.onTargetSpawned(target));
        
        // Combo system events
        this.systems.combo.on('comboBreak', (combo) => this.onComboBreak(combo));
        this.systems.combo.on('comboMilestone', (milestone) => this.onComboMilestone(milestone));
        
        // Pose detection events
        this.systems.poseDetection.on('poseDetected', (pose) => this.onPoseDetected(pose));
        this.systems.poseDetection.on('poseConfidenceLow', () => this.onPoseConfidenceLow());
        
        // Difficulty system events
        this.systems.difficulty.on('difficultyChanged', (level) => this.onDifficultyChanged(level));
    }
    
    // Main game loop
    update(time, delta) {
        if (!this.isInitialized || !this.gameState.isPlaying) return;
        
        // Update performance metrics
        this.updatePerformanceMetrics(time, delta);
        
        // Update all systems
        this.systems.timing.update(time, delta);
        this.systems.poseDetection.update(time, delta);
        this.systems.visual.update(time, delta);
        this.systems.particles.update(time, delta);
        this.systems.difficulty.update(time, delta);
        
        // Check for game end conditions
        this.checkGameEndConditions();
    }
    
    updatePerformanceMetrics(time, delta) {
        this.performance.frameCount++;
        this.performance.lastFrameTime = delta;
        this.performance.fps = 1000 / delta;
        
        // Calculate average frame time over last 60 frames
        if (this.performance.frameCount % 60 === 0) {
            this.performance.averageFrameTime = delta;
        }
        
        // Update session duration
        if (this.gameState.sessionStartTime > 0) {
            this.gameState.sessionDuration = time - this.gameState.sessionStartTime;
        }
    }
    
    // Event handlers
    onTargetHit(hit) {
        const score = this.systems.scoring.processHit(hit);
        const comboMultiplier = this.systems.combo.processHit(hit.rating, hit.timestamp);
        
        // Calculate final score with multipliers
        const finalScore = Math.floor(score * comboMultiplier);
        this.gameState.score += finalScore;
        
        // Trigger visual feedback
        this.systems.visual.triggerHitEffect(hit, finalScore);
        this.systems.particles.createHitBurst(hit);
        
        // Update difficulty based on performance
        this.systems.difficulty.recordHit(hit);
        
        console.log(`🎯 Hit! Score: ${finalScore} (${hit.rating}), Combo: ${this.systems.combo.currentCombo}`);
    }
    
    onTargetMiss(target) {
        this.systems.combo.processMiss(target.timestamp);
        this.systems.visual.triggerMissEffect(target);
        this.systems.difficulty.recordMiss(target);
        
        // Lose life for critical misses
        if (target.critical) {
            this.gameState.lives--;
            this.systems.visual.triggerLifeLostEffect();
        }
        
        console.log(`❌ Miss! Lives: ${this.gameState.lives}, Combo broken`);
    }
    
    onTargetSpawned(target) {
        this.systems.visual.showApproachingTarget(target);
    }
    
    onComboBreak(previousCombo) {
        this.systems.visual.triggerComboBreakEffect(previousCombo);
        console.log(`💔 Combo broken at ${previousCombo}`);
    }
    
    onComboMilestone(milestone) {
        this.systems.visual.triggerComboMilestoneEffect(milestone);
        console.log(`🔥 Combo milestone: ${milestone.combo}!`);
    }
    
    onPoseDetected(pose) {
        // Store pose for timing system
        this.systems.timing.setCurrentPose(pose);
    }
    
    onPoseConfidenceLow() {
        this.systems.visual.showPoseTrackingWarning();
    }
    
    onDifficultyChanged(newLevel) {
        this.systems.visual.showDifficultyChangeNotification(newLevel);
        console.log(`📈 Difficulty adjusted to ${newLevel}`);
    }
    
    // Game control methods
    startGame() {
        if (!this.isInitialized) {
            throw new Error('Game not initialized');
        }
        
        this.gameState.isPlaying = true;
        this.gameState.isPaused = false;
        this.gameState.sessionStartTime = this.scene.time.now;
        
        // Reset systems
        this.systems.scoring.reset();
        this.systems.combo.reset();
        this.systems.timing.start();
        
        console.log('🚀 Game started!');
    }
    
    pauseGame() {
        this.gameState.isPaused = true;
        this.systems.timing.pause();
        console.log('⏸️ Game paused');
    }
    
    resumeGame() {
        this.gameState.isPaused = false;
        this.systems.timing.resume();
        console.log('▶️ Game resumed');
    }
    
    stopGame() {
        this.gameState.isPlaying = false;
        this.gameState.isPaused = false;
        
        this.systems.timing.stop();
        
        // Generate session summary
        const sessionSummary = this.generateSessionSummary();
        console.log('🏁 Game stopped', sessionSummary);
        
        return sessionSummary;
    }
    
    loadLevel(levelNumber) {
        const levelConfig = this.getLevelConfig(levelNumber);
        
        this.gameState.currentLevel = levelNumber;
        this.systems.timing.loadLevel(levelConfig);
        this.systems.difficulty.setBaseLevel(levelConfig.difficulty);
        
        console.log(`📋 Level ${levelNumber} loaded`);
    }
    
    getLevelConfig(level) {
        // Basic level progression
        const baseConfig = {
            targetInterval: 1000,
            approachTime: 3000,
            windowSize: 200,
            poses: ['arms_up', 'squat', 'side_stretch'],
            difficulty: 'normal'
        };
        
        // Adjust difficulty based on level
        if (level <= 5) {
            // Tutorial levels
            baseConfig.targetInterval = 2000;
            baseConfig.windowSize = 300;
            baseConfig.difficulty = 'easy';
            baseConfig.poses = ['arms_up'];
        } else if (level <= 20) {
            // Beginner levels
            baseConfig.targetInterval = 1500;
            baseConfig.windowSize = 250;
            baseConfig.poses = ['arms_up', 'squat'];
        } else if (level <= 50) {
            // Intermediate levels
            baseConfig.targetInterval = 1000;
            baseConfig.windowSize = 200;
            baseConfig.difficulty = 'hard';
        } else {
            // Advanced levels
            baseConfig.targetInterval = 800;
            baseConfig.windowSize = 150;
            baseConfig.difficulty = 'expert';
            baseConfig.poses = ['arms_up', 'squat', 'side_stretch', 'lunge', 'star_pose'];
        }
        
        return baseConfig;
    }
    
    generateSessionSummary() {
        return {
            score: this.gameState.score,
            level: this.gameState.currentLevel,
            maxCombo: this.systems.combo.maxCombo,
            duration: this.gameState.sessionDuration,
            accuracy: this.systems.scoring.getAccuracy(),
            performance: this.performance,
            hitStats: this.systems.timing.getHitStats(),
            difficultyProgression: this.systems.difficulty.getProgression()
        };
    }
    
    checkGameEndConditions() {
        // Check if game should end
        if (this.gameState.lives <= 0) {
            this.stopGame();
            this.scene.events.emit('gameOver', this.generateSessionSummary());
        }
        
        // Check for level completion
        if (this.systems.timing.isLevelComplete()) {
            this.loadLevel(this.gameState.currentLevel + 1);
            this.scene.events.emit('levelComplete', this.gameState.currentLevel - 1);
        }
    }
    
    // Cleanup
    destroy() {
        if (this.systems) {
            Object.values(this.systems).forEach(system => {
                if (system.destroy) system.destroy();
            });
        }
        
        this.isInitialized = false;
        console.log('🧹 Game Manager destroyed');
    }
}