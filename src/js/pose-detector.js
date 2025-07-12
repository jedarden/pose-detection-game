/**
 * Mobile-Optimized Pose Detector
 * Implements frame skipping, model switching, and performance optimization
 */

import MobileOptimizer from './mobile-optimizer.js';

export class PoseDetector {
    constructor(mobileOptimizer) {
        this.mobileOptimizer = mobileOptimizer;
        this.detector = null;
        this.model = null;
        this.isDetecting = false;
        this.frameSkipCounter = 0;
        this.lastPose = null;
        this.poseHistory = [];
        this.maxHistorySize = 5;
        
        // Performance tracking
        this.detectionTimes = [];
        this.maxDetectionTimes = 30;
        
        // Frame skipping and interpolation
        this.frameSkipInterval = 2;
        this.interpolator = new PoseInterpolator();
        
        // Worker support for offloading
        this.useWorker = this.checkWorkerSupport();
        this.worker = null;
        
        this.setupEventListeners();
    }
    
    async initialize() {
        console.log('Initializing pose detector...');
        
        try {
            // Wait for TensorFlow.js to be ready
            await tf.ready();
            console.log('TensorFlow.js backend:', tf.getBackend());
            
            // Set backend preference for mobile
            await this.setOptimalBackend();
            
            // Get current quality settings
            const settings = this.mobileOptimizer.getCurrentSettings();
            
            // Initialize model based on quality
            await this.loadModel(settings.settings.poseModel);
            
            // Initialize worker if supported
            if (this.useWorker) {
                await this.initializeWorker();
            }
            
            console.log('Pose detector initialized successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to initialize pose detector:', error);
            throw error;
        }
    }
    
    async setOptimalBackend() {
        const deviceProfile = this.mobileOptimizer.deviceProfile;
        
        try {
            if (deviceProfile.isMobile) {
                // Mobile: prefer WebGL if available, fallback to CPU
                if (tf.env().getBool('WEBGL_RENDER_FLOAT32_CAPABLE')) {
                    await tf.setBackend('webgl');
                    console.log('Using WebGL backend for mobile');
                } else {
                    await tf.setBackend('cpu');
                    console.log('Using CPU backend for mobile (WebGL not supported)');
                }
            } else {
                // Desktop: prefer WebGL
                await tf.setBackend('webgl');
                console.log('Using WebGL backend for desktop');
            }
        } catch (error) {
            console.warn('Failed to set optimal backend, using default:', error);
        }
    }
    
    async loadModel(modelType) {
        try {
            console.log(`Loading ${modelType} model...`);
            
            const startTime = performance.now();
            
            if (modelType === 'movenet-lightning') {
                this.detector = await poseDetection.createDetector(
                    poseDetection.SupportedModels.MoveNet,
                    {
                        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
                        enableSmoothing: true,
                        minPoseScore: 0.25
                    }
                );
            } else if (modelType === 'movenet-thunder') {
                this.detector = await poseDetection.createDetector(
                    poseDetection.SupportedModels.MoveNet,
                    {
                        modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
                        enableSmoothing: true,
                        minPoseScore: 0.3
                    }
                );
            } else {
                throw new Error(`Unsupported model type: ${modelType}`);
            }
            
            const loadTime = performance.now() - startTime;
            console.log(`Model loaded in ${loadTime.toFixed(2)}ms`);
            
            this.model = modelType;
            
        } catch (error) {
            console.error('Failed to load pose detection model:', error);
            throw error;
        }
    }
    
    async switchModel(modelType) {
        if (this.model === modelType) return;
        
        console.log(`Switching from ${this.model} to ${modelType}`);
        
        // Dispose old model
        if (this.detector) {
            this.detector.dispose();
        }
        
        // Load new model
        await this.loadModel(modelType);
    }
    
    async detectPose(videoElement) {
        if (!this.detector || !videoElement || this.isDetecting) {
            return this.getInterpolatedPose();
        }
        
        // Frame skipping logic
        this.frameSkipCounter++;
        if (this.frameSkipCounter < this.frameSkipInterval) {
            return this.getInterpolatedPose();
        }
        this.frameSkipCounter = 0;
        
        this.isDetecting = true;
        const startTime = performance.now();
        
        try {
            let poses;
            
            if (this.useWorker && this.worker) {
                // Use worker for detection (if implemented)
                poses = await this.detectWithWorker(videoElement);
            } else {
                // Direct detection
                poses = await this.detector.estimatePoses(videoElement, {
                    maxPoses: 1,
                    flipHorizontal: true, // Mirror for front camera
                    scoreThreshold: 0.3
                });
            }
            
            const detectionTime = performance.now() - startTime;
            this.trackDetectionTime(detectionTime);
            
            const pose = poses[0] || null;
            
            if (pose && this.isValidPose(pose)) {
                // Smooth the pose
                const smoothedPose = this.smoothPose(pose);
                this.lastPose = smoothedPose;
                this.addToHistory(smoothedPose);
                return smoothedPose;
            } else {
                // No valid pose detected, use interpolation
                return this.getInterpolatedPose();
            }
            
        } catch (error) {
            console.error('Pose detection error:', error);
            return this.lastPose;
        } finally {
            this.isDetecting = false;
        }
    }
    
    isValidPose(pose) {
        if (!pose || !pose.keypoints) return false;
        
        // Check minimum number of confident keypoints
        const confidentKeypoints = pose.keypoints.filter(kp => kp.score > 0.3);
        const requiredKeypoints = Math.max(5, pose.keypoints.length * 0.4);
        
        return confidentKeypoints.length >= requiredKeypoints;
    }
    
    smoothPose(newPose) {
        if (!this.lastPose) return newPose;
        
        const smoothingFactor = 0.7; // Adjust for smoothness vs responsiveness
        const smoothedKeypoints = newPose.keypoints.map((kp, index) => {
            const lastKp = this.lastPose.keypoints[index];
            
            if (!lastKp) return kp;
            
            return {
                ...kp,
                x: lastKp.x * (1 - smoothingFactor) + kp.x * smoothingFactor,
                y: lastKp.y * (1 - smoothingFactor) + kp.y * smoothingFactor
            };
        });
        
        return {
            ...newPose,
            keypoints: smoothedKeypoints
        };
    }
    
    addToHistory(pose) {
        this.poseHistory.push({
            pose: pose,
            timestamp: performance.now()
        });
        
        if (this.poseHistory.length > this.maxHistorySize) {
            this.poseHistory.shift();
        }
    }
    
    getInterpolatedPose() {
        if (!this.lastPose || this.poseHistory.length < 2) {
            return this.lastPose;
        }
        
        // Simple interpolation based on last known poses
        return this.interpolator.interpolate(this.poseHistory);
    }
    
    trackDetectionTime(time) {
        this.detectionTimes.push(time);
        if (this.detectionTimes.length > this.maxDetectionTimes) {
            this.detectionTimes.shift();
        }
        
        // Adjust frame skip interval based on performance
        const avgTime = this.getAverageDetectionTime();
        const targetTime = 1000 / this.mobileOptimizer.getCurrentSettings().settings.frameTarget;
        
        if (avgTime > targetTime * 0.8) {
            this.frameSkipInterval = Math.min(4, this.frameSkipInterval + 1);
        } else if (avgTime < targetTime * 0.4 && this.frameSkipInterval > 1) {
            this.frameSkipInterval = Math.max(1, this.frameSkipInterval - 1);
        }
    }
    
    getAverageDetectionTime() {
        if (this.detectionTimes.length === 0) return 0;
        const sum = this.detectionTimes.reduce((a, b) => a + b, 0);
        return sum / this.detectionTimes.length;
    }
    
    checkWorkerSupport() {
        return typeof Worker !== 'undefined' && 
               typeof SharedArrayBuffer !== 'undefined';
    }
    
    async initializeWorker() {
        try {
            // Worker implementation would go here
            // For now, keep detection on main thread
            console.log('Worker support detected but not implemented yet');
        } catch (error) {
            console.warn('Failed to initialize worker:', error);
            this.useWorker = false;
        }
    }
    
    setupEventListeners() {
        // Listen for quality changes from mobile optimizer
        this.mobileOptimizer.addEventListener('qualitychange', async (event) => {
            const newSettings = event.detail.settings;
            
            // Update frame skip interval
            this.frameSkipInterval = newSettings.poseDetectionInterval;
            
            // Switch model if needed
            if (newSettings.poseModel !== this.model) {
                try {
                    await this.switchModel(newSettings.poseModel);
                } catch (error) {
                    console.error('Failed to switch model:', error);
                }
            }
        });
        
        // Handle memory pressure
        this.mobileOptimizer.addEventListener('memorypressure', () => {
            this.cleanupMemory();
        });
    }
    
    cleanupMemory() {
        // Clear pose history
        this.poseHistory = [];
        this.detectionTimes = [];
        
        // Force garbage collection of tensors
        if (tf.engine().state.numTensors > 100) {
            console.log('Cleaning up tensors...');
            tf.disposeVariables();
        }
    }
    
    getPerformanceStats() {
        return {
            averageDetectionTime: this.getAverageDetectionTime(),
            frameSkipInterval: this.frameSkipInterval,
            historySize: this.poseHistory.length,
            tensorCount: tf.engine().state.numTensors,
            memoryMB: tf.engine().state.numBytes / (1024 * 1024)
        };
    }
    
    dispose() {
        if (this.detector) {
            this.detector.dispose();
        }
        
        if (this.worker) {
            this.worker.terminate();
        }
        
        this.cleanupMemory();
    }
}

/**
 * Pose Interpolator for smooth animation between frames
 */
class PoseInterpolator {
    interpolate(poseHistory) {
        if (poseHistory.length < 2) {
            return poseHistory[poseHistory.length - 1]?.pose || null;
        }
        
        const latest = poseHistory[poseHistory.length - 1];
        const previous = poseHistory[poseHistory.length - 2];
        
        const timeDelta = latest.timestamp - previous.timestamp;
        const now = performance.now();
        const interpolationFactor = Math.min(1, (now - latest.timestamp) / timeDelta);
        
        // Linear interpolation between keypoints
        const interpolatedKeypoints = latest.pose.keypoints.map((kp, index) => {
            const prevKp = previous.pose.keypoints[index];
            
            if (!prevKp) return kp;
            
            // Calculate velocity
            const velocityX = (kp.x - prevKp.x) / timeDelta;
            const velocityY = (kp.y - prevKp.y) / timeDelta;
            
            // Predict position
            return {
                ...kp,
                x: kp.x + velocityX * interpolationFactor * 16, // Assume 16ms frame time
                y: kp.y + velocityY * interpolationFactor * 16,
                score: kp.score * 0.9 // Reduce confidence for interpolated poses
            };
        });
        
        return {
            ...latest.pose,
            keypoints: interpolatedKeypoints,
            interpolated: true
        };
    }
}

export default PoseDetector;