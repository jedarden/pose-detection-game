/**
 * PWA Manager - Progressive Web App features
 * Handles service worker, app installation, offline capabilities
 */

export class PWAManager {
    constructor() {
        this.serviceWorker = null;
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.isOnline = navigator.onLine;
        
        this.checkInstallation();
        this.setupEventListeners();
        this.registerServiceWorker();
    }
    
    checkInstallation() {
        // Check if app is running in standalone mode
        this.isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                          window.navigator.standalone ||
                          document.referrer.includes('android-app://');
        
        if (this.isInstalled) {
            console.log('App is running in installed mode');
            this.hideInstallPrompt();
        }
    }
    
    setupEventListeners() {
        // Listen for the beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('beforeinstallprompt fired');
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPrompt();
        });
        
        // Listen for app installed event
        window.addEventListener('appinstalled', (e) => {
            console.log('App was installed');
            this.isInstalled = true;
            this.hideInstallPrompt();
            this.showInstalledNotification();
        });
        
        // Network status monitoring
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.handleNetworkChange(true);
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.handleNetworkChange(false);
        });
        
        // Service worker updates
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                this.showUpdateNotification();
            });
        }
        
        // Handle iOS Safari specific events
        if (this.isIOSSafari()) {
            this.setupIOSInstallation();
        }
    }
    
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./sw.js');
                this.serviceWorker = registration;
                
                console.log('Service Worker registered:', registration);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateAvailable();
                        }
                    });
                });
                
                // Check for updates every hour
                setInterval(() => {
                    registration.update();
                }, 60 * 60 * 1000);
                
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }
    
    async installApp() {
        if (!this.deferredPrompt) {
            console.log('Install prompt not available');
            if (this.isIOSSafari()) {
                this.showIOSInstallInstructions();
            }
            return false;
        }
        
        try {
            this.deferredPrompt.prompt();
            const result = await this.deferredPrompt.userChoice;
            
            if (result.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                this.hideInstallPrompt();
            } else {
                console.log('User dismissed the install prompt');
            }
            
            this.deferredPrompt = null;
            return result.outcome === 'accepted';
            
        } catch (error) {
            console.error('Error installing app:', error);
            return false;
        }
    }
    
    showInstallPrompt() {
        const installPrompt = document.createElement('div');
        installPrompt.id = 'install-prompt';
        installPrompt.className = 'install-prompt';
        installPrompt.innerHTML = `
            <div class="install-content">
                <div class="install-icon">📱</div>
                <h3>Install Pose Game</h3>
                <p>Get the full experience! Install the app for better performance and offline access.</p>
                <div class="install-buttons">
                    <button id="install-btn" class="install-btn-primary">Install</button>
                    <button id="install-dismiss" class="install-btn-secondary">Maybe Later</button>
                </div>
            </div>
        `;
        
        // Add styles
        installPrompt.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            animation: slideUp 0.3s ease;
        `;
        
        document.body.appendChild(installPrompt);
        
        // Event listeners
        document.getElementById('install-btn').addEventListener('click', () => {
            this.installApp();
        });
        
        document.getElementById('install-dismiss').addEventListener('click', () => {
            this.hideInstallPrompt();
        });
    }
    
    hideInstallPrompt() {
        const prompt = document.getElementById('install-prompt');
        if (prompt) {
            prompt.remove();
        }
    }
    
    showIOSInstallInstructions() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>📱 Install on iOS</h3>
                <div class="ios-instructions">
                    <p>To install this app on your iPhone or iPad:</p>
                    <ol>
                        <li>Tap the share button <span style="font-size: 1.2em;">⬆️</span></li>
                        <li>Scroll down and tap "Add to Home Screen"</li>
                        <li>Tap "Add" to confirm</li>
                    </ol>
                </div>
                <button onclick="this.parentElement.parentElement.remove()">Got it!</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    setupIOSInstallation() {
        // Check if already installed
        if (window.navigator.standalone) {
            this.isInstalled = true;
            return;
        }
        
        // Show iOS-specific install prompt
        setTimeout(() => {
            if (!this.isInstalled && !localStorage.getItem('ios-install-dismissed')) {
                this.showIOSInstallInstructions();
            }
        }, 5000); // Show after 5 seconds
    }
    
    isIOSSafari() {
        return /iPhone|iPad|iPod/.test(navigator.userAgent) && 
               /Safari/.test(navigator.userAgent) && 
               !/CriOS|FxiOS|OPiOS|mercury/.test(navigator.userAgent);
    }
    
    showInstalledNotification() {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.innerHTML = `
            <div class="notification-content">
                <span>✅ App installed successfully!</span>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #10b981;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 1001;
            animation: slideDown 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    showUpdateAvailable() {
        const updatePrompt = document.createElement('div');
        updatePrompt.id = 'update-prompt';
        updatePrompt.className = 'update-prompt';
        updatePrompt.innerHTML = `
            <div class="update-content">
                <span>🔄 New version available!</span>
                <button id="update-btn">Update</button>
                <button id="update-dismiss">×</button>
            </div>
        `;
        
        updatePrompt.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            right: 20px;
            background: #f59e0b;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            z-index: 1001;
            animation: slideDown 0.3s ease;
        `;
        
        document.body.appendChild(updatePrompt);
        
        document.getElementById('update-btn').addEventListener('click', () => {
            this.updateApp();
        });
        
        document.getElementById('update-dismiss').addEventListener('click', () => {
            updatePrompt.remove();
        });
    }
    
    async updateApp() {
        if (this.serviceWorker) {
            const newWorker = this.serviceWorker.waiting;
            if (newWorker) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
            }
        }
    }
    
    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.innerHTML = `
            <div class="notification-content">
                <span>✅ App updated successfully!</span>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #10b981;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 1001;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    handleNetworkChange(isOnline) {
        const statusIndicator = document.getElementById('network-status');
        
        if (!statusIndicator) {
            const indicator = document.createElement('div');
            indicator.id = 'network-status';
            indicator.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 0.8rem;
                font-weight: 600;
                z-index: 1002;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(indicator);
        }
        
        const indicator = document.getElementById('network-status');
        
        if (isOnline) {
            indicator.textContent = '🟢 Online';
            indicator.style.background = '#10b981';
            indicator.style.color = 'white';
            
            // Hide after 2 seconds if coming back online
            setTimeout(() => {
                indicator.style.opacity = '0';
            }, 2000);
        } else {
            indicator.textContent = '🔴 Offline';
            indicator.style.background = '#ef4444';
            indicator.style.color = 'white';
            indicator.style.opacity = '1';
        }
    }
    
    // Cache management
    async clearCache() {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(name => caches.delete(name))
            );
            console.log('Cache cleared');
        }
    }
    
    async getCacheSize() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                used: estimate.usage,
                total: estimate.quota,
                percentage: (estimate.usage / estimate.quota * 100).toFixed(1)
            };
        }
        return null;
    }
    
    // Offline game state management
    saveGameState(gameState) {
        try {
            localStorage.setItem('pose-game-state', JSON.stringify({
                ...gameState,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('Failed to save game state:', error);
        }
    }
    
    loadGameState() {
        try {
            const saved = localStorage.getItem('pose-game-state');
            if (saved) {
                const gameState = JSON.parse(saved);
                
                // Check if state is not too old (24 hours)
                if (Date.now() - gameState.timestamp < 24 * 60 * 60 * 1000) {
                    return gameState;
                }
            }
        } catch (error) {
            console.error('Failed to load game state:', error);
        }
        return null;
    }
    
    // Background sync (when available)
    async requestBackgroundSync(tag) {
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register(tag);
        }
    }
    
    // Performance monitoring for PWA
    getPerformanceMetrics() {
        if ('performance' in window) {
            const navigation = performance.getEntriesByType('navigation')[0];
            return {
                loadTime: navigation.loadEventEnd - navigation.fetchStart,
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
                firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
                firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime
            };
        }
        return null;
    }
    
    // Share API support
    async shareScore(score, pose) {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Pose Detection Game',
                    text: `I just scored ${score} points in the Pose Detection Game!`,
                    url: window.location.href
                });
                return true;
            } catch (error) {
                console.error('Share failed:', error);
                return false;
            }
        } else {
            // Fallback: copy to clipboard
            try {
                await navigator.clipboard.writeText(
                    `I just scored ${score} points in the Pose Detection Game! ${window.location.href}`
                );
                this.showNotification('Score copied to clipboard!');
                return true;
            } catch (error) {
                console.error('Clipboard failed:', error);
                return false;
            }
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        const colors = {
            info: '#3b82f6',
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${colors[type]};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 1001;
            animation: slideDown 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    // Get app info
    getAppInfo() {
        return {
            isInstalled: this.isInstalled,
            isOnline: this.isOnline,
            hasServiceWorker: !!this.serviceWorker,
            canInstall: !!this.deferredPrompt,
            platform: this.getPlatform()
        };
    }
    
    getPlatform() {
        const ua = navigator.userAgent;
        
        if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
        if (/Android/.test(ua)) return 'Android';
        if (/Mac/.test(ua)) return 'macOS';
        if (/Win/.test(ua)) return 'Windows';
        if (/Linux/.test(ua)) return 'Linux';
        
        return 'Unknown';
    }
}

export default PWAManager;