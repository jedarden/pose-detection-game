/**
 * Mobile-Optimized Game Engine
 * Handles game logic, rendering, and performance optimization
 */

export class GameEngine {
    constructor(mobileOptimizer, poseDetector, touchHandler) {
        this.mobileOptimizer = mobileOptimizer;
        this.poseDetector = poseDetector;
        this.touchHandler = touchHandler;
        
        // Game state
        this.isRunning = false;
        this.isPaused = false;
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.gameTime = 0;
        
        // Rendering
        this.canvas = null;
        this.ctx = null;
        this.poseCanvas = null;
        this.poseCtx = null;
        this.renderer = null;
        
        // Performance tracking
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.currentFPS = 0;
        this.targetFPS = 30;
        this.frameTime = 0;
        this.lastFrameTime = 0;
        
        // Game objects
        this.targets = [];
        this.particles = [];
        this.animations = [];
        
        // Current pose and gestures
        this.currentPose = null;
        this.poseGestures = [];
        
        // Game mechanics
        this.targetPoses = [
            { name: 'Jump', gesture: 'jump', points: 10, duration: 2000 },
            { name: 'Wave Right', gesture: 'wave_right', points: 15, duration: 3000 },
            { name: 'Duck', gesture: 'duck', points: 20, duration: 2500 },
            { name: 'Star Pose', gesture: 'star', points: 25, duration: 4000 }
        ];
        this.currentTarget = null;
        this.targetStartTime = 0;
        
        this.setupEventListeners();
    }
    
    async initialize() {
        console.log('Initializing game engine...');
        
        // Get canvas elements
        this.canvas = document.getElementById('canvas');
        this.poseCanvas = document.getElementById('pose-canvas');
        
        if (!this.canvas || !this.poseCanvas) {
            throw new Error('Canvas elements not found');
        }
        
        // Get 2D contexts
        this.ctx = this.canvas.getContext('2d');
        this.poseCtx = this.poseCanvas.getContext('2d');
        
        // Set up canvas properties for mobile
        this.setupCanvas();
        
        // Initialize renderer based on device capabilities
        this.setupRenderer();
        
        // Set target FPS based on device
        const settings = this.mobileOptimizer.getCurrentSettings();
        this.targetFPS = settings.settings.frameTarget;
        
        console.log('Game engine initialized');
    }
    
    setupCanvas() {
        const devicePixelRatio = window.devicePixelRatio || 1;
        const container = document.getElementById('camera-container');
        
        // Get container dimensions
        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        // Set canvas size
        [this.canvas, this.poseCanvas].forEach(canvas => {
            canvas.width = width * devicePixelRatio;
            canvas.height = height * devicePixelRatio;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            
            const ctx = canvas.getContext('2d');
            ctx.scale(devicePixelRatio, devicePixelRatio);
            
            // Optimize for mobile performance
            ctx.imageSmoothingEnabled = this.mobileOptimizer.getCurrentSettings().settings.antialiasing;
            ctx.imageSmoothingQuality = 'low';
        });
        
        // Handle resize
        window.addEventListener('resize', () => {
            setTimeout(() => this.setupCanvas(), 100);
        });
    }
    
    setupRenderer() {
        const settings = this.mobileOptimizer.getCurrentSettings();
        
        this.renderer = {
            renderScale: settings.settings.renderScale,
            effects: settings.settings.effects,
            particles: settings.settings.particles,
            shadows: settings.settings.shadows,
            maxParticles: settings.settings.particles
        };
    }
    
    setupEventListeners() {
        // Listen for quality changes
        this.mobileOptimizer.addEventListener('qualitychange', (event) => {
            this.updateRenderSettings(event.detail.settings);
        });
        
        // Listen for pose gestures
        document.addEventListener('posegesture', (event) => {
            this.handlePoseGesture(event.detail);
        });
        
        // Listen for touch gestures
        document.addEventListener('gesture:tap', (event) => {
            this.handleTouchGesture('tap', event.detail);
        });
        
        document.addEventListener('gesture:doubletap', (event) => {
            this.handleTouchGesture('doubletap', event.detail);
        });
        
        document.addEventListener('gesture:swipe', (event) => {
            this.handleTouchGesture('swipe', event.detail);
        });
        
        // Game controls
        document.getElementById('start-btn')?.addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('pause-btn')?.addEventListener('click', () => {
            this.togglePause();
        });
        
        // Handle visibility changes for battery optimization
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseGame();
            } else if (this.isRunning) {
                this.resumeGame();
            }
        });
    }
    
    startGame() {
        console.log('Starting game...');
        
        this.isRunning = true;
        this.isPaused = false;
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.gameTime = 0;
        
        // Reset game objects
        this.targets = [];
        this.particles = [];
        this.animations = [];
        
        // Generate first target
        this.generateNewTarget();
        
        // Update UI
        this.updateUI();
        this.updateControlButtons();
        
        // Start game loop
        this.gameLoop();
        
        // Haptic feedback
        this.touchHandler.vibrate([100, 50, 100]);
    }
    
    pauseGame() {
        this.isPaused = true;
        this.updateControlButtons();
    }
    
    resumeGame() {
        this.isPaused = false;
        this.updateControlButtons();
        this.gameLoop(); // Restart loop
    }
    
    togglePause() {
        if (this.isPaused) {
            this.resumeGame();
        } else {
            this.pauseGame();
        }
    }
    
    stopGame() {
        this.isRunning = false;
        this.isPaused = false;
        this.updateControlButtons();
        
        // Show game over
        this.showGameOver();
    }
    
    gameLoop() {
        if (!this.isRunning || this.isPaused) return;
        
        const currentTime = performance.now();
        this.frameTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        // Update game logic
        this.update(this.frameTime);
        
        // Render frame
        this.render();
        
        // Performance monitoring
        this.updatePerformanceMetrics();
        
        // Schedule next frame
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update(deltaTime) {
        this.gameTime += deltaTime;
        
        // Update pose detection
        this.updatePoseDetection();
        
        // Update game objects
        this.updateTargets(deltaTime);
        this.updateParticles(deltaTime);
        this.updateAnimations(deltaTime);
        
        // Check win conditions
        this.checkWinConditions();
        
        // Check game over conditions
        this.checkGameOverConditions();
    }
    
    async updatePoseDetection() {
        const video = document.getElementById('video');
        if (!video || video.readyState < 2) return;
        
        try {
            this.currentPose = await this.poseDetector.detectPose(video);
            
            if (this.currentPose) {
                // Recognize gestures from pose
                this.poseGestures = this.touchHandler.recognizeGameGestures(this.currentPose);
                
                // Check if current gestures match target
                this.checkPoseMatch();
            }
        } catch (error) {
            console.error('Pose detection update error:', error);
        }
    }
    
    updateTargets(deltaTime) {
        if (this.currentTarget) {
            const elapsed = this.gameTime - this.targetStartTime;
            const progress = elapsed / this.currentTarget.duration;
            
            if (progress >= 1) {
                // Target expired
                this.targetMissed();
            }
        }
    }
    
    updateParticles(deltaTime) {
        this.particles = this.particles.filter(particle => {
            particle.life -= deltaTime;
            particle.x += particle.vx * deltaTime * 0.001;
            particle.y += particle.vy * deltaTime * 0.001;
            particle.alpha = particle.life / particle.maxLife;
            
            return particle.life > 0;
        });
    }
    
    updateAnimations(deltaTime) {
        this.animations = this.animations.filter(animation => {
            animation.time += deltaTime;
            animation.progress = animation.time / animation.duration;
            
            if (animation.progress >= 1) {
                animation.progress = 1;
                if (animation.onComplete) {
                    animation.onComplete();
                }
                return false;
            }
            
            return true;
        });
    }
    
    render() {
        // Clear canvases
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.poseCtx.clearRect(0, 0, this.poseCanvas.width, this.poseCanvas.height);
        
        // Render game elements
        this.renderTargets();
        this.renderPose();
        this.renderParticles();
        this.renderAnimations();
        this.renderUI();
    }
    
    renderPose() {
        if (!this.currentPose || !this.currentPose.keypoints) return;
        
        const ctx = this.poseCtx;
        const scale = this.renderer.renderScale;
        
        // Draw skeleton
        this.drawSkeleton(ctx, this.currentPose.keypoints, scale);
        
        // Draw keypoints
        this.drawKeypoints(ctx, this.currentPose.keypoints, scale);
        
        // Draw gesture indicators
        this.drawGestureIndicators(ctx);
    }
    
    drawSkeleton(ctx, keypoints, scale = 1) {
        const connections = [
            ['nose', 'left_eye'], ['nose', 'right_eye'],
            ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
            ['left_shoulder', 'right_shoulder'],
            ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
            ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
            ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
            ['left_hip', 'right_hip'],
            ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
            ['right_hip', 'right_knee'], ['right_knee', 'right_ankle']
        ];
        
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3 * scale;
        ctx.lineCap = 'round';
        
        connections.forEach(([startName, endName]) => {
            const start = keypoints.find(kp => kp.name === startName);
            const end = keypoints.find(kp => kp.name === endName);
            
            if (start && end && start.score > 0.3 && end.score > 0.3) {
                ctx.beginPath();
                ctx.moveTo(start.x * scale, start.y * scale);
                ctx.lineTo(end.x * scale, end.y * scale);
                ctx.stroke();
            }
        });
    }
    
    drawKeypoints(ctx, keypoints, scale = 1) {
        keypoints.forEach(keypoint => {
            if (keypoint.score > 0.3) {
                const radius = 6 * scale;
                
                ctx.beginPath();
                ctx.arc(keypoint.x * scale, keypoint.y * scale, radius, 0, 2 * Math.PI);
                ctx.fillStyle = `rgba(255, 0, 0, ${keypoint.score})`;
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(keypoint.x * scale, keypoint.y * scale, radius, 0, 2 * Math.PI);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });
    }
    
    drawGestureIndicators(ctx) {
        if (this.poseGestures.length === 0) return;
        
        const canvasWidth = this.poseCanvas.width;
        const canvasHeight = this.poseCanvas.height;
        
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffff00';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        
        this.poseGestures.forEach((gesture, index) => {
            const text = gesture.type.replace('_', ' ').toUpperCase();
            const y = 50 + index * 40;
            
            ctx.strokeText(text, canvasWidth / 2, y);
            ctx.fillText(text, canvasWidth / 2, y);
        });
    }
    
    renderTargets() {
        if (!this.currentTarget) return;
        
        const ctx = this.ctx;
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // Calculate progress
        const elapsed = this.gameTime - this.targetStartTime;
        const progress = elapsed / this.currentTarget.duration;
        
        // Draw target background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(20, 20, canvasWidth - 40, 120);
        
        // Draw target text
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.currentTarget.name, canvasWidth / 2, 70);
        
        // Draw progress bar
        const barWidth = canvasWidth - 80;
        const progressWidth = barWidth * (1 - progress);
        
        ctx.fillStyle = '#333333';
        ctx.fillRect(40, 90, barWidth, 20);
        
        ctx.fillStyle = progress > 0.7 ? '#ff4444' : '#44ff44';
        ctx.fillRect(40, 90, progressWidth, 20);
        
        // Draw points
        ctx.font = 'bold 16px sans-serif';
        ctx.fillStyle = '#ffdd44';
        ctx.fillText(`${this.currentTarget.points} pts`, canvasWidth / 2, 130);
    }
    
    renderParticles() {
        if (!this.renderer.effects || this.particles.length === 0) return;
        
        const ctx = this.ctx;
        
        this.particles.forEach(particle => {
            ctx.save();
            ctx.globalAlpha = particle.alpha;
            ctx.fillStyle = particle.color;
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.restore();
        });
    }
    
    renderAnimations() {
        this.animations.forEach(animation => {
            if (animation.render) {
                animation.render(this.ctx, animation.progress);
            }
        });
    }
    
    renderUI() {
        // FPS counter (if performance monitoring enabled)
        if (this.mobileOptimizer.getCurrentSettings().performanceMetrics) {
            this.ctx.font = '16px monospace';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText(`FPS: ${this.currentFPS}`, 10, 30);
        }
    }
    
    generateNewTarget() {
        const targetIndex = Math.floor(Math.random() * this.targetPoses.length);
        this.currentTarget = { ...this.targetPoses[targetIndex] };
        this.targetStartTime = this.gameTime;
        
        console.log('New target:', this.currentTarget.name);
    }
    
    checkPoseMatch() {
        if (!this.currentTarget || this.poseGestures.length === 0) return;
        
        const matchingGesture = this.poseGestures.find(
            gesture => gesture.type === this.currentTarget.gesture
        );
        
        if (matchingGesture && matchingGesture.confidence > 0.5) {
            this.targetHit(matchingGesture.confidence);
        }
    }
    
    targetHit(confidence) {
        const basePoints = this.currentTarget.points;
        const bonusPoints = Math.floor(basePoints * confidence * 0.5);
        const totalPoints = basePoints + bonusPoints;
        
        this.score += totalPoints;
        
        // Create particles
        this.createSuccessParticles();
        
        // Haptic feedback
        this.touchHandler.vibrate([50, 100, 50]);
        
        // Show score animation
        this.showScoreAnimation(totalPoints);
        
        // Generate next target
        setTimeout(() => {
            this.generateNewTarget();
        }, 1000);
        
        // Update UI
        this.updateUI();
        
        console.log(`Target hit! +${totalPoints} points (confidence: ${confidence.toFixed(2)})`);
    }
    
    targetMissed() {
        this.lives--;
        
        // Create miss particles
        this.createMissParticles();
        
        // Haptic feedback
        this.touchHandler.vibrate([200]);
        
        // Generate next target
        if (this.lives > 0) {
            setTimeout(() => {
                this.generateNewTarget();
            }, 1000);
        }
        
        // Update UI
        this.updateUI();
        
        console.log('Target missed! Lives remaining:', this.lives);
    }
    
    createSuccessParticles() {
        if (!this.renderer.effects) return;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        for (let i = 0; i < Math.min(20, this.renderer.maxParticles); i++) {
            this.particles.push({
                x: centerX + (Math.random() - 0.5) * 100,
                y: centerY + (Math.random() - 0.5) * 100,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                size: Math.random() * 8 + 4,
                color: `hsl(${Math.random() * 60 + 60}, 100%, 50%)`,
                life: 2000,
                maxLife: 2000,
                alpha: 1
            });
        }
    }
    
    createMissParticles() {
        if (!this.renderer.effects) return;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        for (let i = 0; i < Math.min(10, this.renderer.maxParticles); i++) {
            this.particles.push({
                x: centerX + (Math.random() - 0.5) * 50,
                y: centerY + (Math.random() - 0.5) * 50,
                vx: (Math.random() - 0.5) * 100,
                vy: (Math.random() - 0.5) * 100,
                size: Math.random() * 6 + 2,
                color: '#ff4444',
                life: 1000,
                maxLife: 1000,
                alpha: 1
            });
        }
    }
    
    showScoreAnimation(points) {
        const animation = {
            type: 'score',
            time: 0,
            duration: 1500,
            progress: 0,
            points: points,
            render: (ctx, progress) => {
                const y = 200 - progress * 100;
                const alpha = 1 - progress;
                const scale = 1 + progress * 0.5;
                
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.font = `bold ${24 * scale}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillStyle = '#ffdd44';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                
                const text = `+${points}`;
                ctx.strokeText(text, ctx.canvas.width / 2, y);
                ctx.fillText(text, ctx.canvas.width / 2, y);
                ctx.restore();
            }
        };
        
        this.animations.push(animation);
    }
    
    checkWinConditions() {
        // Level up every 500 points
        const newLevel = Math.floor(this.score / 500) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.levelUp();
        }
    }
    
    checkGameOverConditions() {
        if (this.lives <= 0) {
            this.stopGame();
        }
    }
    
    levelUp() {
        console.log('Level up!', this.level);
        
        // Increase difficulty
        this.targetPoses.forEach(target => {
            target.duration = Math.max(1000, target.duration - 200);
        });
        
        // Haptic feedback
        this.touchHandler.vibrate([100, 50, 100, 50, 100]);
        
        // Show level up animation
        this.showLevelUpAnimation();
    }
    
    showLevelUpAnimation() {
        const animation = {
            type: 'levelup',
            time: 0,
            duration: 2000,
            progress: 0,
            render: (ctx, progress) => {
                const alpha = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
                const scale = 1 + Math.sin(progress * Math.PI) * 0.5;
                
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.font = `bold ${32 * scale}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillStyle = '#ff44ff';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 3;
                
                const text = `LEVEL ${this.level}!`;
                const y = ctx.canvas.height / 2;
                
                ctx.strokeText(text, ctx.canvas.width / 2, y);
                ctx.fillText(text, ctx.canvas.width / 2, y);
                ctx.restore();
            }
        };
        
        this.animations.push(animation);
    }
    
    showGameOver() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>🎮 Game Over!</h3>
                <div class="game-stats">
                    <p><strong>Final Score:</strong> ${this.score}</p>
                    <p><strong>Level Reached:</strong> ${this.level}</p>
                    <p><strong>Time Played:</strong> ${Math.floor(this.gameTime / 1000)}s</p>
                </div>
                <div style="margin: 20px 0;">
                    <button id="restart-btn" class="control-btn primary">Play Again</button>
                    <button id="share-btn" class="control-btn">Share Score</button>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="control-btn">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        document.getElementById('restart-btn').addEventListener('click', () => {
            modal.remove();
            this.startGame();
        });
        
        document.getElementById('share-btn').addEventListener('click', async () => {
            const shared = await this.shareScore();
            if (shared) {
                this.touchHandler.vibrate([50]);
            }
        });
    }
    
    async shareScore() {
        // Use PWA manager to share (would need PWA manager instance)
        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Pose Detection Game',
                    text: `I just scored ${this.score} points in the Pose Detection Game!`,
                    url: window.location.href
                });
                return true;
            }
        } catch (error) {
            console.error('Share failed:', error);
        }
        return false;
    }
    
    updateUI() {
        document.getElementById('score').textContent = `Score: ${this.score}`;
        
        // Update other UI elements as needed
        const statusBar = document.getElementById('status-bar');
        if (statusBar) {
            // Add lives indicator
            let livesDisplay = statusBar.querySelector('.lives');
            if (!livesDisplay) {
                livesDisplay = document.createElement('div');
                livesDisplay.className = 'lives';
                statusBar.appendChild(livesDisplay);
            }
            livesDisplay.textContent = `❤️ ${this.lives}`;
        }
    }
    
    updateControlButtons() {
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        
        if (this.isRunning) {
            startBtn?.classList.add('hidden');
            pauseBtn?.classList.remove('hidden');
            pauseBtn.textContent = this.isPaused ? 'Resume' : 'Pause';
        } else {
            startBtn?.classList.remove('hidden');
            pauseBtn?.classList.add('hidden');
        }
    }
    
    updateRenderSettings(settings) {
        this.renderer.renderScale = settings.renderScale;
        this.renderer.effects = settings.effects;
        this.renderer.particles = settings.particles;
        this.renderer.shadows = settings.shadows;
        this.renderer.maxParticles = settings.particles;
        this.targetFPS = settings.frameTarget;
        
        // Re-setup canvas if render scale changed
        this.setupCanvas();
    }
    
    updatePerformanceMetrics() {
        this.frameCount++;
        const now = performance.now();
        
        if (now - this.lastFPSUpdate >= 1000) {
            this.currentFPS = Math.round(this.frameCount * 1000 / (now - this.lastFPSUpdate));
            this.frameCount = 0;
            this.lastFPSUpdate = now;
            
            // Update FPS display
            const fpsCounter = document.getElementById('fps-counter');
            if (fpsCounter) {
                fpsCounter.textContent = `FPS: ${this.currentFPS}`;
            }
        }
    }
    
    handleTouchGesture(type, data) {
        switch (type) {
            case 'doubletap':
                // Quick pause/resume
                this.togglePause();
                break;
            case 'swipe':
                // Swipe gestures for special actions
                if (data.direction === 'up' && this.currentTarget) {
                    // Skip current target (penalty)
                    this.targetMissed();
                }
                break;
        }
    }
    
    handlePoseGesture(gestureData) {
        // Handle pose-based game interactions
        console.log('Pose gesture detected:', gestureData);
    }
    
    dispose() {
        this.isRunning = false;
        this.isPaused = false;
        
        // Clear game objects
        this.targets = [];
        this.particles = [];
        this.animations = [];
        
        // Remove event listeners would go here
    }
}

export default GameEngine;