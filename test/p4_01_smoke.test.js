import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';

test('Headless boot smoke test with performance budget', { timeout: 1200000 }, async (t) => {
    let serverProcess;
    let browser;
    
    // Start server
    await new Promise((resolve, reject) => {
        serverProcess = spawn('node', ['engine_server.js'], { detached: true });
        serverProcess.stdout.on('data', data => {
            if (data.toString().includes('running at')) resolve();
        });
        serverProcess.stderr.on('data', data => {
            console.error('Server error:', data.toString());
        });
        serverProcess.on('error', reject);
        setTimeout(resolve, 3000); // fallback
    });

    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        
        let errors = [];
        let bootComplete = false;
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            } else {
                if (msg.text().includes('[BOOT] Complete.')) {
                    bootComplete = true;
                }
            }
        });
        page.on('pageerror', err => {
            errors.push(err.message);
        });

        await page.addInitScript(() => {
            window.EDMARK_DEBUG_MODE = true;
            document.addEventListener('DOMContentLoaded', () => {
                const s = document.getElementById('seedInput');
                if (s) s.value = '0x12345678';
            });
        });

        console.log('Loading engine.html...');
        await page.goto('http://localhost:8080/engine.html');

        console.log('Waiting for boot to finish...');
        let waitTime = 0;
        while (!bootComplete && errors.length === 0) {
            await new Promise(r => setTimeout(r, 1000));
            waitTime++;
            if (waitTime > 300) {
                console.log('Boot took longer than 300s, something might be stuck.');
                break;
            }
        }

        if (errors.length > 0) {
            assert.fail(`Errors during boot: \n${errors.join('\n')}`);
        }

        console.log('Boot finished! Starting sector warp sequence...');

        // Pre-computed chunk coordinates for seed 0x12345678
        const sectorsToTest = [
            { id: 'MAINTENANCE', cx: -4, cz: 1 },
            { id: 'ANNEX', cx: 2, cz: -4 },
            { id: 'CLINIC', cx: 4, cz: 2 },
            { id: 'CHASM', cx: -4, cz: -5 },
            { id: 'CHECKPOINT', cx: -7, cz: 7 },
            { id: 'SERVER', cx: 8, cz: -4 },
            { id: 'ACME', cx: -10, cz: -10 },
            { id: 'ARCHIVE', cx: -10, cz: 0 },
            { id: 'BOARDROOM', cx: 3, cz: -10 },
            { id: 'ATRIUM', cx: -3, cz: -11 },
            { id: 'IMPOUND', cx: 14, cz: -1 },
            { id: 'INCINERATOR', cx: 8, cz: -16 },
            { id: 'EXIT', cx: 21, cz: -9 }
        ];

        const sectorGenTimes = {};
        let lastGenTime = await page.evaluate(() => {
            return (window.environment && window.environment.genStats) ? window.environment.genStats.totalMs : 0;
        });

        for (const sector of sectorsToTest) {
            console.log(`Warping directly to ${sector.id} at chunk (${sector.cx}, ${sector.cz})...`);
            
            await page.evaluate(async (s) => {
                const chunkWorldSize = window.environment.chunkSize * window.environment.cellSize;
                const targetX = s.cx * chunkWorldSize + chunkWorldSize / 2;
                const targetZ = s.cz * chunkWorldSize + chunkWorldSize / 2;
                
                window.environment.camera.position.set(targetX, 1.6, targetZ);
                window.environment.updateChunks(window.environment.camera.position);
                
                // Wait for chunk builder to drain
                while (window.environment.isBuildingChunk || window.environment.chunkQueue.length > 0) {
                    await new Promise(r => setTimeout(r, 20));
                }
            }, sector);

            console.log(`Warped to ${sector.id} successfully.`);
            
            // Allow a short delay for any trailing chunk updates to settle
            await new Promise(r => setTimeout(r, 500));
            
            if (errors.length > 0) {
                assert.fail(`Errors during warp to ${sector.id}: \n${errors.join('\n')}`);
            }
            
            const currentGenTime = await page.evaluate(() => {
                return (window.environment && window.environment.genStats) ? window.environment.genStats.totalMs : 0;
            });
            
            const deltaMs = currentGenTime - lastGenTime;
            sectorGenTimes[sector.id] = deltaMs;
            lastGenTime = currentGenTime;
            
            console.log(`[PERF] ${sector.id} gen CPU time: ${deltaMs.toFixed(1)}ms`);
        }

        assert.strictEqual(errors.length, 0, `Console errors occurred during the test: \n${errors.join('\n')}`);
        
        // Evaluate regressions
        const baselinePath = 'test/perf_baseline.json';
        if (fs.existsSync(baselinePath)) {
            const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
            const regressions = [];
            for (const sector of sectorsToTest) {
                const baseTime = baseline[sector.id];
                const newTime = sectorGenTimes[sector.id];
                if (baseTime > 0 && newTime > 0) {
                    const ratio = newTime / baseTime;
                    if (ratio > 1.5 && (newTime - baseTime) > 50) {
                        regressions.push(`${sector.id} regressed: ${baseTime.toFixed(1)}ms -> ${newTime.toFixed(1)}ms`);
                    }
                }
            }
            if (regressions.length > 0) {
                assert.fail(`Performance regressions detected:\n${regressions.join('\n')}`);
            }
            console.log('Performance within budget.');
        } else {
            console.log('No baseline found. Saving current run as baseline.');
            fs.writeFileSync(baselinePath, JSON.stringify(sectorGenTimes, null, 2));
        }
        
    } finally {
        if (browser) await browser.close();
        if (serverProcess) {
            try { process.kill(-serverProcess.pid); } catch(e){}
        }
    }
});
