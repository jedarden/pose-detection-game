# Visual Feedback Systems

## Overview
Visual feedback is crucial for a pose-based timing game without audio cues. Every action must have clear, immediate, and satisfying visual responses.

## Feedback Categories

### 1. Anticipatory Feedback (Pre-Hit)

#### Approach Visualizers
```javascript
class ApproachVisualizer {
    constructor() {
        this.effects = {
            tunnel: new TunnelEffect(),
            ripple: new RippleEffect(),
            particles: new ParticleStream(),
            ghost: new GhostPose()
        };
    }
    
    renderApproach(target, currentTime) {
        const timeToHit = target.hitTime - currentTime;
        const progress = 1 - (timeToHit / target.approachTime);
        
        // Layer multiple effects
        this.effects.tunnel.render(progress, target.lane);
        this.effects.ripple.render(progress, target.position);
        
        if (progress > 0.5) {
            this.effects.particles.render(progress, target);
        }
        
        if (progress > 0.8) {
            this.effects.ghost.render(target.pose, progress);
        }
    }
}

class TunnelEffect {
    render(progress, lane) {
        const segments = 20;
        const baseRadius = 100;
        
        for (let i = 0; i < segments; i++) {
            const segmentProgress = (i / segments) * progress;
            const radius = baseRadius * (1 - segmentProgress);
            const opacity = Math.pow(segmentProgress, 2);
            const color = this.getSegmentColor(segmentProgress);
            
            drawCircle({
                center: lane.position,
                radius,
                opacity,
                color,
                strokeWidth: 2 + segmentProgress * 3
            });
        }
    }
}
```

#### Pose Silhouettes
```javascript
class PoseSilhouette {
    constructor() {
        this.silhouetteShader = `
            uniform float progress;
            uniform vec3 targetColor;
            uniform float glowIntensity;
            
            void main() {
                vec4 silhouette = texture2D(poseTexture, vUv);
                
                // Edge detection for outline
                float edge = length(fwidth(silhouette.a));
                
                // Animated fill
                float fill = smoothstep(0.0, progress, vUv.y);
                
                // Glow effect
                float glow = exp(-edge * 3.0) * glowIntensity;
                
                vec3 color = mix(targetColor * 0.3, targetColor, fill);
                color += vec3(glow);
                
                gl_FragColor = vec4(color, silhouette.a * (0.3 + progress * 0.7));
            }
        `;
    }
    
    render(targetPose, progress) {
        const color = this.getProgressColor(progress);
        const glowIntensity = this.getGlowIntensity(progress);
        
        renderSilhouette({
            pose: targetPose,
            shader: this.silhouetteShader,
            uniforms: {
                progress,
                targetColor: color,
                glowIntensity
            }
        });
    }
}
```

### 2. Impact Feedback (On-Hit)

#### Hit Effects System
```javascript
class HitEffectSystem {
    constructor() {
        this.effectPool = new ObjectPool(HitEffect, 100);
        this.activeEffects = [];
    }
    
    triggerHit(position, rating, pose) {
        const effect = this.effectPool.get();
        effect.init({
            position,
            rating,
            pose,
            startTime: performance.now()
        });
        
        this.activeEffects.push(effect);
        
        // Trigger rating-specific effects
        this[`trigger${rating}Effects`](position, pose);
    }
    
    triggerPerfectEffects(position, pose) {
        // Rainbow burst
        this.spawnParticleBurst({
            position,
            count: 100,
            speed: 500,
            colors: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff'],
            lifetime: 1000,
            gravity: -200
        });
        
        // Shockwave
        this.spawnShockwave({
            position,
            radius: 300,
            speed: 800,
            color: '#ffffff',
            thickness: 5
        });
        
        // Screen effects
        this.screenFlash('#ffffff', 0.8, 100);
        this.screenShake(10, 200);
        
        // Pose outline explosion
        this.spawnPoseExplosion(pose, '#ffff00');
    }
    
    triggerGreatEffects(position, pose) {
        // Standard burst
        this.spawnParticleBurst({
            position,
            count: 50,
            speed: 300,
            colors: ['#00ff00', '#00dd00'],
            lifetime: 800
        });
        
        // Soft glow
        this.spawnGlow({
            position,
            radius: 200,
            color: '#00ff00',
            fadeTime: 500
        });
    }
}
```

#### Particle Systems
```javascript
class ParticleSystem {
    constructor(maxParticles = 1000) {
        this.particles = new Float32Array(maxParticles * PARTICLE_SIZE);
        this.activeCount = 0;
        this.maxParticles = maxParticles;
    }
    
    emit(config) {
        const {
            position,
            count,
            velocity,
            acceleration,
            lifetime,
            size,
            color,
            behavior
        } = config;
        
        for (let i = 0; i < count && this.activeCount < this.maxParticles; i++) {
            const index = this.activeCount * PARTICLE_SIZE;
            
            // Position
            this.particles[index] = position.x + (Math.random() - 0.5) * 20;
            this.particles[index + 1] = position.y + (Math.random() - 0.5) * 20;
            this.particles[index + 2] = position.z || 0;
            
            // Velocity
            const angle = Math.random() * Math.PI * 2;
            const speed = velocity.base + Math.random() * velocity.variance;
            this.particles[index + 3] = Math.cos(angle) * speed;
            this.particles[index + 4] = Math.sin(angle) * speed;
            this.particles[index + 5] = (Math.random() - 0.5) * speed * 0.5;
            
            // Properties
            this.particles[index + 6] = lifetime;
            this.particles[index + 7] = size;
            this.particles[index + 8] = color.r;
            this.particles[index + 9] = color.g;
            this.particles[index + 10] = color.b;
            this.particles[index + 11] = behavior;
            
            this.activeCount++;
        }
    }
}
```

### 3. Continuous Feedback

#### Combo Visualizers
```javascript
class ComboVisualizer {
    constructor() {
        this.currentCombo = 0;
        this.comboEffects = [];
        this.auraSystem = new AuraSystem();
    }
    
    updateCombo(newCombo) {
        if (newCombo > this.currentCombo) {
            this.triggerComboIncrement(newCombo);
        } else if (newCombo === 0 && this.currentCombo > 0) {
            this.triggerComboBreak();
        }
        
        this.currentCombo = newCombo;
        this.updateVisuals();
    }
    
    updateVisuals() {
        // Combo counter styling
        const counterStyle = this.getComboStyle(this.currentCombo);
        
        // Player aura
        if (this.currentCombo >= 10) {
            this.auraSystem.setIntensity(this.getAuraIntensity());
            this.auraSystem.setColor(this.getAuraColor());
        }
        
        // Environmental effects
        this.updateEnvironment();
    }
    
    getComboStyle(combo) {
        if (combo === 0) return { scale: 1, color: '#ffffff', glow: 0 };
        if (combo < 10) return { scale: 1.2, color: '#ffff00', glow: 0.3 };
        if (combo < 25) return { scale: 1.5, color: '#ff9900', glow: 0.5 };
        if (combo < 50) return { scale: 2.0, color: '#ff0099', glow: 0.8 };
        return { scale: 2.5, color: '#ff00ff', glow: 1.0, rainbow: true };
    }
}

class AuraSystem {
    render(player, intensity, color) {
        const jointPositions = player.getJointPositions();
        
        // Create energy field around player
        this.renderEnergyField(jointPositions, intensity);
        
        // Particle trails from joints
        this.renderJointTrails(jointPositions, color);
        
        // Lightning between joints
        if (intensity > 0.7) {
            this.renderLightning(jointPositions, color);
        }
    }
    
    renderEnergyField(joints, intensity) {
        const fieldShader = `
            uniform float time;
            uniform float intensity;
            uniform vec3 jointPositions[17];
            
            float getFieldStrength(vec3 pos) {
                float strength = 0.0;
                for (int i = 0; i < 17; i++) {
                    float dist = distance(pos, jointPositions[i]);
                    strength += 1.0 / (1.0 + dist * dist * 0.1);
                }
                return strength * intensity;
            }
            
            void main() {
                vec3 pos = vPosition;
                float field = getFieldStrength(pos);
                
                // Animated distortion
                field += sin(time * 3.0 + pos.x * 10.0) * 0.1 * intensity;
                field += cos(time * 2.0 + pos.y * 8.0) * 0.1 * intensity;
                
                vec3 color = mix(vec3(0.0), vColor, field);
                float alpha = smoothstep(0.2, 0.8, field);
                
                gl_FragColor = vec4(color, alpha);
            }
        `;
    }
}
```

### 4. Performance Indicators

#### Real-time Accuracy Meter
```javascript
class AccuracyMeter {
    constructor() {
        this.history = [];
        this.maxHistory = 50;
        this.smoothedAccuracy = 0;
    }
    
    update(accuracy) {
        this.history.push(accuracy);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        
        // Smooth the display
        const targetAccuracy = average(this.history);
        this.smoothedAccuracy = lerp(
            this.smoothedAccuracy, 
            targetAccuracy, 
            0.1
        );
    }
    
    render() {
        const meterWidth = 200;
        const meterHeight = 20;
        
        // Background
        drawRect({
            x: 10,
            y: 10,
            width: meterWidth,
            height: meterHeight,
            color: '#333333',
            opacity: 0.8
        });
        
        // Accuracy zones
        const zones = [
            { threshold: 0.9, color: '#00ff00', label: 'Perfect' },
            { threshold: 0.7, color: '#ffff00', label: 'Good' },
            { threshold: 0.5, color: '#ff9900', label: 'OK' },
            { threshold: 0, color: '#ff0000', label: 'Poor' }
        ];
        
        // Current accuracy bar
        const fillWidth = meterWidth * this.smoothedAccuracy;
        const fillColor = this.getAccuracyColor(this.smoothedAccuracy);
        
        drawRect({
            x: 10,
            y: 10,
            width: fillWidth,
            height: meterHeight,
            color: fillColor,
            opacity: 1
        });
        
        // Animated pulse on high accuracy
        if (this.smoothedAccuracy > 0.9) {
            this.renderPulse(fillWidth);
        }
    }
}
```

#### Score Popups
```javascript
class ScorePopup {
    constructor() {
        this.activePopups = [];
        this.popupPool = new ObjectPool(Popup, 50);
    }
    
    spawn(score, position, rating) {
        const popup = this.popupPool.get();
        
        popup.init({
            text: this.formatScore(score),
            position,
            style: this.getPopupStyle(rating),
            animation: this.getPopupAnimation(rating)
        });
        
        this.activePopups.push(popup);
    }
    
    getPopupStyle(rating) {
        const styles = {
            perfect: {
                fontSize: 48,
                color: '#ffff00',
                strokeColor: '#ff00ff',
                strokeWidth: 3,
                glow: 20,
                font: 'bold'
            },
            great: {
                fontSize: 36,
                color: '#00ff00',
                strokeColor: '#008800',
                strokeWidth: 2,
                glow: 10
            },
            good: {
                fontSize: 28,
                color: '#ffffff',
                strokeColor: '#666666',
                strokeWidth: 1,
                glow: 5
            },
            ok: {
                fontSize: 24,
                color: '#999999',
                strokeColor: '#333333',
                strokeWidth: 1,
                glow: 0
            }
        };
        
        return styles[rating] || styles.ok;
    }
    
    getPopupAnimation(rating) {
        if (rating === 'perfect') {
            return {
                type: 'spiral',
                duration: 1500,
                height: 150,
                rotation: 720,
                scale: { from: 0.5, to: 1.5 }
            };
        }
        
        return {
            type: 'float',
            duration: 1000,
            height: 80,
            rotation: 0,
            scale: { from: 1, to: 1 }
        };
    }
}
```

### 5. Environmental Feedback

#### Dynamic Backgrounds
```javascript
class DynamicBackground {
    constructor() {
        this.layers = [
            new ParallaxLayer({ depth: 0.2, speed: 0.5 }),
            new ParallaxLayer({ depth: 0.5, speed: 1.0 }),
            new ParallaxLayer({ depth: 1.0, speed: 2.0 })
        ];
        
        this.intensity = 0;
        this.colorShift = 0;
    }
    
    updateWithPerformance(accuracy, combo) {
        // Intensity based on performance
        this.intensity = accuracy * (1 + combo * 0.01);
        
        // Color shift based on combo
        this.colorShift = (combo / 100) * 360;
        
        // Update layer behaviors
        this.layers.forEach((layer, index) => {
            layer.setIntensity(this.intensity);
            layer.setColorShift(this.colorShift);
            layer.setSpeed(1 + combo * 0.02);
        });
    }
    
    render() {
        // Render from back to front
        this.layers.forEach(layer => layer.render());
        
        // Performance-based effects
        if (this.intensity > 0.8) {
            this.renderEnergyGrid();
        }
        
        if (this.colorShift > 180) {
            this.renderColorWaves();
        }
    }
}
```

### 6. Feedback Accessibility

#### Visual Clarity Options
```javascript
class AccessibilityOptions {
    constructor() {
        this.settings = {
            highContrast: false,
            reducedMotion: false,
            colorBlindMode: 'none',
            extraVisualCues: false,
            fontSize: 1.0
        };
    }
    
    applyToEffect(effect) {
        if (this.settings.highContrast) {
            effect.colors = this.adjustForHighContrast(effect.colors);
            effect.opacity = Math.min(effect.opacity * 1.5, 1);
        }
        
        if (this.settings.reducedMotion) {
            effect.animationSpeed *= 0.5;
            effect.particleCount *= 0.5;
        }
        
        if (this.settings.colorBlindMode !== 'none') {
            effect.colors = this.adjustForColorBlind(
                effect.colors, 
                this.settings.colorBlindMode
            );
        }
        
        if (this.settings.extraVisualCues) {
            effect.addExtraCues();
        }
        
        return effect;
    }
}
```