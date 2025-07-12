/**
 * Main Application Controller
 * Coordinates all mobile-optimized components
 */

import MobileOptimizer from './mobile-optimizer.js';
import PoseDetector from './pose-detector.js';
import TouchHandler from './touch-handler.js';
import PWAManager from './pwa-manager.js';
import GameEngine from './game-engine.js';

class PoseDetectionGame {
    constructor() {
        this.mobileOptimizer = null;
        this.poseDetector = null;
        this.touchHandler = null;
        this.pwaManager = null;
        this.gameEngine = null;
        
        this.videoStream = null;
        this.videoElement = null;
        this.isInitialized = false;
        this.hasCamera = false;
        
        this.initializationSteps = [
            { name: 'Device Analysis', action: () => this.initializeMobileOptimizer() },
            { name: 'Camera Access', action: () => this.initializeCamera() },
            { name: 'Pose Detection', action: () => this.initializePoseDetection() },
            { name: 'Touch Controls', action: () => this.initializeTouchHandler() },
            { name: 'PWA Features', action: () => this.initializePWA() },
            { name: 'Game Engine', action: () => this.initializeGameEngine() }
        ];
        
        this.currentStep = 0;
    }
    
    async initialize() {
        console.log('🎮 Initializing Pose Detection Game...');
        
        try {
            // Check device compatibility first
            if (!this.checkCompatibility()) {
                this.showCompatibilityError();
                return false;
            }
            
            // Run initialization steps
            for (let i = 0; i < this.initializationSteps.length; i++) {
                this.currentStep = i;
                const step = this.initializationSteps[i];
                
                this.updateLoadingStatus(step.name);
                console.log(`📋 Step ${i + 1}/${this.initializationSteps.length}: ${step.name}`);
                
                await step.action();
                await this.delay(200); // Small delay for UX
            }
            
            this.isInitialized = true;
            this.showGame();
            
            console.log('✅ Game initialized successfully!');
            return true;
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.showInitializationError(error);
            return false;
        }
    }
    
    checkCompatibility() {
        const requirements = {
            getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            webgl: !!document.createElement('canvas').getContext('webgl'),
            es6: typeof Promise !== 'undefined' && typeof Map !== 'undefined',
            requestAnimationFrame: typeof requestAnimationFrame !== 'undefined'
        };
        
        console.log('🔍 Compatibility check:', requirements);
        
        // Essential requirements
        if (!requirements.getUserMedia) {
            this.showError('Camera access is required for pose detection.');
            return false;
        }
        
        if (!requirements.es6) {
            this.showError('Your browser is too old. Please update to a modern browser.');
            return false;
        }
        
        // Warnings for non-essential features
        if (!requirements.webgl) {
            console.warn('⚠️ WebGL not available, performance may be reduced');
        }
        
        return true;
    }
    
    async initializeMobileOptimizer() {
        this.mobileOptimizer = new MobileOptimizer();
        await this.mobileOptimizer.initializeDeviceDetection();
        
        // Log device information
        const deviceInfo = this.mobileOptimizer.getCurrentSettings();
        console.log('📱 Device profile:', deviceInfo.deviceProfile);
        console.log('⚙️ Quality settings:', deviceInfo.settings);
    }
    
    async initializeCamera() {
        this.videoElement = document.getElementById('video');
        
        if (!this.videoElement) {
            throw new Error('Video element not found');
        }
        
        try {
            // Get optimal camera constraints from mobile optimizer
            const constraints = this.mobileOptimizer.getCameraConstraints();
            console.log('📹 Camera constraints:', constraints);
            
            // Request camera access
            this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Set up video element
            this.videoElement.srcObject = this.videoStream;
            this.videoElement.play();
            
            // Wait for video to be ready
            await new Promise((resolve, reject) => {
                this.videoElement.addEventListener('loadedmetadata', resolve);
                this.videoElement.addEventListener('error', reject);
                setTimeout(reject, 10000); // 10 second timeout
            });
            
            this.hasCamera = true;
            console.log('📹 Camera initialized successfully');
            
        } catch (error) {
            console.error('📹 Camera initialization failed:', error);
            
            if (error.name === 'NotAllowedError') {
                throw new Error('Camera permission denied. Please allow camera access and reload the page.');
            } else if (error.name === 'NotFoundError') {
                throw new Error('No camera found. Please connect a camera and reload the page.');
            } else {
                throw new Error('Camera initialization failed: ' + error.message);
            }
        }
    }
    
    async initializePoseDetection() {
        this.poseDetector = new PoseDetector(this.mobileOptimizer);
        await this.poseDetector.initialize();
        console.log('🤖 Pose detection initialized');
    }
    
    async initializeTouchHandler() {
        this.touchHandler = new TouchHandler(this.mobileOptimizer);
        this.setupGestureHandlers();
        console.log('👆 Touch controls initialized');
    }
    
    async initializePWA() {
        this.pwaManager = new PWAManager();
        console.log('📱 PWA features initialized');
    }
    
    async initializeGameEngine() {
        this.gameEngine = new GameEngine(
            this.mobileOptimizer, 
            this.poseDetector, 
            this.touchHandler
        );
        await this.gameEngine.initialize();
        console.log('🎮 Game engine initialized');
    }
    
    setupGestureHandlers() {
        // Global gesture handlers
        document.addEventListener('gesture:shake', (event) => {
            console.log('📳 Shake detected:', event.detail);
            this.handleShakeGesture();
        });
        
        document.addEventListener('gesture:orientationchange', (event) => {
            console.log('📱 Orientation changed:', event.detail);
            this.handleOrientationChange(event.detail.orientation);
        });
        
        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettings();
            });
        }
        
        // Close settings
        const closeSettings = document.getElementById('close-settings');
        if (closeSettings) {
            closeSettings.addEventListener('click', () => {
                this.hideSettings();
            });
        }
        
        // Quality selector
        const qualitySelect = document.getElementById('quality-select');
        if (qualitySelect) {
            qualitySelect.addEventListener('change', (e) => {
                this.changeQuality(e.target.value);
            });
        }
        
        // Camera selector
        const cameraSelect = document.getElementById('camera-select');
        if (cameraSelect) {
            cameraSelect.addEventListener('change', (e) => {
                this.switchCamera(e.target.value);
            });
        }
        
        // Haptic feedback toggle
        const hapticCheckbox = document.getElementById('haptic-feedback');
        if (hapticCheckbox) {
            hapticCheckbox.addEventListener('change', (e) => {
                this.touchHandler.setHapticEnabled(e.target.checked);
            });
        }
    }
    
    handleShakeGesture() {
        // Shake to restart/reset game
        if (this.gameEngine && this.gameEngine.isRunning) {
            this.gameEngine.stopGame();
            setTimeout(() => {
                this.gameEngine.startGame();
            }, 500);
        }
    }
    
    handleOrientationChange(orientation) {
        // Handle orientation changes
        console.log('📱 New orientation:', orientation);
        
        // Show notification for optimal orientation
        if (this.mobileOptimizer.deviceProfile.isMobile) {
            const preferPortrait = window.innerHeight > window.innerWidth;
            const isPortrait = orientation.type.includes('portrait');
            
            if (preferPortrait && !isPortrait) {
                this.showOrientationNotice();
            } else {
                this.hideOrientationNotice();
            }
        }
        
        // Re-initialize canvas after orientation change
        setTimeout(() => {
            if (this.gameEngine) {
                this.gameEngine.setupCanvas();
            }
        }, 300);
    }
    
    showOrientationNotice() {
        const notice = document.getElementById('orientation-notice');
        if (notice) {
            notice.classList.remove('hidden');
        }
    }
    
    hideOrientationNotice() {
        const notice = document.getElementById('orientation-notice');
        if (notice) {
            notice.classList.add('hidden');
        }
    }
    
    showSettings() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.remove('hidden');
            
            // Update current settings
            const currentSettings = this.mobileOptimizer.getCurrentSettings();
            
            const qualitySelect = document.getElementById('quality-select');
            if (qualitySelect) {
                qualitySelect.value = currentSettings.quality;
            }
        }
    }
    
    hideSettings() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    changeQuality(quality) {
        console.log('⚙️ Changing quality to:', quality);
        
        if (quality === 'auto') {
            this.mobileOptimizer.currentQuality = 'auto';
            quality = this.mobileOptimizer.selectOptimalQuality();
        }
        
        this.mobileOptimizer.setQuality(quality);
        this.touchHandler.vibrate([50]); // Haptic feedback
    }
    
    async switchCamera(facingMode) {
        try {
            console.log('📹 Switching camera to:', facingMode);
            
            // Stop current stream
            if (this.videoStream) {
                this.videoStream.getTracks().forEach(track => track.stop());
            }
            
            // Get new constraints
            const constraints = this.mobileOptimizer.getCameraConstraints();
            constraints.video.facingMode = facingMode;
            
            // Request new stream
            this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = this.videoStream;
            
            this.touchHandler.vibrate([100]); // Haptic feedback
            
        } catch (error) {
            console.error('📹 Camera switch failed:', error);
            this.showError('Failed to switch camera: ' + error.message);
        }
    }
    
    updateLoadingStatus(status) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            const statusText = loadingScreen.querySelector('div > div:last-child');
            if (statusText) {
                statusText.textContent = status + '...';
            }
        }
    }
    
    showGame() {
        // Hide loading screen
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
        
        // Show game container
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.classList.remove('hidden');
        }
        
        // Setup performance monitoring if debug mode
        if (this.isDebugMode()) {
            this.setupPerformanceMonitoring();
        }
        
        // Setup battery monitoring
        this.setupBatteryMonitoring();
    }
    
    setupPerformanceMonitoring() {
        const monitor = document.getElementById('performance-monitor');
        if (monitor) {
            monitor.classList.remove('hidden');
            
            setInterval(() => {
                this.updatePerformanceDisplay();
            }, 1000);
        }
    }
    
    updatePerformanceDisplay() {
        const stats = document.getElementById('performance-stats');
        if (!stats) return;
        
        const deviceSettings = this.mobileOptimizer.getCurrentSettings();
        const poseStats = this.poseDetector?.getPerformanceStats();
        
        stats.innerHTML = `
            <div>FPS: ${deviceSettings.performanceMetrics.fps.toFixed(1)}</div>
            <div>Quality: ${deviceSettings.quality}</div>
            <div>Battery: ${(deviceSettings.batteryLevel * 100).toFixed(0)}%</div>
            <div>Memory: ${deviceSettings.performanceMetrics.memoryUsage.toFixed(1)}%</div>
            ${poseStats ? `<div>Pose: ${poseStats.averageDetectionTime.toFixed(1)}ms</div>` : ''}
            ${poseStats ? `<div>Tensors: ${poseStats.tensorCount}</div>` : ''}
        `;
    }
    
    setupBatteryMonitoring() {
        const batteryIndicator = document.getElementById('battery-indicator');
        if (!batteryIndicator) return;
        
        const updateBattery = () => {
            const deviceSettings = this.mobileOptimizer.getCurrentSettings();
            const level = Math.round(deviceSettings.batteryLevel * 100);
            
            let icon = '🔋';
            if (level < 20) icon = '🪫';
            else if (level < 50) icon = '🔋';
            else icon = '🔋';
            
            batteryIndicator.textContent = `${icon} ${level}%`;
            
            if (level < 20) {
                batteryIndicator.style.color = '#ff4444';
            } else if (level < 50) {
                batteryIndicator.style.color = '#ffaa44';
            } else {
                batteryIndicator.style.color = '#44ff44';
            }
        };
        
        updateBattery();
        setInterval(updateBattery, 30000); // Update every 30 seconds
    }
    
    isDebugMode() {
        return window.location.search.includes('debug=true') ||
               localStorage.getItem('debug-mode') === 'true';
    }
    
    showError(message) {
        const errorModal = document.getElementById('error-modal');
        const errorMessage = document.getElementById('error-message');
        
        if (errorModal && errorMessage) {
            errorMessage.textContent = message;
            errorModal.classList.remove('hidden');
        } else {
            alert(message); // Fallback
        }
    }
    
    showCompatibilityError() {
        this.showError(
            'Your device is not compatible with this game. ' +
            'Please use a modern browser with camera support.'
        );
    }
    
    showInitializationError(error) {
        this.showError(
            'Failed to initialize the game: ' + error.message + 
            '\n\nPlease check your camera permissions and try again.'
        );
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Cleanup when page is unloaded
    dispose() {
        console.log('🧹 Cleaning up...');
        
        // Stop video stream
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
        }
        
        // Dispose components
        this.poseDetector?.dispose();
        this.touchHandler?.dispose();
        this.gameEngine?.dispose();
        
        console.log('✅ Cleanup complete');
    }
}

// Global error handling
window.addEventListener('error', (event) => {
    console.error('🚨 Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled promise rejection:', event.reason);
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM loaded, initializing game...');
    
    const game = new PoseDetectionGame();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        game.dispose();
    });
    
    // Start initialization
    const success = await game.initialize();
    
    if (success) {
        console.log('🎉 Game ready to play!');
        
        // Make game globally available for debugging
        if (game.isDebugMode()) {
            window.game = game;
        }
    }
});

export default PoseDetectionGame;