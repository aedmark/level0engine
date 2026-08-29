import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 8080;

const ISOLATION_HEADERS = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin'
};

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.svg': 'image/svg+xml',
    '.md': 'text/markdown',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf'
};

const IMMUTABLE_ROUTES = /^\/(r160\.js|assets\/fonts\/)/;

const ALLOWED_SECTOR_FIELDS = new Set(['ambient', 'fog', 'fogColor', 'groundColor']);
const COLOR_FIELDS = new Set(['fogColor', 'groundColor']);
const ALLOWED_LIGHT_FIELDS = new Set(['lightIntensity', 'lightColor', 'lightRange', 'shadowsEnabled', 'shadowRadius']);
const LIGHT_COLOR_FIELDS = new Set(['lightColor']);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toHexLiteral = (n) => '0x' + (Number(n) >>> 0).toString(16).padStart(6, '0');

function assertBraceBalance(original, patched, label) {
    const count = (s, ch) => (s.split(ch).length - 1);
    if (count(original, '{') !== count(patched, '{') || count(original, '}') !== count(patched, '}')) {
        throw new Error(`Refusing to write ${label}: brace count changed unexpectedly`);
    }
}

function patchSectorBlock(text, sectorName, fields, allowedFields = ALLOWED_SECTOR_FIELDS, colorFields = COLOR_FIELDS) {
    if (!/^[A-Z0-9_]+$/.test(sectorName)) {
        throw new Error(`Invalid sector name "${sectorName}"`);
    }
    const startRe = new RegExp(`\\b${escapeRe(sectorName)}\\s*:\\s*\\{`);
    const m = startRe.exec(text);
    if (!m) throw new Error(`Sector "${sectorName}" not found in Sectors.js`);

    const blockOpenIdx = m.index + m[0].length - 1;
    let depth = 0;
    let endIdx = -1;
    for (let i = blockOpenIdx; i < text.length; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') {
            depth--;
            if (depth === 0) { endIdx = i; break; }
        }
    }
    if (endIdx === -1) throw new Error(`Unbalanced braces scanning sector "${sectorName}"`);

    let block = text.slice(blockOpenIdx, endIdx + 1);
    const indentMatch = block.match(/\n(\s+)\S/);
    const indent = indentMatch ? indentMatch[1] : '        ';

    for (const [key, value] of Object.entries(fields)) {
        if (!allowedFields.has(key)) continue;
        const valueText = colorFields.has(key) ? toHexLiteral(value) : String(value);
        const fieldRe = new RegExp(`\\b${key}\\s*:\\s*[^,}\\n]+`);
        if (fieldRe.test(block)) {
            block = block.replace(fieldRe, `${key}: ${valueText}`);
        } else {
            block = block.replace('{', `{\n${indent}${key}: ${valueText},`);
        }
    }

    return text.slice(0, blockOpenIdx) + block + text.slice(endIdx + 1);
}

function patchNamedConst(text, constName, newHex) {
    const re = new RegExp(`(export const ${escapeRe(constName)}\\s*=\\s*)0x[0-9a-fA-F]{6}(\\s*;)`);
    if (!re.test(text)) throw new Error(`Could not find export const ${constName} in Sectors.js`);
    return text.replace(re, `$1${newHex}$2`);
}

function patchSkyColor(text, newHex) {
    const re = /(new THREE\.HemisphereLight\(\s*)0x[0-9a-fA-F]{6}(\s*,)/;
    if (!re.test(text)) throw new Error('Could not find HemisphereLight sky color literal in RenderEngine.js');
    return text.replace(re, `$1${newHex}$2`);
}

function writePatched(filePath, patchFn, label) {
    const original = fs.readFileSync(filePath, 'utf-8');
    const patched = patchFn(original);
    assertBraceBalance(original, patched, label);
    fs.writeFileSync(filePath, patched);
}

function saveAtmosphere(data) {
    const results = [];
    const sectorsPath = path.join(__dirname, 'src', 'world', 'Sectors.js');
    const enginePath = path.join(__dirname, 'src', 'core', 'RenderEngine.js');

    if (data.sector && data.sectorFields && Object.keys(data.sectorFields).length) {
        writePatched(sectorsPath, (text) => patchSectorBlock(text, data.sector, data.sectorFields), 'Sectors.js (sector block)');
        results.push(`Sectors.js: SECTORS.${data.sector} updated (${Object.keys(data.sectorFields).join(', ')})`);
    }

    if (data.baseFields && data.baseFields.atmosphereColor !== undefined) {
        const hex = toHexLiteral(data.baseFields.atmosphereColor);
        writePatched(sectorsPath, (text) => patchNamedConst(text, 'DEFAULT_ATMOSPHERE_COLOR', hex), 'Sectors.js (DEFAULT_ATMOSPHERE_COLOR)');
        results.push(`Sectors.js: DEFAULT_ATMOSPHERE_COLOR -> ${hex}`);
    }

    if (data.baseFields && data.baseFields.skyColor !== undefined) {
        const hex = toHexLiteral(data.baseFields.skyColor);
        writePatched(enginePath, (text) => patchSkyColor(text, hex), 'RenderEngine.js (sky color)');
        results.push(`RenderEngine.js: sky color -> ${hex}`);
    }

    return results;
}

function saveLight(data) {
    const results = [];
    const sectorsPath = path.join(__dirname, 'src', 'world', 'Sectors.js');

    if (data.sector && data.sectorFields && Object.keys(data.sectorFields).length) {
        writePatched(
            sectorsPath,
            (text) => patchSectorBlock(text, data.sector, data.sectorFields, ALLOWED_LIGHT_FIELDS, LIGHT_COLOR_FIELDS),
            'Sectors.js (sector block)'
        );
        results.push(`Sectors.js: SECTORS.${data.sector} updated (${Object.keys(data.sectorFields).join(', ')})`);
    }

    return results;
}

const cacheControlFor = (route) =>
    IMMUTABLE_ROUTES.test(route) ? 'public, max-age=31536000, immutable' : 'no-cache';

const etagFor = (stats) => `W/"${stats.size.toString(16)}-${stats.mtimeMs.toString(16)}"`;

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
                const mimeMatch = /^data:image\/(\w+);base64,/.exec(data.image);
                const ext = mimeMatch ? mimeMatch[1] : 'png';
                const base64Data = data.image.replace(/^data:image\/\w+;base64,/, "");
                const buf = Buffer.from(base64Data, 'base64');
                const base = path.resolve(__dirname, 'assets', 'textures');
                const filePath = path.resolve(base, `${data.name}.${ext}`);
                const relative = path.relative(base, filePath);
                if (relative.startsWith('..') || path.isAbsolute(relative)) {
                    throw new Error('Invalid file path');
                }
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

    if (req.method === 'POST' && route === '/save-atmosphere') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const results = saveAtmosphere(data);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end(results.length ? results.join('\n') : 'No changes to save.');
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(err.toString());
            }
        });
        return;
    }

    if (req.method === 'POST' && route === '/save-light') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const results = saveLight(data);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end(results.length ? results.join('\n') : 'No changes to save.');
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

    fs.stat(filePath, (statErr, stats) => {
        if (statErr || !stats.isFile()) {
            if (!statErr || statErr.code === 'ENOENT' || statErr.code === 'ENOTDIR') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                return res.end(`<h1>404 Not Found</h1><p>The file ${route} was not found on this server.</p>`, 'utf-8');
            }
            res.writeHead(500);
            return res.end(`Sorry, check with the site admin for error: ${statErr.code} ..\n`);
        }

        const etag = etagFor(stats);
        const cacheControl = cacheControlFor(route);

        if (req.headers['if-none-match'] === etag) {
            res.writeHead(304, {...ISOLATION_HEADERS, 'ETag': etag, 'Cache-Control': cacheControl});
            return res.end();
        }

        fs.readFile(filePath, (error, content) => {
            if (error) {
                res.writeHead(500);
                res.end(`Sorry, check with the site admin for error: ${error.code} ..\n`);
                return;
            }

            let output = content;
            if (route === '/engine.html' && contentType === 'text/html') {
                try {
                    const srcDir = path.join(__dirname, 'src');
                    const getFiles = (dir) => {
                        const dirents = fs.readdirSync(dir, { withFileTypes: true });
                        const files = dirents.map((dirent) => {
                            const res = path.resolve(dir, dirent.name);
                            return dirent.isDirectory() ? getFiles(res) : res;
                        });
                        return Array.prototype.concat(...files);
                    };
                    const jsFiles = getFiles(srcDir).filter(f => f.endsWith('.js'));
                    const links = jsFiles.map(f => `<link rel="modulepreload" href="src${f.replace(srcDir, '').replace(/\\/g, '/')}">`).join('\n    ');

                    let html = output.toString('utf-8');
                    html = html.replace('<!-- DYNAMIC_PRELOADS -->', links);
                    output = Buffer.from(html, 'utf-8');
                } catch (e) {
                    console.error('Failed to generate dynamic preloads', e);
                }
            }
            res.writeHead(200, {
                ...ISOLATION_HEADERS,
                'Content-Type': contentType,
                'Cache-Control': cacheControl,
                'ETag': etag,
                'Last-Modified': stats.mtime.toUTCString(),
                'Content-Length': Buffer.byteLength(output)
            });
            res.end(output);
        });
    });
});

server.listen(PORT, () => {
    console.log(`Level 0 Engine running at http://localhost:${PORT}`);
});
