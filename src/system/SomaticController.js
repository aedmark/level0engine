// SomaticController.js
// LEVEL 0 ENVIRONMENTAL SOMATICS

/**
 * A centralized event bus listener for all physical ("somatic") events in the game world.
 * 
 * Instead of passing the `acoustics` engine into every single door, entity,
 * or player script, we use a global event bus (`document.dispatchEvent`). The SomaticController 
 * listens for these events and routes them to the audio or UI systems. This decoupled architecture 
 * prevents circular dependencies and makes adding new sounds trivial.
 */
export default class SomaticController {
    constructor(acoustics) {
        this.acoustics = acoustics;
    }

    /**
     * Binds all global somatic event listeners to the DOM.
     * 
     * Browsers require a user interaction (like a click or keypress) before
     * allowing audio to play. We attach a one-time `{once: true}` listener to the first click/key 
     * to "boot" the Web Audio API context.
     */
    bindEvents() {
        const bootAudio = () => this.acoustics.init();
        document.addEventListener('click', bootAudio, {once: true});
        document.addEventListener('keydown', bootAudio, {once: true});
        
        document.addEventListener('somatic-step', (e) => this.acoustics.triggerSomaticEvent('step', 0, e.detail.intensity));
        document.addEventListener('somatic-shuffle', (e) => this.acoustics.triggerSomaticEvent('shuffle', 0, e.detail.intensity));
        document.addEventListener('somatic-door', (e) => this.acoustics.triggerSomaticEvent(e.detail.variant === 'blast' ? 'blastdoor' : 'door', e.detail.distSq, e.detail.intensity));
        document.addEventListener('somatic-airlock', (e) => this.acoustics.triggerSomaticEvent('airlock_cycle', e.detail.distSq, e.detail.intensity));
        document.addEventListener('somatic-airlock-hiss', (e) => this.acoustics.triggerSomaticEvent('airlock_hiss', e.detail.distSq, e.detail.intensity));
        document.addEventListener('somatic-valve', (e) => this.acoustics.triggerSomaticEvent('valve_turn', e.detail.distSq, e.detail.intensity));
        document.addEventListener('somatic-vent', (e) => this.acoustics.triggerSomaticEvent('vent', e.detail.distSq, e.detail.intensity));
        document.addEventListener('somatic-lost', (e) => this.acoustics.triggerSomaticEvent(e.detail.isLaugh ? 'laugh' : 'whisper', e.detail.distSq, e.detail.intensity));
        
        document.addEventListener('somatic-blink', () => {
            const flash = document.getElementById('flash-overlay');
            if (flash && flash.style.opacity !== '0.98') {
                flash.style.transition = 'none';
                flash.style.backgroundColor = '#000';
                flash.style.opacity = '1';
                setTimeout(() => {
                    flash.style.transition = 'opacity 0.15s ease-out';
                    flash.style.opacity = '0';
                }, 150);
            }
        });
        
        document.addEventListener('somatic-eyes', (e) => {
            const flash = document.getElementById('flash-overlay');
            if (flash) {
                if (e.detail.closed) {
                    flash.style.transition = 'opacity 0.2s ease-in';
                    flash.style.backgroundColor = '#000';
                    flash.style.opacity = '0.98';
                } else {
                    flash.style.transition = 'opacity 0.3s ease-out';
                    flash.style.opacity = '0';
                }
            }
        });
        
        document.addEventListener('somatic-breaker', (e) => this.acoustics.triggerSomaticEvent('breaker', e.detail.distSq, e.detail.intensity));
        document.addEventListener('somatic-item', (e) => this.acoustics.triggerSomaticEvent('item', e.detail.distSq, e.detail.intensity));
    }
}
