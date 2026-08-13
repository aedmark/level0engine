/**
 * [ROLE] Zero-dependency static file server for the main game engine.
 * [WHY] Serves the ES6 modules over http:// instead of file://, since strict CORS policy blocks module imports from the local filesystem.
 * [STATE] Stateless request handler; no data is persisted or mutated.
 * [DEPENDS] Node's http/fs/path/url modules; serves every file under the project root by MIME type.
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8080;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.svg': 'image/svg+xml',
    '.md': 'text/markdown'
};

const server = http.createServer((req, res) => {
    const route = req.url.split('?')[0];

    if (req.method === 'POST' && route === '/export-meta') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const filePath = path.join(__dirname, 'assets', 'textures', 'metadata.json');
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                fs.writeFileSync(filePath, body);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('OK');
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(err.toString());
            }
        });
        return;
    }

    if (req.method === 'POST' && route === '/export') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const base64Data = data.image.replace(/^data:image\/\w+;base64,/, "");
                const buf = Buffer.from(base64Data, 'base64');
                const filePath = path.join(__dirname, 'assets', 'textures', data.name + '.png');
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                fs.writeFileSync(filePath, buf);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('OK');
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(err.toString());
            }
        });
        return;
    }

    let filePath = path.join(__dirname, route === '/' ? 'index.html' : route);

    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('403 Forbidden');
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end(`<h1>404 Not Found</h1><p>The file ${route} was not found on this server.</p>`, 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Sorry, check with the site admin for error: ${error.code} ..\n`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Level 0 Engine running at http://localhost:${PORT}`);
});
