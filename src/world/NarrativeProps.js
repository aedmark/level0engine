/**
 * [ROLE] Places interactive narrative items (documents, tapes) in the game world.
 * [WHY] Distributes lore and story elements dynamically within the chunk generation based on probabilities and budgets.
 * [STATE] Stateless utility. Modifies `env._paperBudget` to cap items per chunk and registers interactables.
 * [DEPENDS] Requires `THREE` globally, `env` geometry/material definitions, and chunk generation context `ctx`.
 */
const DOC_CHANCE = 0.014;
const TAPE_CHANCE = 0.005;
const MAX_DOCS_PER_CHUNK = 3;
const MAX_TAPES_PER_CHUNK = 1;

function budget(env, hash) {
    if (!env._paperBudget) env._paperBudget = new Map();
    let b = env._paperBudget.get(hash);
    if (!b) {
        b = {docs: 0, tapes: 0};
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
    env._registerInteractable(note, hash);
}

export function placeSectorPaper(env, ctx, sectorId, cx0, cz0, y, spread) {
    const {random, chunkGroup, hash} = ctx;
    if (!env.documentGeo || !chunkGroup) return false;
    const sp = spread !== undefined ? spread : 1.6;
    const surfaceY = y !== undefined ? y : 0.035;
    const b = budget(env, hash);
    const roll = random();
    if (roll < TAPE_CHANCE && b.tapes < MAX_TAPES_PER_CHUNK) {
        b.tapes++;
        const rec = buildRecorder(
            env,
            cx0 + (random() - 0.5) * sp * 0.75,
            cz0 + (random() - 0.5) * sp * 0.75,
            random() * Math.PI,
            surfaceY
        );
        rec.userData = {
            type: 'document',
            chunkHash: hash,
            active: true,
            zone: sectorId,
            docId: 'TAPE_' + Math.floor(random() * 9999)
        };
        chunkGroup.add(rec);
        rec.updateMatrixWorld(true);
        env._registerInteractable(rec, hash);
        return true;
    }
    if (roll < DOC_CHANCE && b.docs < MAX_DOCS_PER_CHUNK) {
        b.docs++;
        const doc = new THREE.Mesh(env.documentGeo, env.documentMat);
        doc.position.set(
            cx0 + (random() - 0.5) * sp,
            surfaceY,
            cz0 + (random() - 0.5) * sp
        );
        doc.rotation.y = random() * Math.PI;
        doc.userData = {
            type: 'document',
            chunkHash: hash,
            active: true,
            zone: sectorId,
            docId: 'LOG_' + Math.floor(random() * 9999)
        };
        chunkGroup.add(doc);
        env._registerInteractable(doc, hash);
        return true;
    }
    return false;
}
