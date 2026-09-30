import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');

export function getCoverage() {
    const lore = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'lore.json'), 'utf8'));
    const clues = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'clues.json'), 'utf8'));
    const foreshadow = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'foreshadow.json'), 'utf8'));
    
    const counts = {}; // sector -> type -> count
    
    const countItem = (sector, item) => {
        if (sector === 'nickname' || sector === 'text' || sector === 'description' || sector.startsWith('_')) return;
        if (!counts[sector]) counts[sector] = {};
        const type = item.type || 'document';
        if (!counts[sector][type]) counts[sector][type] = 0;
        counts[sector][type]++;
    };

    for (const sector in lore) {
        lore[sector].forEach(item => countItem(sector, item));
    }
    
    for (const sector in clues) {
        clues[sector].forEach(item => countItem(sector, item));
    }
    
    for (const finale in foreshadow) {
        const obj = foreshadow[finale];
        for (const sector in obj) {
            countItem(sector, obj[sector]);
        }
    }
    
    // Estimates of maximum placements per playthrough (empirically derived)
    const capacities = {
        ARCHIVE: { document: 15, ANY: 5 },
        ANNEX: { document: 5, ANY: 3 },
        IMPOUND: { clipboard: 8, ANY: 4 },
        EXIT: { document: 1, ANY: 1 },
        BOARDROOM: { laptop: 1, document: 2, ANY: 2 },
        SERVER: { ANY: 4 },
        CLINIC: { ANY: 4 },
        MAINTENANCE: { ANY: 4 },
        CHASM: { ANY: 4 },
        INCINERATOR: { ANY: 4 },
        ATRIUM: { ANY: 4 },
        CHECKPOINT: { ANY: 4 },
        ACME: { ANY: 4 },
        DEFAULT: { ANY: 15 } // Fallback pool
    };

    return { counts, capacities };
}
