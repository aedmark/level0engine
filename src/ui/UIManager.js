/**
 * Handles updating the DOM-based heads-up display (HUD).
 *
 *  While Three.js can render UI in 3D (WebGL), it is almost always better
 * for performance and accessibility to overlay standard HTML/CSS elements on top of the canvas.
 * This class maps the player's internal state (stamina, battery, coherence) to those HTML elements.
 */
export default class UIManager {
    /**
     * Ticks the UI logic, updating progress bars and counters.
     *
     * DOM updates are notoriously slow. To prevent the UI from bottlenecking
     * the 60FPS WebGL render loop, we aggressively throttle DOM updates. We only tick the UI
     * 10 times a second (`< 0.1` return), and we cache the last written values (`_last`) so we
     * never write to `innerHTML` or `style` unless the value actually changed.
     *
     * @param {number} time - Total elapsed time.
     * @param {Object} engine - The core engine instance.
     * @param {Object} player - The player controller instance.
     * @param {Object} environment - The environment instance.
     */
    static update(time, engine, player, environment) {
        if (time - (this._lastUpdate || 0) < 0.1) return;
        this._lastUpdate = time;
        if (!this.coordsEl) this.coordsEl = document.getElementById('coords');
        if (!this.batLevel) this.batLevel = document.getElementById('battery-level');
        if (!this.stamLevel) this.stamLevel = document.getElementById('stamina-level');
        if (!this.invBat) this.invBat = document.getElementById('inv-bat');
        if (!this.invH2o) this.invH2o = document.getElementById('inv-h2o');
        if (this.coordsEl) {
            const cohInt = Math.round((player.coherence !== undefined ? player.coherence : 1.0) * 100);
            const newCoords = `X: ${engine.camera.position.x.toFixed(1)} | Z: ${engine.camera.position.z.toFixed(1)} | COH: ${cohInt.toString().padStart(2, '0')}%`;
            if (this.coordsEl._last !== newCoords) {
                this.coordsEl.innerText = newCoords;
                if (cohInt < 20) this.coordsEl.style.color = '#ff5555';
                else if (cohInt < 50) this.coordsEl.style.color = '#ffaa55';
                else this.coordsEl.style.color = '';
                this.coordsEl._last = newCoords;
            }
        }
        if (!this.crosshair) this.crosshair = document.getElementById('crosshair');
        if (this.crosshair && environment) {
            const active = environment.isLookingAtInteractable === true;
            if (this.crosshair._lastActive !== active) {
                this.crosshair.classList.toggle('active-interact', active);
                this.crosshair._lastActive = active;
            }
        }
        if (!this.scanRing) {
            this.scanRing = document.getElementById('scan-ring');
            this.scanLabel = document.getElementById('scan-label');
        }
        if (this.scanRing && environment) {
            const scan = environment.breakerScan;
            // Quantised to whole percent. The ring is a conic gradient, so writing the custom property
            // dirties a paint every time it changes; sub-percent precision would buy nothing visible
            // and cost a repaint on every single frame of every scan.
            const pct = scan ? Math.round(scan.t * 100) : -1;
            if (this.scanRing._lastPct !== pct) {
                const live = pct >= 0;
                if (live) this.scanRing.style.setProperty('--scan', (pct / 100).toFixed(2));
                this.scanRing.classList.toggle('scanning', live);
                if (this.scanLabel) this.scanLabel.classList.toggle('scanning', live);
                if (this.crosshair) this.crosshair.classList.toggle('scanning', live);
                this.scanRing._lastPct = pct;
            }
        }
        if (this.batLevel) {
            const batInt = Math.round(player.flashlightBattery);
            if (this.batLevel._last !== batInt) {
                this.batLevel.style.width = `${batInt}%`;
                this.batLevel.style.backgroundColor = batInt > 50 ? '#55ff55' : (batInt > 20 ? '#ffff55' : '#ff5555');
                this.batLevel._last = batInt;
            }
        }
        if (!this.batTension) this.batTension = document.getElementById('battery-tension');
        if (this.batTension) {
            const lost = Math.round(player.linguisticDarkMatter || 0);
            if (this.batTension._last !== lost) {
                this.batTension.style.width = `${lost}%`;
                this.batTension._last = lost;
            }
        }
        if (this.stamLevel) {
            const stamInt = Math.round(player.stamina);
            if (this.stamLevel._last !== stamInt) {
                this.stamLevel.style.width = `${stamInt}%`;
                this.stamLevel.style.backgroundColor = stamInt > 50 ? '#ffffff' : (stamInt > 20 ? '#aaaaaa' : '#ff5555');
                this.stamLevel._last = stamInt;
            }
        }
        if (this.invBat && this.invH2o) {
            if (this.invBat._last !== player.inventory.batteries) {
                this.invBat.innerText = player.inventory.batteries;
                this.invBat.style.color = player.inventory.batteries === 0 ? '#ff5555' : '';
                this.invBat._last = player.inventory.batteries;
            }
            if (this.invH2o._last !== player.inventory.almondWater) {
                this.invH2o.innerText = player.inventory.almondWater;
                this.invH2o.style.color = player.inventory.almondWater === 0 ? '#ff5555' : '';
                this.invH2o._last = player.inventory.almondWater;
            }
        }
    }

    static updateVHSTime() {
        const now = new Date();
        const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        const month = months[now.getMonth()];
        const day = String(now.getDate()).padStart(2, '0');
        const year = now.getFullYear();
        let hours = now.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const mins = String(now.getMinutes()).padStart(2, '0');
        const secs = String(now.getSeconds()).padStart(2, '0');
        const vhsTimeDisplay = document.getElementById('vhs-time');
        if (vhsTimeDisplay) {
            vhsTimeDisplay.innerHTML = `${ampm} ${String(hours).padStart(2, '0')}:${mins}:${secs}<br>${month} ${day} ${year}`;
        }
    }

    static startVHSTimer() {
        setInterval(this.updateVHSTime, 1000);
        this.updateVHSTime();
    }
}