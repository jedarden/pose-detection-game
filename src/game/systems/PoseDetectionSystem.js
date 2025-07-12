/**
 * Pose Detection System - Handles real-time pose detection and tracking
 * Integrates with TensorFlow.js and MediaPipe for accurate pose estimation
 */

import { EventEmitter } from 'events';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';

export class PoseDetectionSystem extends EventEmitter {
    constructor(gameManager) {
        super();
        this.gameManager = gameManager;
        
        // Detection state
        this.detector = null;
        this.isInitialized = false;
        this.isDetecting = false;
        this.videoElement = null;
        this.stream = null;
        
        // Current pose data
        this.currentPose = null;
        this.poseHistory = [];
        this.maxHistorySize = 30;
        
        // Performance settings
        this.detectionFPS = 30; // Target FPS for pose detection
        this.lastDetectionTime = 0;
        this.detectionInterval = 1000 / this.detectionFPS;
        
        // Quality settings
        this.config = {
            modelType: 'MoveNet',
            modelConfig: {
                modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
                enableSmoothing: true,
                multiPoseMaxDimension: 256,
                enableTracking: true
            },
            confidenceThreshold: 0.3,
            minPoseConfidence: 0.5
        };
        
        // Tracking state
        this.trackingQuality = {
            currentConfidence: 0,
            averageConfidence: 0,
            lostTrackingFrames: 0,
            maxLostFrames: 10
        };
        
        // Smoothing filter
        this.smoothingFilter = new PoseSmoothingFilter();
        
        console.log('📹 Pose Detection System initialized');
    }
    
    async initialize() {
        try {
            console.log('🔄 Initializing pose detection...');
            
            // Initialize camera
            await this.initializeCamera();
            
            // Load pose detection model
            await this.loadModel();
            
            this.isInitialized = true;
            console.log('✅ Pose detection system ready');
            
        } catch (error) {
            console.error('❌ Failed to initialize pose detection:', error);
            throw error;
        }
    }
    
    async initializeCamera() {
        try {
            // Request camera permission
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 }
                }
            });
            
            // Create video element
            this.videoElement = document.createElement('video');
            this.videoElement.srcObject = this.stream;
            this.videoElement.autoplay = true;
            this.videoElement.playsInline = true;
            
            // Wait for video to load
            await new Promise((resolve) => {
                this.videoElement.addEventListener('loadeddata', resolve);
            });
            
            console.log('📹 Camera initialized:', {
                width: this.videoElement.videoWidth,
                height: this.videoElement.videoHeight
            });
            
        } catch (error) {
            console.error('❌ Camera initialization failed:', error);
            throw new Error('Camera access required for pose detection');
        }
    }
    
    async loadModel() {
        try {
            console.log('🧠 Loading pose detection model...');
            
            this.detector = await poseDetection.createDetector(
                poseDetection.SupportedModels.MoveNet,
                this.config.modelConfig
            );
            
            console.log('✅ Pose detection model loaded');
            
        } catch (error) {
            console.error('❌ Model loading failed:', error);
            throw error;
        }
    }
    
    startDetection() {
        if (!this.isInitialized) {
            throw new Error('Pose detection not initialized');
        }
        
        this.isDetecting = true;
        this.lastDetectionTime = 0;
        console.log('▶️ Pose detection started');
    }
    
    stopDetection() {
        this.isDetecting = false;
        console.log('⏹️ Pose detection stopped');
    }
    
    update(time, delta) {
        if (!this.isDetecting || !this.detector || !this.videoElement) return;
        
        // Throttle detection to target FPS
        if (time - this.lastDetectionTime < this.detectionInterval) return;
        
        this.detectPoseAsync(time);
        this.lastDetectionTime = time;
    }
    
    async detectPoseAsync(timestamp) {
        try {
            const poses = await this.detector.estimatePoses(this.videoElement);
            this.processPoseDetection(poses, timestamp);
            
        } catch (error) {
            console.warn('⚠️ Pose detection error:', error);
            this.handleDetectionError();
        }
    }
    
    processPoseDetection(poses, timestamp) {
        if (poses.length === 0) {
            this.handleNoPoseDetected(timestamp);
            return;
        }
        
        const rawPose = poses[0];
        
        // Check pose confidence
        const poseConfidence = this.calculatePoseConfidence(rawPose);
        if (poseConfidence < this.config.minPoseConfidence) {
            this.handleLowConfidencePose(rawPose, poseConfidence, timestamp);
            return;
        }
        
        // Normalize and smooth pose
        const normalizedPose = this.normalizePose(rawPose);
        const smoothedPose = this.smoothingFilter.filter(normalizedPose);
        
        // Update current pose
        this.currentPose = {
            ...smoothedPose,
            confidence: poseConfidence,
            timestamp,
            rawPose
        };
        
        // Add to history
        this.addToHistory(this.currentPose);
        
        // Update tracking quality
        this.updateTrackingQuality(poseConfidence);
        
        // Emit pose detected event
        this.emit('poseDetected', this.currentPose);
    }
    
    calculatePoseConfidence(pose) {
        if (!pose.keypoints || pose.keypoints.length === 0) return 0;
        
        // Calculate average confidence of all keypoints
        let totalConfidence = 0;
        let validKeypoints = 0;
        
        pose.keypoints.forEach(keypoint => {
            if (keypoint.score >= this.config.confidenceThreshold) {
                totalConfidence += keypoint.score;
                validKeypoints++;
            }
        });
        
        return validKeypoints > 0 ? totalConfidence / validKeypoints : 0;
    }
    
    normalizePose(rawPose) {
        const normalized = {};
        const videoWidth = this.videoElement.videoWidth;
        const videoHeight = this.videoElement.videoHeight;
        
        rawPose.keypoints.forEach(keypoint => {
            if (keypoint.score >= this.config.confidenceThreshold) {
                normalized[keypoint.name] = {
                    x: (keypoint.x / videoWidth) * 2 - 1,  // Normalize to [-1, 1]
                    y: (keypoint.y / videoHeight) * 2 - 1,
                    z: keypoint.z || 0,
                    confidence: keypoint.score
                };
            }
        });
        
        return normalized;
    }
    
    addToHistory(pose) {
        this.poseHistory.push(pose);
        
        // Limit history size
        if (this.poseHistory.length > this.maxHistorySize) {
            this.poseHistory.shift();
        }
    }
    
    updateTrackingQuality(confidence) {
        this.trackingQuality.currentConfidence = confidence;
        
        // Calculate running average
        if (this.poseHistory.length > 0) {
            const recentConfidences = this.poseHistory
                .slice(-10)
                .map(p => p.confidence);
            
            this.trackingQuality.averageConfidence = 
                recentConfidences.reduce((sum, c) => sum + c, 0) / recentConfidences.length;
        }
        
        // Reset lost tracking counter
        this.trackingQuality.lostTrackingFrames = 0;
        
        // Emit quality status if confidence is low
        if (confidence < this.config.minPoseConfidence) {
            this.emit('poseConfidenceLow', confidence);
        }
    }
    
    handleNoPoseDetected(timestamp) {
        this.trackingQuality.lostTrackingFrames++;
        
        if (this.trackingQuality.lostTrackingFrames > this.trackingQuality.maxLostFrames) {
            this.emit('trackingLost', timestamp);
        }
    }
    
    handleLowConfidencePose(pose, confidence, timestamp) {
        this.trackingQuality.lostTrackingFrames++;
        this.emit('poseConfidenceLow', confidence);
    }
    
    handleDetectionError() {
        this.trackingQuality.lostTrackingFrames++;
        
        if (this.trackingQuality.lostTrackingFrames > this.trackingQuality.maxLostFrames * 2) {
            this.emit('detectionError');
        }
    }
    
    // Public API methods
    getCurrentPose() {
        return this.currentPose;
    }
    
    getPoseHistory() {
        return [...this.poseHistory];
    }
    
    getTrackingQuality() {
        return { ...this.trackingQuality };
    }
    
    getVideoElement() {
        return this.videoElement;
    }
    
    // Configuration methods
    setDetectionFPS(fps) {
        this.detectionFPS = Math.max(1, Math.min(60, fps));
        this.detectionInterval = 1000 / this.detectionFPS;
        console.log(`🎯 Detection FPS set to ${this.detectionFPS}`);
    }
    
    setConfidenceThreshold(threshold) {
        this.config.confidenceThreshold = Math.max(0, Math.min(1, threshold));
        console.log(`🎯 Confidence threshold set to ${this.config.confidenceThreshold}`);
    }
    
    enableSmoothing(enabled) {
        this.smoothingFilter.enabled = enabled;
        console.log(`🎯 Pose smoothing ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    // Pose analysis utilities
    calculatePoseStability() {
        if (this.poseHistory.length < 5) return 0;
        
        const recentPoses = this.poseHistory.slice(-5);
        let totalMovement = 0;
        let comparisons = 0;
        
        for (let i = 1; i < recentPoses.length; i++) {
            const movement = this.calculatePoseMovement(
                recentPoses[i - 1],
                recentPoses[i]
            );
            totalMovement += movement;
            comparisons++;
        }
        
        return comparisons > 0 ? 1 - (totalMovement / comparisons) : 0;
    }
    
    calculatePoseMovement(pose1, pose2) {
        let totalMovement = 0;
        let jointCount = 0;
        
        for (const joint in pose1) {
            if (joint === 'confidence' || joint === 'timestamp' || joint === 'rawPose') continue;
            if (!pose2[joint]) continue;
            
            const p1 = pose1[joint];
            const p2 = pose2[joint];
            
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dz = (p1.z || 0) - (p2.z || 0);
            
            totalMovement += Math.sqrt(dx * dx + dy * dy + dz * dz);
            jointCount++;
        }
        
        return jointCount > 0 ? totalMovement / jointCount : 0;
    }
    
    // Cleanup
    destroy() {
        this.stopDetection();
        
        // Stop camera stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        
        // Clean up video element
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
        
        // Clean up detector
        if (this.detector) {
            this.detector.dispose();
        }
        
        this.removeAllListeners();
        this.isInitialized = false;
        
        console.log('🧹 Pose Detection System destroyed');
    }
}

// Pose smoothing filter for reducing jitter
class PoseSmoothingFilter {
    constructor() {
        this.enabled = true;
        this.smoothingFactor = 0.7; // 0 = no smoothing, 1 = no change
        this.previousPose = null;
    }
    
    filter(pose) {
        if (!this.enabled || !this.previousPose) {
            this.previousPose = pose;
            return pose;
        }
        
        const smoothed = {};
        
        for (const joint in pose) {
            if (!this.previousPose[joint]) {
                smoothed[joint] = pose[joint];
                continue;
            }
            
            const current = pose[joint];
            const previous = this.previousPose[joint];
            
            smoothed[joint] = {
                x: this.lerp(previous.x, current.x, 1 - this.smoothingFactor),
                y: this.lerp(previous.y, current.y, 1 - this.smoothingFactor),
                z: this.lerp(previous.z || 0, current.z || 0, 1 - this.smoothingFactor),
                confidence: current.confidence
            };
        }
        
        this.previousPose = smoothed;
        return smoothed;
    }
    
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }
    
    reset() {
        this.previousPose = null;
    }
}