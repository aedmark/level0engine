import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.join(__dirname, '../data');
const FACTORY_DIR = path.join(DATA_DIR, 'factory');
const JS_DIR = path.join(__dirname, 'js');

const KNOWN_DATA_FILES = ['lore.json', 'clues.json', 'finales.json', 'foreshadow.json', 'puzzles.json', 'threads.json', 'parameters.json'];

function isSafeDataPath(filePath) {
    return filePath === DATA_DIR || filePath.startsWith(DATA_DIR + path.sep);
}

function isSafeFactoryPath(filePath) {
    return filePath === FACTORY_DIR || filePath.startsWith(FACTORY_DIR + path.sep);
}

function isSafeJsPath(filePath) {
    return filePath.startsWith(JS_DIR + path.sep);
}

const NO_CACHE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' };

const server = http.createServer((req, res) => {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html' || req.url === '/index.html')) {
        fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading index.html');
            }
            res.writeHead(200, { 'Content-Type': 'text/html', ...NO_CACHE_HEADERS });
            res.end(data);
        });
        return;
    }

    if (req.method === 'GET' && req.url === '/HowTo.md') {
        fs.readFile(path.join(__dirname, 'HowTo.md'), (err, data) => {
            if (err) {
                res.writeHead(404);
                return res.end('Not found');
            }
            res.writeHead(200, { 'Content-Type': 'text/markdown', ...NO_CACHE_HEADERS });
            res.end(data);
        });
        return;
    }

    if (req.method === 'GET' && req.url.startsWith('/js/') && req.url.endsWith('.js')) {
        const requested = decodeURIComponent(req.url.slice('/js/'.length));
        const filePath = path.join(JS_DIR, requested);
        if (!isSafeJsPath(filePath)) {
            res.writeHead(400);
            return res.end('Invalid path');
        }
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                return res.end('Not found');
            }
            res.writeHead(200, { 'Content-Type': 'text/javascript', ...NO_CACHE_HEADERS });
            res.end(data);
        });
        return;
    }

    if (req.url.startsWith('/api/data')) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const file = url.searchParams.get('file');
        const source = url.searchParams.get('source');

        if (req.method === 'GET') {
            if (file) {
                const baseDir = source === 'factory' ? FACTORY_DIR : DATA_DIR;
                const filePath = path.join(baseDir, file);
                const safe = source === 'factory' ? isSafeFactoryPath(filePath) : isSafeDataPath(filePath);
                if (!safe || !file.endsWith('.json') || !KNOWN_DATA_FILES.includes(file)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Invalid file path' }));
                }
                fs.readFile(filePath, 'utf8', (err, data) => {
                    if (err) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: 'File not found' }));
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json', ...NO_CACHE_HEADERS });
                    res.end(JSON.stringify({ content: JSON.parse(data) }));
                });
            } else {
                fs.readdir(DATA_DIR, (err, files) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: 'Cannot read data dir' }));
                    }
                    const jsonFiles = files.filter(f => f.endsWith('.json'));
                    res.writeHead(200, { 'Content-Type': 'application/json', ...NO_CACHE_HEADERS });
                    res.end(JSON.stringify({ files: jsonFiles }));
                });
            }
            return;
        }

        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    const targetFile = data.file;
                    const content = data.content;

                    if (!targetFile || !content) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: 'Missing file or content' }));
                    }

                    const baseResolved = path.resolve(DATA_DIR);
                    const targetResolved = path.resolve(baseResolved, targetFile);
                    const relativePath = path.relative(baseResolved, targetResolved);
                    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: 'Invalid file path' }));
                    }
                    const filePath = targetResolved;
                    if (!isSafeDataPath(filePath) || !targetFile.endsWith('.json')) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: 'Invalid file path' }));
                    }

                    fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf8', (err) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ error: 'Failed to write file' }));
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    });
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid JSON body' }));
                }
            });
            return;
        }
    }

    if (req.method === 'POST' && req.url === '/api/factory-reset') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            let requested;
            try {
                requested = body ? JSON.parse(body) : {};
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Invalid JSON body' }));
            }
            const targetFiles = (Array.isArray(requested.files) && requested.files.length)
                ? requested.files.filter(f => KNOWN_DATA_FILES.includes(f))
                : KNOWN_DATA_FILES;

            const results = {};
            let pending = targetFiles.length;
            if (pending === 0) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'No valid files to reset' }));
            }
            targetFiles.forEach(f => {
                const factoryPath = path.join(FACTORY_DIR, f);
                const livePath = path.join(DATA_DIR, f);
                fs.readFile(factoryPath, 'utf8', (err, data) => {
                    if (err) {
                        results[f] = { ok: false, error: 'No factory baseline for this file' };
                        if (--pending === 0) finish();
                        return;
                    }
                    fs.writeFile(livePath, data, 'utf8', (werr) => {
                        results[f] = werr ? { ok: false, error: 'Write failed' } : { ok: true };
                        if (--pending === 0) finish();
                    });
                });
            });
            function finish() {
                const allOk = Object.values(results).every(r => r.ok);
                res.writeHead(allOk ? 200 : 207, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: allOk, results }));
            }
        });
        return;
    }

    if (req.method === 'GET' && req.url === '/api/export') {
        const bundle = { exportedAt: new Date().toISOString(), files: {} };
        let pending = KNOWN_DATA_FILES.length;
        let failed = null;
        KNOWN_DATA_FILES.forEach(f => {
            fs.readFile(path.join(DATA_DIR, f), 'utf8', (err, data) => {
                if (err) {
                    failed = failed || `Missing ${f}`;
                } else {
                    try {
                        bundle.files[f] = JSON.parse(data);
                    } catch (e) {
                        failed = failed || `Corrupt ${f}`;
                    }
                }
                if (--pending === 0) {
                    if (failed) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: failed }));
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(bundle));
                }
            });
        });
        return;
    }

    if (req.method === 'POST' && req.url === '/api/import') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            let parsed;
            try {
                parsed = JSON.parse(body);
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Invalid JSON body' }));
            }
            const files = parsed && parsed.files;
            if (!files || typeof files !== 'object') {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Bundle missing "files" object' }));
            }
            const entries = Object.entries(files).filter(([f]) => KNOWN_DATA_FILES.includes(f));
            if (entries.length === 0) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'No recognized files in bundle' }));
            }
            const results = {};
            let pending = entries.length;
            entries.forEach(([f, content]) => {
                const filePath = path.join(DATA_DIR, f);
                if (!isSafeDataPath(filePath)) {
                    results[f] = { ok: false, error: 'Unsafe path' };
                    if (--pending === 0) finish();
                    return;
                }
                fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf8', (werr) => {
                    results[f] = werr ? { ok: false, error: 'Write failed' } : { ok: true };
                    if (--pending === 0) finish();
                });
            });
            function finish() {
                const allOk = Object.values(results).every(r => r.ok);
                res.writeHead(allOk ? 200 : 207, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: allOk, results }));
            }
        });
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`Zero-dependency server running at http://localhost:${PORT}`);
});
