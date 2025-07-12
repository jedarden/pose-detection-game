/**
 * Touch Handler - Mobile gesture recognition and touch optimization
 * Handles touch events, gestures, and haptic feedback
 */

export class TouchHandler {
    constructor(mobileOptimizer) {
        this.mobileOptimizer = mobileOptimizer;
        this.gestures = new Map();
        this.activePointers = new Map();
        this.lastTap = 0;
        this.doubleTapThreshold = 300; // ms
        this.longPressThreshold = 500; // ms
        this.swipeThreshold = 100; // pixels
        this.hapticEnabled = true;
        
        // Gesture recognition state
        this.isLongPressing = false;
        this.longPressTimer = null;
        this.isPinching = false;
        this.lastPinchDistance = 0;
        
        this.setupEventListeners();
        this.optimizeTouch();
    }
    
    setupEventListeners() {
        // Use passive listeners for better performance
        const options = { passive: false };
        
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), options);
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), options);
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), options);
        document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), options);
        
        // Handle orientation changes
        window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
        
        // Handle device motion for gesture detection
        if (window.DeviceMotionEvent) {
            window.addEventListener('devicemotion', this.handleDeviceMotion.bind(this));
        }
        
        // Prevent context menu on long press
        document.addEventListener('contextmenu', (e) => {
            if (this.mobileOptimizer.deviceProfile.isMobile) {
                e.preventDefault();
            }
        });
    }
    
    optimizeTouch() {
        // Disable touch delays for better responsiveness
        document.documentElement.style.touchAction = 'pan-x pan-y';
        document.body.style.touchAction = 'manipulation';
        
        // Optimize scrolling
        document.body.style.overscrollBehavior = 'none';
        
        // Disable iOS Safari bounce effect
        document.addEventListener('touchmove', (e) => {
            if (e.target === document.body) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Optimize button interactions
        this.optimizeButtons();
    }
    
    optimizeButtons() {
        const buttons = document.querySelectorAll('.control-btn, button');
        
        buttons.forEach(button => {
            // Add touch feedback
            button.addEventListener('touchstart', (e) => {
                button.classList.add('touch-active');
                this.vibrate([10]); // Short haptic feedback
            }, { passive: true });
            
            button.addEventListener('touchend', (e) => {
                button.classList.remove('touch-active');
            }, { passive: true });
            
            // Prevent double-tap zoom on buttons
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
            });
        });
    }
    
    handleTouchStart(event) {
        event.preventDefault(); // Prevent scrolling
        
        const touches = event.changedTouches;
        
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            const pointer = {
                id: touch.identifier,
                startX: touch.clientX,
                startY: touch.clientY,
                currentX: touch.clientX,
                currentY: touch.clientY,
                startTime: performance.now(),
                element: document.elementFromPoint(touch.clientX, touch.clientY)
            };
            
            this.activePointers.set(touch.identifier, pointer);
        }
        
        // Detect gesture type
        if (this.activePointers.size === 1) {
            this.handleSingleTouch(event);
        } else if (this.activePointers.size === 2) {
            this.handleMultiTouch(event);
        }
    }
    
    handleTouchMove(event) {
        event.preventDefault();
        
        const touches = event.changedTouches;
        
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            const pointer = this.activePointers.get(touch.identifier);
            
            if (pointer) {
                pointer.currentX = touch.clientX;
                pointer.currentY = touch.clientY;
                
                // Cancel long press if moved too much
                const distance = this.getDistance(
                    pointer.startX, pointer.startY,
                    pointer.currentX, pointer.currentY
                );
                
                if (distance > 20 && this.isLongPressing) {
                    this.cancelLongPress();
                }
            }
        }
        
        // Handle multi-touch gestures
        if (this.activePointers.size === 2) {
            this.handlePinchGesture();
        }
    }
    
    handleTouchEnd(event) {
        const touches = event.changedTouches;
        
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            const pointer = this.activePointers.get(touch.identifier);
            
            if (pointer) {
                const duration = performance.now() - pointer.startTime;
                const distance = this.getDistance(
                    pointer.startX, pointer.startY,
                    pointer.currentX, pointer.currentY
                );
                
                // Determine gesture type
                if (duration < this.longPressThreshold && distance < 20) {
                    this.handleTap(pointer, event);
                } else if (distance > this.swipeThreshold) {
                    this.handleSwipe(pointer, event);
                }
                
                this.activePointers.delete(touch.identifier);
            }
        }
        
        // Reset multi-touch state
        if (this.activePointers.size < 2) {
            this.isPinching = false;
        }
        
        this.cancelLongPress();
    }
    
    handleTouchCancel(event) {
        this.activePointers.clear();
        this.isPinching = false;
        this.cancelLongPress();
    }
    
    handleSingleTouch(event) {
        const touch = event.touches[0];
        const pointer = this.activePointers.get(touch.identifier);
        
        if (!pointer) return;
        
        // Start long press timer
        this.isLongPressing = true;
        this.longPressTimer = setTimeout(() => {
            if (this.isLongPressing) {
                this.handleLongPress(pointer, event);
            }
        }, this.longPressThreshold);
    }
    
    handleMultiTouch(event) {
        if (event.touches.length >= 2) {
            this.isPinching = true;
            this.handlePinchGesture();
        }
    }
    
    handleTap(pointer, event) {
        const now = performance.now();
        const timeSinceLastTap = now - this.lastTap;
        
        if (timeSinceLastTap < this.doubleTapThreshold) {
            // Double tap
            this.dispatchGesture('doubletap', {
                x: pointer.currentX,
                y: pointer.currentY,
                element: pointer.element
            });
            this.vibrate([10, 50, 10]); // Double haptic feedback
        } else {
            // Single tap
            this.dispatchGesture('tap', {
                x: pointer.currentX,
                y: pointer.currentY,
                element: pointer.element
            });
            this.vibrate([10]); // Single haptic feedback
        }
        
        this.lastTap = now;
    }
    
    handleLongPress(pointer, event) {
        this.dispatchGesture('longpress', {
            x: pointer.currentX,
            y: pointer.currentY,
            element: pointer.element
        });
        this.vibrate([20, 50, 20]); // Long haptic feedback
        this.isLongPressing = false;
    }
    
    handleSwipe(pointer, event) {
        const deltaX = pointer.currentX - pointer.startX;
        const deltaY = pointer.currentY - pointer.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
        
        let direction;
        if (Math.abs(angle) < 45) {
            direction = 'right';
        } else if (angle > 45 && angle < 135) {
            direction = 'down';
        } else if (Math.abs(angle) > 135) {
            direction = 'left';
        } else {
            direction = 'up';
        }
        
        this.dispatchGesture('swipe', {
            direction: direction,
            distance: distance,
            angle: angle,
            deltaX: deltaX,
            deltaY: deltaY,
            startX: pointer.startX,
            startY: pointer.startY,
            endX: pointer.currentX,
            endY: pointer.currentY
        });
        
        this.vibrate([15]); // Swipe haptic feedback
    }
    
    handlePinchGesture() {
        const pointers = Array.from(this.activePointers.values());
        if (pointers.length < 2) return;
        
        const distance = this.getDistance(
            pointers[0].currentX, pointers[0].currentY,
            pointers[1].currentX, pointers[1].currentY
        );
        
        if (this.lastPinchDistance > 0) {
            const scale = distance / this.lastPinchDistance;
            
            this.dispatchGesture('pinch', {
                scale: scale,
                distance: distance,
                centerX: (pointers[0].currentX + pointers[1].currentX) / 2,
                centerY: (pointers[0].currentY + pointers[1].currentY) / 2
            });
        }
        
        this.lastPinchDistance = distance;
    }
    
    handleOrientationChange() {
        // Reset gesture state on orientation change
        this.activePointers.clear();
        this.isPinching = false;
        this.cancelLongPress();
        
        // Notify about orientation change
        setTimeout(() => {
            const orientation = this.mobileOptimizer.getOrientation();
            this.dispatchGesture('orientationchange', {
                orientation: orientation
            });
        }, 100); // Small delay to let orientation settle
    }
    
    handleDeviceMotion(event) {
        // Detect shake gesture
        const acceleration = event.accelerationIncludingGravity;
        
        if (acceleration) {
            const totalAcceleration = Math.sqrt(
                acceleration.x * acceleration.x +
                acceleration.y * acceleration.y +
                acceleration.z * acceleration.z
            );
            
            // Threshold for shake detection
            if (totalAcceleration > 20) {
                this.dispatchGesture('shake', {
                    acceleration: totalAcceleration,
                    x: acceleration.x,
                    y: acceleration.y,
                    z: acceleration.z
                });
                this.vibrate([50, 100, 50]); // Shake haptic feedback
            }
        }
    }
    
    cancelLongPress() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        this.isLongPressing = false;
    }
    
    getDistance(x1, y1, x2, y2) {
        const deltaX = x2 - x1;
        const deltaY = y2 - y1;
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }
    
    dispatchGesture(type, data) {
        const gestureEvent = new CustomEvent(`gesture:${type}`, {
            detail: {
                type: type,
                timestamp: performance.now(),
                ...data
            }
        });
        
        document.dispatchEvent(gestureEvent);
        
        // Also dispatch to specific element if available
        if (data.element) {
            data.element.dispatchEvent(gestureEvent);
        }
    }
    
    vibrate(pattern) {
        if (this.hapticEnabled && navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }
    
    setHapticEnabled(enabled) {
        this.hapticEnabled = enabled;
    }
    
    // Game-specific gesture recognition
    recognizeGameGestures(pose) {
        if (!pose || !pose.keypoints) return [];
        
        const gestures = [];
        
        // Extract key points
        const keypoints = {};
        pose.keypoints.forEach(kp => {
            keypoints[kp.name] = kp;
        });
        
        // Jump gesture - both hands raised
        if (this.isHandRaised(keypoints.left_wrist, keypoints.left_shoulder) &&
            this.isHandRaised(keypoints.right_wrist, keypoints.right_shoulder)) {
            gestures.push({
                type: 'jump',
                confidence: Math.min(keypoints.left_wrist?.score || 0, keypoints.right_wrist?.score || 0)
            });
        }
        
        // Duck gesture - low body position
        if (this.isDucking(keypoints)) {
            gestures.push({
                type: 'duck',
                confidence: keypoints.nose?.score || 0
            });
        }
        
        // Wave gesture - single hand raised
        if (this.isHandRaised(keypoints.right_wrist, keypoints.right_shoulder) &&
            !this.isHandRaised(keypoints.left_wrist, keypoints.left_shoulder)) {
            gestures.push({
                type: 'wave_right',
                confidence: keypoints.right_wrist?.score || 0
            });
        }
        
        return gestures;
    }
    
    isHandRaised(wrist, shoulder) {
        if (!wrist || !shoulder || wrist.score < 0.3 || shoulder.score < 0.3) {
            return false;
        }
        return wrist.y < shoulder.y - 50; // Hand is significantly above shoulder
    }
    
    isDucking(keypoints) {
        const nose = keypoints.nose;
        const leftHip = keypoints.left_hip;
        const rightHip = keypoints.right_hip;
        
        if (!nose || !leftHip || !rightHip) return false;
        
        const avgHipY = (leftHip.y + rightHip.y) / 2;
        const noseToHipDistance = Math.abs(nose.y - avgHipY);
        
        // Ducking if nose is close to hip level
        return noseToHipDistance < 100 && nose.score > 0.3;
    }
    
    // Add custom gesture recognition
    addCustomGesture(name, recognitionFunction) {
        this.gestures.set(name, recognitionFunction);
    }
    
    removeCustomGesture(name) {
        this.gestures.delete(name);
    }
    
    // Touch area helpers for UI
    createTouchArea(element, gestureTypes = ['tap']) {
        const touchArea = {
            element: element,
            gestures: gestureTypes,
            active: true
        };
        
        gestureTypes.forEach(gestureType => {
            element.addEventListener(`gesture:${gestureType}`, (event) => {
                if (touchArea.active) {
                    element.dispatchEvent(new CustomEvent(`gamegesture:${gestureType}`, {
                        detail: event.detail
                    }));
                }
            });
        });
        
        return touchArea;
    }
    
    // Cleanup
    dispose() {
        document.removeEventListener('touchstart', this.handleTouchStart.bind(this));
        document.removeEventListener('touchmove', this.handleTouchMove.bind(this));
        document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
        document.removeEventListener('touchcancel', this.handleTouchCancel.bind(this));
        window.removeEventListener('orientationchange', this.handleOrientationChange.bind(this));
        
        if (window.DeviceMotionEvent) {
            window.removeEventListener('devicemotion', this.handleDeviceMotion.bind(this));
        }
        
        this.cancelLongPress();
        this.activePointers.clear();
        this.gestures.clear();
    }
}

export default TouchHandler;