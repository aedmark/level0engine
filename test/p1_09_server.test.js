import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import http from 'http';

test('P1-09 Server tests', async () => {
    return new Promise((resolve, reject) => {
        const port = 8089;
        const serverProcess = spawn('node', ['engine_server.js'], {
            env: { ...process.env, PORT: port.toString() }
        });

        let output = '';
        serverProcess.stdout.on('data', d => {
            output += d;
            if (output.includes(`Level 0 Engine`)) {
                runTests();
            }
        });

        async function runTests() {
            try {
                // 1. check that / serves index.html
                let res = await fetch(`http://localhost:${port}/`);
                assert.strictEqual(res.status, 200, "Root should serve 200");
                let text = await res.text();
                assert.ok(text.includes('<!DOCTYPE html>'), "Root should be HTML");

                // 2. ../ path is refused with 403
                res = await fetch(`http://localhost:${port}/../package.json`);
                // Note: fetch resolves ../ before sending, so we must use http.get
                
                await new Promise((resolve, reject) => {
                    http.get({
                        hostname: 'localhost',
                        port: port,
                        path: '/../package.json'
                    }, (res) => {
                        assert.strictEqual(res.statusCode, 403, "../ path should be 403");
                        resolve();
                    }).on('error', reject);
                });

                // 3. /export refuses a name escaping assets/textures/
                res = await fetch(`http://localhost:${port}/export`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: '../hacked.png',
                        image: 'data:image/png;base64,iVBORw0KGgo'
                    })
                });
                assert.strictEqual(res.status, 500, "Export escaping path should be 500");
                
                serverProcess.kill();
                resolve();
            } catch (err) {
                serverProcess.kill();
                reject(err);
            }
        }
        
        serverProcess.on('error', (err) => {
            reject(err);
        });
        
        // Timeout
        setTimeout(() => {
            serverProcess.kill();
            reject(new Error("Server test timed out"));
        }, 3000);
    });
});
