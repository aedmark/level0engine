import SaveManager from '../system/SaveManager.js';

/**
 * The very first thing main.js does, before any asset loading starts. If a prior
 * session's save blob exists, blocks on a Continue / New Game choice; New Game
 * purges everything (localStorage, IndexedDB texture cache, service workers, Cache
 * API) before letting boot proceed, so the loaders that run afterward find nothing
 * cached and re-fetch/regenerate everything from scratch. Continue — and the common
 * case of no prior save at all — resolve immediately and boot proceeds untouched.
 */
export default class ContinuePrompt {
    static async resolve() {
        let hasSave = false;
        try {
            const raw = localStorage.getItem('level0_state');
            hasSave = !!raw && typeof JSON.parse(raw) === 'object';
        } catch (e) {
            hasSave = false;
        }
        if (!hasSave) return;

        const overlay = document.getElementById('continue-check-overlay');
        const continueBtn = document.getElementById('continueGameBtn');
        const newGameBtn = document.getElementById('newGameBtn');
        if (!overlay || !continueBtn || !newGameBtn) return;

        overlay.style.display = 'flex';

        await new Promise((resolve) => {
            const cleanup = () => {
                continueBtn.removeEventListener('click', onContinue);
                newGameBtn.removeEventListener('click', onNewGame);
            };
            const onContinue = () => {
                cleanup();
                overlay.style.display = 'none';
                resolve();
            };
            const onNewGame = async () => {
                continueBtn.disabled = true;
                newGameBtn.disabled = true;
                newGameBtn.textContent = 'PURGING MEMORY...';
                try {
                    await SaveManager.purgeAllStorage();
                } catch (e) {
                    console.error('New Game purge failed:', e);
                }
                cleanup();
                overlay.style.display = 'none';
                resolve();
            };
            continueBtn.addEventListener('click', onContinue);
            newGameBtn.addEventListener('click', onNewGame);
        });
    }
}
