import SaveManager from '../system/SaveManager.js';
import {runSeed} from '../system/SeedLink.js';

export default class ContinuePrompt {
    // linkSeed: the seed the page was opened with (?seed=), or null. A link to a different run than
    // the save must not silently resume the save, and New Game must keep the link's seed (P5-03).
    static async resolve(linkSeed = null) {
        let hasSave = false;
        let savedSeed = null;
        try {
            const raw = localStorage.getItem('level0_state');
            const parsed = raw ? JSON.parse(raw) : null;
            hasSave = !!parsed && typeof parsed === 'object';
            savedSeed = hasSave ? parsed.seed : null;
        } catch (e) {
            hasSave = false;
        }
        if (!hasSave) return;
        const linkDiffers = !!linkSeed && runSeed(savedSeed) !== linkSeed;

        const overlay = document.getElementById('continue-check-overlay');
        const continueBtn = document.getElementById('continueGameBtn');
        const newGameBtn = document.getElementById('newGameBtn');
        if (!overlay || !continueBtn || !newGameBtn) return;

        if (linkDiffers) {
            const text = document.getElementById('continue-check-text');
            // textContent, not innerHTML: the seed comes from the URL.
            if (text) text.textContent = `This link opens seed ${linkSeed}, but a different session is saved in local memory. Resume the saved session, or wipe it and start the linked seed? Starting clears all saved progress and cached assets.`;
            newGameBtn.textContent = 'PURGE & START LINKED SEED';
        }
        overlay.style.display = 'flex';

        await new Promise((resolve) => {
            const cleanup = () => {
                continueBtn.removeEventListener('click', onContinue);
                newGameBtn.removeEventListener('click', onNewGame);
            };
            const onContinue = () => {
                cleanup();
                overlay.style.display = 'none';
                if (linkSeed) {
                    // The save wins; drop ?seed so a reload resumes it instead of asking again.
                    for (const win of new Set([window, window.top])) {
                        try {
                            const url = new URL(win.location.href);
                            url.searchParams.delete('seed');
                            win.history.replaceState(null, '', url.toString());
                        } catch (e) {
                            // A cross-origin embedder (an itch.io page) cannot be touched; the frame is enough.
                        }
                    }
                }
                resolve();
            };
            const onNewGame = async () => {
                continueBtn.disabled = true;
                newGameBtn.disabled = true;
                newGameBtn.textContent = 'PURGING MEMORY...';
                const flash = document.getElementById('flash-overlay');
                if (flash) {
                    flash.style.transition = 'none';
                    flash.style.backgroundColor = '#8a3333';
                    flash.style.opacity = '1';
                }
                try {
                    await SaveManager.purgeAllStorage();
                } catch (e) {
                    console.error('New Game purge failed:', e);
                }
                const seedInput = document.getElementById('seedInput');
                if (seedInput) seedInput.value = '';
                // Keep ?seed so the purged session starts the linked run; drop the rest as before.
                const url = new URL(window.location.href);
                const keepSeed = url.searchParams.get('seed');
                url.search = '';
                if (keepSeed) url.searchParams.set('seed', keepSeed);
                window.location.href = url.toString();
            };
            continueBtn.addEventListener('click', onContinue);
            newGameBtn.addEventListener('click', onNewGame);
        });
    }
}
