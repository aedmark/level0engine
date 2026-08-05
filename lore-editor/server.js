import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.join(__dirname, '../data');

const server = http.createServer((req, res) => {
    // Serve Editor UI
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html' || req.url === '/editor.html')) {
        fs.readFile(path.join(__dirname, 'editor.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading editor.html');
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
        return;
    }

    // API Routes
    if (req.url.startsWith('/api/data')) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const file = url.searchParams.get('file');

        if (req.method === 'GET') {
            if (file) {
                const filePath = path.join(DATA_DIR, file);
                if (!filePath.startsWith(DATA_DIR) || !file.endsWith('.json')) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Invalid file path' }));
                }
                fs.readFile(filePath, 'utf8', (err, data) => {
                    if (err) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: 'File not found' }));
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ content: JSON.parse(data) }));
                });
            } else {
                fs.readdir(DATA_DIR, (err, files) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: 'Cannot read data dir' }));
                    }
                    const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'tags.json');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
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
                    
                    const filePath = path.join(DATA_DIR, targetFile);
                    if (!filePath.startsWith(DATA_DIR) || !targetFile.endsWith('.json')) {
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

    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`Zero-dependency server running at http://localhost:${PORT}`);
});
