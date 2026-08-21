import SaveManager from '../system/SaveManager.js';

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
                window.location.href = window.location.href.split('?')[0];
            };
            continueBtn.addEventListener('click', onContinue);
            newGameBtn.addEventListener('click', onNewGame);
        });
    }
}
