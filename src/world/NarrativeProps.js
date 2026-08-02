/**
 * Shared paper and tape placement for sector generators.
 *
 * Annex, Archive and Impound each hand-place their documents into furniture they own — a desk, a
 * shelf, a chainlink pen — and should keep doing that, because a report lying on the desk it was
 * written at reads better than one on the floor. Every other sector has no such furniture to hang
 * paper off, so this drops it on open floor instead.
 *
 * The one hard rule: a sector generator must only call this from a branch it already knows is
 * walkable. This module has no view of the maze and will happily place a document inside a wall if
 * asked to. Callers pass cells they have already cleared.
 */

const DOC_CHANCE = 0.014;
const TAPE_CHANCE = 0.005;
const MAX_DOCS_PER_CHUNK = 3;
const MAX_TAPES_PER_CHUNK = 1;

/**
 * Per-chunk placement budget. Keyed by chunk hash so a chunk that unloads and rebuilds starts
 * fresh, and so a single sector cannot carpet its floor in paperwork.
 */
function budget(env, hash) {
    if (!env._paperBudget) env._paperBudget = new Map();
    let b = env._paperBudget.get(hash);
    if (!b) {
        b = {docs: 0, tapes: 0};
        env._paperBudget.set(hash, b);
    }
    return b;
}

/**
 * Builds a tape recorder: a small housing with a live record light.
 */
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

/**
 * Places a piece of ephemera unconditionally on a cleared cell.
 *
 * Unlike `placeSectorPaper` this does not roll and is not budgeted, because its callers place it
 * deliberately rather than scattering it. Ephemera is not case material: it carries no thread,
 * settles nothing, costs nothing to read and never enters the terminal archive.
 *
 * @param {Object} env - The Environment instance.
 * @param {Object} ctx - The chunk build context.
 * @param {string} sectorId - Which ephemera pool to draw from.
 * @param {number} cx0 - Cell centre X in world space.
 * @param {number} cz0 - Cell centre Z in world space.
 * @param {number} [y] - Optional surface height, for placing on a table rather than the floor.
 */
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

/**
 * Rolls for a document or a recorder on one cleared floor cell.
 *
 * @param {Object} env - The Environment instance.
 * @param {Object} ctx - The chunk build context (supplies random, chunkGroup, hash).
 * @param {string} sectorId - The sector this cell belongs to. Becomes the document's zone, which
 *                            is what StoryEngine uses as the unit of corroboration.
 * @param {number} cx0 - Cell centre X in world space.
 * @param {number} cz0 - Cell centre Z in world space.
 * @param {number} [y] - Surface height. Defaults to the floor; pass a table top to land paper on it.
 * @param {number} [spread] - Half-width of the scatter. Shrink it when placing onto furniture so
 *                            nothing hangs off the edge of a desk.
 * @returns {boolean} True if anything was placed.
 */
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
