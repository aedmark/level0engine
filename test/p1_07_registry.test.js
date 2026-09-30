import './setup.js';
import test from 'node:test';
import assert from 'node:assert';
import fs, { globSync } from 'fs';
import path from 'path';

import StructuralBlueprints from '../src/world/StructuralBlueprints.js';
import SectorBlueprints from '../src/world/SectorBlueprints.js';
import SECTORS from '../src/world/Sectors.js';

test('P1-07 Registry tests', () => {
    let failed = [];

    const blueprintFiles = globSync('src/world/blueprints/*.js').map(f => path.basename(f, '.js'));
    const sbCode = fs.readFileSync('src/world/StructuralBlueprints.js', 'utf8');
    for (const bf of blueprintFiles) {
        if (!sbCode.includes(`from './blueprints/${bf}.js'`)) {
            failed.push(`Blueprint ${bf} not imported in StructuralBlueprints.js`);
        }
    }

    const handler = {
        get: function(target, prop) {
            if (prop in target) return target[prop];
            return () => new Proxy({
                position: { set: () => {} },
                rotation: { set: () => {} }
            }, handler);
        }
    };
    const dummyCtx = new Proxy({ random: () => 0.5 }, handler);
    const struct = StructuralBlueprints.getStructuralMatrix.call(dummyCtx, dummyCtx);
    
    let sum = 0;
    struct.forEach(s => sum += (s.prob || 0));
    if (Math.abs(sum - 1.0) > 0.0001) {
        failed.push(`Structural probabilities sum to ${sum}, expected 1.0`);
    }

    const handler2 = {
        get: function(target, prop) {
            if (prop in target) return target[prop];
            if (prop === 'cellSize') return 10;
            if (prop === 'sharedWallMat' || prop === 'blackIronMat' || prop === 'warehouseMat') return {};
            return () => new Proxy({
                position: { set: () => {} },
                rotation: { set: () => {} },
                updateMatrix: () => {},
                width: 10, height: 10
            }, handler2);
        }
    };
    const dummyCtx2 = new Proxy({ random: () => 0.5, addGeometry: () => {} }, handler2);
    const sectors = SectorBlueprints.getSectorMatrix.call(dummyCtx2, dummyCtx2);
    const lore = JSON.parse(fs.readFileSync('data/lore.json', 'utf8'));

    const flagSchema = {
        hasMaze: ['boolean'],
        multiLevelMaze: ['boolean', 'number'],
        ceilingHeight: ['number'],
        voidFloorY: ['number'],
        voidCeiling: ['boolean', 'object'],
        hallwayNeedsFloor: ['boolean'],
        hallwayNeedsCeiling: ['boolean'],
        anomalyAllowed: ['boolean'],
        bottomlessRescue: ['boolean'],
        maxCamY: ['number'],
        hasLightning: ['boolean'],
        acmeAudio: ['boolean'],
        fogColor: ['number'],
        fogDensity: ['number'],
        fogNear: ['number'],
        ambience: ['string', 'object'],
        tint: ['number'],
        lightRange: ['number']
    };

    for (const s of sectors) {
        if (!SECTORS[s.id]) failed.push(`Sector ${s.id} not found in Sectors.js`);
        if (!lore[s.id]) failed.push(`Sector ${s.id} not found in data/lore.json pool`);
        
        const flags = SECTORS[s.id] || {};
        for (const [k, v] of Object.entries(flags)) {
            if (flagSchema[k] && !flagSchema[k].includes(typeof v)) {
                failed.push(`Sector ${s.id} flag ${k} has wrong type ${typeof v}`);
            }
        }
    }

    const emCode = fs.readFileSync('src/entities/EntityManager.js', 'utf8');
    const rxEntities = /this\.entities\s*=\s*\{([^}]+)\}/;
    const match = rxEntities.exec(emCode);
    if (!match) {
        failed.push("Could not find this.entities assignment in EntityManager.js");
    } else {
        const keys = match[1].match(/'([A-Z_]+)'/g).map(s => s.replace(/'/g, ''));
        for (const key of keys) {
            if (key === 'DEFAULT') continue;
            if (!SECTORS[key]) failed.push(`EntityManager key ${key} is not a valid sector ID`);
        }
    }

    if (failed.length > 0) {
        assert.fail(failed.join('\n'));
    }
});
