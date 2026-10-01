import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { chromium } from 'playwright';
import { spawn } from 'child_process';

test('Headless boot smoke test', { timeout: 600000 }, async (t) => {
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
                console.log('BROWSER:', msg.text());
            }
        });
        page.on('pageerror', err => {
            errors.push(err.message);
        });

        await page.addInitScript(() => {
            window.EDMARK_DEBUG_MODE = true;
        });

        console.log('Loading engine.html...');
        await page.goto('http://localhost:8080/engine.html');

        console.log('Waiting for boot to finish...');
        while (!bootComplete && errors.length === 0) {
            await new Promise(r => setTimeout(r, 1000));
        }

        if (errors.length > 0) {
            assert.fail(`Errors during boot: \n${errors.join('\n')}`);
        }

        console.log('Boot finished! Starting sector warp sequence...');

        const sectorsToTest = [
            'ARCHIVE', 'IMPOUND', 'ACME', 'ANNEX', 'SERVER', 
            'BOARDROOM', 'INCINERATOR', 'ATRIUM', 'CLINIC', 
            'MAINTENANCE', 'CHASM', 'CHECKPOINT', 'EXIT'
        ];

        for (const sector of sectorsToTest) {
            console.log(`Warping to ${sector}...`);
            await page.evaluate((s) => {
                const select = document.getElementById('sectorHuntSelect');
                if (select) {
                    select.value = s;
                    select.dispatchEvent(new Event('change'));
                }
            }, sector);

            // Wait for warp to complete
            await page.waitForFunction(() => {
                const select = document.getElementById('sectorHuntSelect');
                return select && select.value === "";
            }, undefined, { timeout: 300000 });

            console.log(`Warped to ${sector} successfully.`);
            
            await new Promise(r => setTimeout(r, 1000));
            if (errors.length > 0) {
                assert.fail(`Errors during warp to ${sector}: \n${errors.join('\n')}`);
            }
        }

        assert.strictEqual(errors.length, 0, `Console errors occurred during the test: \n${errors.join('\n')}`);
        
    } finally {
        if (browser) await browser.close();
        if (serverProcess) process.kill(-serverProcess.pid);
    }
});
