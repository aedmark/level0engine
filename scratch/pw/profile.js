const { chromium, firefox } = require('playwright');

async function runProfile(browserType, name) {
    console.log(`Starting ${name}...`);
    const browser = await browserType.launch({ headless: true });
    const page = await browser.newPage();
    
    let linkprofLogs = [];
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('[LINKPROF]')) linkprofLogs.push(text);
    });

    await page.goto('http://localhost:8080/engine.html?linkprofile&seed=12345');
    
    // wait for boot
    await page.waitForTimeout(6000);
    
    // Teleport repeatedly to force loading all zones and their unique materials
    for (let i = 0; i < 5; i++) {
        await page.evaluate(() => {
            window.EDMARK_DEBUG_MODE = true;
            document.dispatchEvent(new Event('somatic-teleport-zone'));
        });
        await page.waitForTimeout(4000);
    }
    
    const worstHitch = await page.evaluate(() => {
        // Find the HUD or just return the total hitching from DebugHUD if exposed
        // Since DebugHUD is exported, maybe it's on window?
        // Let's just look at the DOM text for the HUD.
        const el = document.getElementById('debug-hud');
        if (el) return el.innerText;
        return null;
    });

    console.log(`--- ${name} Results ---`);
    for (const log of linkprofLogs) console.log(log);
    console.log(`HUD: ${worstHitch}`);
    console.log('---------------------');
    
    await browser.close();
}

(async () => {
    try {
        await runProfile(chromium, 'Chromium');
        await runProfile(firefox, 'Firefox');
    } catch (e) {
        console.error(e);
    }
})();
