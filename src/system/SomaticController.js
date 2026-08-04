/**
 * [ROLE] Central dispatcher for game events (audio/visual feedback).
 * [WHY] Maps custom somatic-* events to acoustic engine triggers and UI flashes.
 * [STATE] Stateless event binder.
 * [DEPENDS] Acoustics subsystem, DOM events, DOM elements (flash-overlay).
 */
export default class SomaticController {
    constructor(acoustics) {
        this.acoustics = acoustics;
    }

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
        document.addEventListener('somatic-scan-start', (e) => this.acoustics.triggerSomaticEvent('item', e.detail.distSq, e.detail.intensity));
        document.addEventListener('somatic-item', (e) => this.acoustics.triggerSomaticEvent('item', e.detail.distSq, e.detail.intensity));
    }
}