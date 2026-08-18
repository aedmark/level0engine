import {attachPropGlow} from './PropGlow.js';

const LORE_CHANCE = 0.019;

export const PROP_GLOW = {
    tape: {color: 0xff0000, intensity: 1.0, distance: 1.5, offset: [0.06, 0.05, -0.04]},
    laptop: {color: 0xa8ffd0, intensity: 0.8, distance: 2.5, offset: [0, 0.2, 0.1]},
    clipboard: {color: 0xffffff, intensity: 1.2, distance: 3.0, offset: [0, 0.15, 0]},
    paper: {color: 0xffffff, intensity: 1.2, distance: 3.0, offset: [0, 0.15, 0]}
};
const MAX_LORE_PER_CHUNK = 4;

function budget(env, hash) {
    if (!env._paperBudget) env._paperBudget = new Map();
    let b = env._paperBudget.get(hash);
    if (!b) {
        b = {lore: 0};
        env._paperBudget.set(hash, b);
    }
    return b;
}

function buildRecorder(env, x, z, rotation, y) {
    const group = new THREE.Group();
    if (!env.tapeGeo) {
        env.tapeGeo = new THREE.BoxGeometry(0.18, 0.04, 0.12);
        env.geoCache.set(env.tapeGeo.uuid, true);
    }
    const body = new THREE.Mesh(env.tapeGeo, env.baseHousingMat);
    body.position.set(0, 0.02, 0);
    group.add(body);
    const recLight = new THREE.Mesh(env._boxGeo(0.02, 0.02, 0.02), env.hazardMat);
    recLight.material = new THREE.MeshBasicMaterial({color: 0xff0000});
    recLight.position.set(0.06, 0.04, -0.04);
    group.add(recLight);
    group.position.set(x, (y !== undefined ? y : 0.02), z);
    group.rotation.y = rotation;
    return group;
}

function buildLaptop(env, x, z, rotation, y) {
    if (!env.laptopScreenMat) {
        env.laptopScreenMat = new THREE.MeshBasicMaterial({color: 0xa8ffd0});
        env.sharedAssets.add(env.laptopScreenMat.uuid);
    }
    const lap = new THREE.Group();
    const lapBase = new THREE.Mesh(env._boxGeo(0.36, 0.025, 0.26), env.baseHousingMat);
    lap.add(lapBase);
    const lapScreen = new THREE.Mesh(env._cacheGeo('lapScreen', () => {
        const g = new THREE.BoxGeometry(0.36, 0.24, 0.02);
        g.translate(0, 0.12, 0);
        return g;
    }), env.baseHousingMat);
    lapScreen.position.set(0, 0.01, -0.12);
    lapScreen.rotation.x = -0.35;
    const glow = new THREE.Mesh(env._planeGeo(0.3, 0.18), env.laptopScreenMat);
    glow.position.set(0, 0.13, 0.012);
    lapScreen.add(glow);
    lap.add(lapScreen);
    lap.position.set(x, (y !== undefined ? y : 0.0125), z);
    lap.rotation.y = rotation;
    return lap;
}

function buildClipboard(env, x, z, rotation, y) {
    const group = new THREE.Group();
    const board = new THREE.Mesh(env._boxGeo(0.24, 0.01, 0.34), env.cardboardMat || env.baseHousingMat);
    board.position.set(0, 0.005, 0);
    group.add(board);
    
    const doc = new THREE.Mesh(env.documentGeo, env.documentMat);
    doc.position.set(0, 0.011, 0);
    doc.rotation.y = 0;
    group.add(doc);
    
    const clip = new THREE.Mesh(env._boxGeo(0.12, 0.02, 0.04), env.metalMat);
    clip.position.set(0, 0.015, -0.14);
    group.add(clip);
    group.position.set(x, (y !== undefined ? y : 0.005), z);
    group.rotation.y = rotation;
    return group;
}

export function placeEphemera(env, ctx, sectorId, cx0, cz0, y) {
    const {random, chunkGroup, hash} = ctx;
    if (!env.documentGeo || !chunkGroup) return;
    const note = new THREE.Mesh(env.documentGeo, env.documentMat);
    note.position.set(
        cx0 + (random() - 0.5) * 1.4,
        y !== undefined ? y : 0.035,
        cz0 + (random() - 0.5) * 1.4
    );
    note.rotation.y = random() * Math.PI;
    note.userData = {
        type: 'document',
        chunkHash: hash,
        active: true,
        zone: sectorId,
        docId: 'NOTE_' + Math.floor(random() * 9999)
    };
    chunkGroup.add(note);
    note.updateMatrixWorld(true);
    attachPropGlow(env, note, hash, {...PROP_GLOW.paper, flickerOffset: random() * 500});
    env._registerInteractable(note, hash);
}

export function placeSectorPaper(env, ctx, sectorId, cx0, cz0, y, spread, chanceOverride) {
    const {random, chunkGroup, hash} = ctx;
    if (!env.documentGeo || !chunkGroup) return false;
    const sp = spread !== undefined ? spread : 1.6;
    const surfaceY = y !== undefined ? y : 0.035;
    const b = budget(env, hash);
    const roll = random();
    
    const chance = chanceOverride !== undefined ? chanceOverride : LORE_CHANCE;
    if (roll < chance && b.lore < MAX_LORE_PER_CHUNK) {
        b.lore++;
        const meshType = env.getStory ? env.getStory().getNextMeshType(sectorId) : 'document';
        
        let mesh;
        let prefix = 'LOG_';
        let glow = PROP_GLOW.paper;
        const mx = cx0 + (random() - 0.5) * sp;
        const mz = cz0 + (random() - 0.5) * sp;
        const rot = random() * Math.PI;

        switch(meshType) {
            case 'tape':
                mesh = buildRecorder(env, mx, mz, rot, surfaceY);
                prefix = 'TAPE_';
                glow = PROP_GLOW.tape;
                break;
            case 'laptop':
                mesh = buildLaptop(env, mx, mz, rot, surfaceY);
                prefix = 'LAPTOP_';
                glow = PROP_GLOW.laptop;
                break;
            case 'clipboard':
                mesh = buildClipboard(env, mx, mz, rot, surfaceY);
                prefix = 'TAG_';
                glow = PROP_GLOW.clipboard;
                break;
            case 'note':
                mesh = new THREE.Mesh(env.documentGeo, env.documentMat);
                mesh.position.set(mx, surfaceY, mz);
                mesh.rotation.y = rot;
                prefix = 'NOTE_';
                break;
            case 'document':
            default:
                mesh = new THREE.Mesh(env.documentGeo, env.documentMat);
                mesh.position.set(mx, surfaceY, mz);
                mesh.rotation.y = rot;
                prefix = 'LOG_';
                break;
        }

        mesh.userData = {
            type: 'document',
            chunkHash: hash,
            active: true,
            zone: sectorId,
            docId: prefix + Math.floor(random() * 9999)
        };
        chunkGroup.add(mesh);
        if (mesh.updateMatrixWorld) mesh.updateMatrixWorld(true);
        attachPropGlow(env, mesh, hash, {...glow, flickerOffset: random() * 500});
        env._registerInteractable(mesh, hash);
        return true;
    }
    return false;
}
