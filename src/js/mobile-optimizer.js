/**
 * Mobile Optimizer - Device-specific performance optimizations
 * Implements adaptive quality, battery monitoring, and thermal management
 */

export class MobileOptimizer {
    constructor() {
        this.deviceProfile = null;
        this.currentQuality = 'medium';
        this.batteryLevel = 1.0;
        this.isLowPowerMode = false;
        this.thermalState = 'nominal';
        this.performanceMetrics = {
            fps: 30,
            frameTime: 33,
            memoryUsage: 0,
            cpuUsage: 0
        };
        
        this.qualitySettings = {
            'ultra': {
                poseModel: 'movenet-thunder',
                videoResolution: { width: 1280, height: 720 },
                renderScale: 1.0,
                effects: true,
                particles: 1000,
                shadows: true,
                antialiasing: true,
                frameTarget: 60,
                poseDetectionInterval: 1
            },
            'high': {
                poseModel: 'movenet-thunder',
                videoResolution: { width: 640, height: 480 },
                renderScale: 1.0,
                effects: true,
                particles: 500,
                shadows: true,
                antialiasing: false,
                frameTarget: 60,
                poseDetectionInterval: 1
            },
            'medium': {
                poseModel: 'movenet-lightning',
                videoResolution: { width: 640, height: 480 },
                renderScale: 0.75,
                effects: true,
                particles: 200,
                shadows: false,
                antialiasing: false,
                frameTarget: 30,
                poseDetectionInterval: 2
            },
            'low': {
                poseModel: 'movenet-lightning',
                videoResolution: { width: 320, height: 240 },
                renderScale: 0.5,
                effects: false,
                particles: 0,
                shadows: false,
                antialiasing: false,
                frameTarget: 30,
                poseDetectionInterval: 3
            },
            'battery': {
                poseModel: 'movenet-lightning',
                videoResolution: { width: 320, height: 240 },
                renderScale: 0.5,
                effects: false,
                particles: 0,
                shadows: false,
                antialiasing: false,
                frameTarget: 20,
                poseDetectionInterval: 4
            }
        };
        
        this.initializeDeviceDetection();
        this.setupBatteryMonitoring();
        this.setupPerformanceMonitoring();
    }
    
    async initializeDeviceDetection() {
        this.deviceProfile = await this.detectDevice();
        console.log('Device profile detected:', this.deviceProfile);
        
        // Auto-select quality based on device
        if (this.currentQuality === 'auto') {
            this.currentQuality = this.selectOptimalQuality();
        }
    }
    
    async detectDevice() {
        const profile = {
            isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
            isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent),
            isAndroid: /Android/i.test(navigator.userAgent),
            isLowEnd: false,
            memory: await this.detectMemory(),
            gpu: await this.detectGPU(),
            cores: navigator.hardwareConcurrency || 4,
            connection: this.getConnectionType(),
            orientation: this.getOrientation()
        };
        
        // Heuristic for low-end device detection
        profile.isLowEnd = profile.memory < 4 || profile.cores < 4 || 
                          (profile.isAndroid && profile.memory < 6);
        
        // Device tier classification
        if (profile.memory >= 8 && profile.cores >= 8) {
            profile.tier = 'high-end';
        } else if (profile.memory >= 4 && profile.cores >= 6) {
            profile.tier = 'mid-range';
        } else {
            profile.tier = 'low-end';
        }
        
        return profile;
    }
    
    async detectMemory() {
        if ('memory' in performance) {
            return performance.memory.jsHeapSizeLimit / (1024 * 1024 * 1024); // GB
        }
        
        // Fallback heuristic based on user agent
        const ua = navigator.userAgent;
        if (ua.includes('iPhone')) {
            if (ua.includes('iPhone 13') || ua.includes('iPhone 14') || ua.includes('iPhone 15')) {
                return 6; // 6GB+
            } else if (ua.includes('iPhone 12') || ua.includes('iPhone 11')) {
                return 4; // 4GB
            } else {
                return 3; // 3GB or less
            }
        } else if (ua.includes('Android')) {
            // Android memory detection is difficult, use conservative estimate
            return 4;
        }
        
        return 8; // Desktop default
    }
    
    async detectGPU() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            
            if (!gl) return 'none';
            
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                
                if (renderer.includes('Apple') || renderer.includes('Metal')) {
                    return 'apple-gpu';
                } else if (renderer.includes('Adreno')) {
                    return 'adreno';
                } else if (renderer.includes('Mali')) {
                    return 'mali';
                } else if (renderer.includes('PowerVR')) {
                    return 'powervr';
                } else if (renderer.includes('RTX') || renderer.includes('GTX')) {
                    return 'nvidia';
                } else if (renderer.includes('Radeon')) {
                    return 'amd';
                }
            }
            
            // Performance test
            const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            if (maxTextureSize >= 16384) {
                return 'high-end';
            } else if (maxTextureSize >= 8192) {
                return 'mid-range';
            } else {
                return 'low-end';
            }
        } catch (error) {
            return 'unknown';
        }
    }
    
    getConnectionType() {
        if ('connection' in navigator) {
            const conn = navigator.connection;
            return {
                effectiveType: conn.effectiveType,
                downlink: conn.downlink,
                saveData: conn.saveData
            };
        }
        return { effectiveType: 'unknown' };
    }
    
    getOrientation() {
        if (screen.orientation) {
            return {
                type: screen.orientation.type,
                angle: screen.orientation.angle
            };
        } else if (window.orientation !== undefined) {
            return {
                angle: window.orientation,
                type: Math.abs(window.orientation) === 90 ? 'landscape' : 'portrait'
            };
        }
        return { type: 'unknown', angle: 0 };
    }
    
    async setupBatteryMonitoring() {
        if ('getBattery' in navigator) {
            try {
                const battery = await navigator.getBattery();
                this.batteryLevel = battery.level;
                
                battery.addEventListener('levelchange', () => {
                    this.batteryLevel = battery.level;
                    this.checkLowPowerMode();
                });
                
                battery.addEventListener('chargingchange', () => {
                    this.checkLowPowerMode();
                });
                
                this.checkLowPowerMode();
            } catch (error) {
                console.warn('Battery API not available:', error);
            }
        }
    }
    
    setupPerformanceMonitoring() {
        // Monitor performance every second
        setInterval(() => {
            this.updatePerformanceMetrics();
            this.adaptQuality();
        }, 1000);
        
        // Monitor thermal throttling (iOS Safari)
        if ('webkitTemperature' in navigator) {
            setInterval(() => {
                this.thermalState = navigator.webkitTemperature > 0.8 ? 'hot' : 'nominal';
            }, 5000);
        }
    }
    
    updatePerformanceMetrics() {
        // FPS calculation (simplified)
        const now = performance.now();
        if (this.lastFrameTime) {
            const deltaTime = now - this.lastFrameTime;
            this.performanceMetrics.fps = 1000 / deltaTime;
            this.performanceMetrics.frameTime = deltaTime;
        }
        this.lastFrameTime = now;
        
        // Memory usage
        if ('memory' in performance) {
            this.performanceMetrics.memoryUsage = 
                performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
        }
    }
    
    checkLowPowerMode() {
        // iOS Low Power Mode detection heuristics
        const isCharging = navigator.getBattery && navigator.getBattery().charging;
        const lowBattery = this.batteryLevel < 0.2;
        const slowPerformance = this.performanceMetrics.fps < 20;
        
        this.isLowPowerMode = (lowBattery && !isCharging) || 
                            (this.thermalState === 'hot') ||
                            slowPerformance;
    }
    
    adaptQuality() {
        const currentSettings = this.qualitySettings[this.currentQuality];
        const targetFPS = currentSettings.frameTarget;
        const currentFPS = this.performanceMetrics.fps;
        const memoryUsage = this.performanceMetrics.memoryUsage;
        
        // Downgrade conditions
        if (this.isLowPowerMode || 
            currentFPS < targetFPS * 0.7 || 
            memoryUsage > 0.85 ||
            this.thermalState === 'hot') {
            
            this.downgradeQuality();
        }
        // Upgrade conditions (be conservative)
        else if (currentFPS > targetFPS * 1.3 && 
                memoryUsage < 0.6 && 
                this.batteryLevel > 0.5 && 
                this.thermalState === 'nominal') {
            
            this.upgradeQuality();
        }
    }
    
    downgradeQuality() {
        const levels = ['ultra', 'high', 'medium', 'low', 'battery'];
        const currentIndex = levels.indexOf(this.currentQuality);
        
        if (currentIndex < levels.length - 1) {
            const newQuality = levels[currentIndex + 1];
            console.log(`Downgrading quality: ${this.currentQuality} → ${newQuality}`);
            this.setQuality(newQuality);
        }
    }
    
    upgradeQuality() {
        const levels = ['ultra', 'high', 'medium', 'low', 'battery'];
        const currentIndex = levels.indexOf(this.currentQuality);
        
        if (currentIndex > 0) {
            const newQuality = levels[currentIndex - 1];
            console.log(`Upgrading quality: ${this.currentQuality} → ${newQuality}`);
            this.setQuality(newQuality);
        }
    }
    
    setQuality(quality) {
        if (quality in this.qualitySettings) {
            this.currentQuality = quality;
            this.dispatchEvent(new CustomEvent('qualitychange', {
                detail: { 
                    quality: quality, 
                    settings: this.qualitySettings[quality] 
                }
            }));
        }
    }
    
    selectOptimalQuality() {
        const profile = this.deviceProfile;
        
        if (!profile.isMobile) {
            // Desktop
            if (profile.memory >= 8 && profile.cores >= 8) {
                return 'ultra';
            } else if (profile.memory >= 4) {
                return 'high';
            } else {
                return 'medium';
            }
        } else {
            // Mobile
            if (profile.tier === 'high-end' && !this.isLowPowerMode) {
                return 'high';
            } else if (profile.tier === 'mid-range') {
                return 'medium';
            } else {
                return 'low';
            }
        }
    }
    
    getCameraConstraints() {
        const settings = this.qualitySettings[this.currentQuality];
        const isPortrait = this.deviceProfile?.orientation?.type?.includes('portrait');
        
        return {
            video: {
                width: { ideal: settings.videoResolution.width },
                height: { ideal: settings.videoResolution.height },
                frameRate: { ideal: settings.frameTarget, max: settings.frameTarget },
                facingMode: 'user', // Front camera for pose detection
                aspectRatio: isPortrait ? 9/16 : 16/9
            },
            audio: false
        };
    }
    
    getCurrentSettings() {
        return {
            quality: this.currentQuality,
            settings: this.qualitySettings[this.currentQuality],
            deviceProfile: this.deviceProfile,
            performanceMetrics: this.performanceMetrics,
            batteryLevel: this.batteryLevel,
            isLowPowerMode: this.isLowPowerMode,
            thermalState: this.thermalState
        };
    }
    
    // Touch optimization for mobile
    optimizeTouchResponsiveness() {
        // Disable touch delays
        document.body.style.touchAction = 'manipulation';
        
        // Add passive event listeners for better scroll performance
        const passiveSupported = this.supportsPassive();
        
        ['touchstart', 'touchmove', 'wheel'].forEach(event => {
            document.addEventListener(event, (e) => {
                // Handle specific touch events
            }, passiveSupported ? { passive: true } : false);
        });
    }
    
    supportsPassive() {
        let passiveSupported = false;
        
        try {
            const options = {
                get passive() {
                    passiveSupported = true;
                    return false;
                }
            };
            
            window.addEventListener('test', null, options);
            window.removeEventListener('test', null, options);
        } catch (err) {
            passiveSupported = false;
        }
        
        return passiveSupported;
    }
    
    // Haptic feedback support
    vibrate(pattern = [100]) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }
    
    // Network-aware loading
    shouldPreloadAssets() {
        const connection = this.deviceProfile?.connection;
        
        if (connection?.saveData) {
            return false; // User has data saver enabled
        }
        
        const effectiveType = connection?.effectiveType;
        return effectiveType === '4g' || effectiveType === '5g' || !effectiveType;
    }
    
    // Memory pressure handling
    onMemoryPressure() {
        console.warn('Memory pressure detected, cleaning up...');
        
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
        
        // Reduce quality
        this.downgradeQuality();
        
        // Clear caches
        this.dispatchEvent(new CustomEvent('memorypressure'));
    }
}

// Make MobileOptimizer available globally and as event target
Object.assign(MobileOptimizer.prototype, EventTarget.prototype);

export default MobileOptimizer;