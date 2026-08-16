import {buildWaitingBench} from '../ClinicFurniture.js';

/**
 * A place to wait beside a curved archway.
 *
 * Somebody put seating at a threshold in a building where nothing arrives. The bench
 * always sits against a wall running perpendicular to the passage, facing across it,
 * so you are seated looking at the arch rather than beside it. A small enamel bay
 * placard hangs above.
 *
 * Placement is deliberately conservative. If the flanking cell has no wall to put a
 * back against, no bench is built — a bench marooned in open floor reads as a bug,
 * and the engine has plenty of cells that will qualify.
 */

const BAY_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// buildWall inflates the backing wall to cellSize/2 + 0.01, so the seat's back has to
// stop short of that or addFurniture reads it as a collision and drops the whole thing.
const WALL_GAP = 0.06;
const PLACARD_Y = 1.72;

/** A long wooden bench, worn smooth. The oldest thing in the room. */
function buildHallPew(env) {
    const group = new THREE.Group();
    const w = 2.2, seatH = 0.45, d = 0.42;

    const seat = new THREE.Mesh(env._boxGeo(w, 0.07, d), env.woodMat);
    seat.position.set(0, seatH, 0);
    group.add(seat);

    const back = new THREE.Mesh(env._boxGeo(w, 0.38, 0.06), env.woodMat);
    back.position.set(0, seatH + 0.28, -d / 2 + 0.03);
    back.rotation.x = -0.08;
    group.add(back);

    for (const lx of [-w / 2 + 0.18, w / 2 - 0.18]) {
        const leg = new THREE.Mesh(env._boxGeo(0.07, seatH, d - 0.04), env.woodMat);
        leg.position.set(lx, seatH / 2, 0);
        group.add(leg);
    }

    const stretcher = new THREE.Mesh(env._boxGeo(w - 0.5, 0.05, 0.05), env.woodMat);
    stretcher.position.set(0, 0.16, 0);
    group.add(stretcher);

    group.traverse((m) => {
        if (m.isMesh) m.castShadow = true;
    });
    return group;
}

/**
 * Small enamel placard. Cached per label on env, so eight labels means eight textures
 * for the whole run rather than one per archway.
 */
function placardMaterial(env, label) {
    if (!env._bayPlacardMats) env._bayPlacardMats = new Map();
    if (env._bayPlacardMats.has(label)) return env._bayPlacardMats.get(label);

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const c = canvas.getContext('2d');

    c.fillStyle = '#d8cfae';
    c.fillRect(0, 0, 128, 64);
    c.strokeStyle = 'rgba(40,34,20,0.45)';
    c.lineWidth = 3;
    c.strokeRect(5, 5, 118, 54);

    c.fillStyle = 'rgba(38,32,18,0.75)';
    c.font = 'bold 13px monospace';
    c.textAlign = 'center';
    c.fillText('BAY', 64, 26);
    c.font = 'bold 30px monospace';
    c.fillText(label, 64, 53);

    // A little grime so it does not read as freshly printed.
    c.fillStyle = 'rgba(60,50,25,0.10)';
    for (let i = 0; i < 40; i++) {
        const sx = Math.random() * 128;
        const sy = Math.random() * 64;
        c.fillRect(sx, sy, 1 + Math.random() * 3, 1 + Math.random() * 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    const mat = new THREE.MeshStandardMaterial({map: tex, roughness: 0.85, metalness: 0.0});
    if (env.sharedAssets) {
        env.sharedAssets.add(mat.uuid);
        env.sharedAssets.add(tex.uuid);
    }
    env._bayPlacardMats.set(label, mat);
    return mat;
}

/**
 * @param dirX,dirZ  unit vector from the cell centre toward the wall the seat backs onto
 */
export function placeArchWaitingArea(env, ctx, cellX, cellZ, dirX, dirZ) {
    const {random, addFurniture, addGeometry} = ctx;
    if (!addFurniture) return false;

    const cx = cellX * env.cellSize;
    const cz = cellZ * env.cellSize;
    // Seat faces away from the wall it backs onto, so it looks across the passage.
    const rotY = Math.atan2(-dirX, -dirZ);

    const roll = random();
    let seat;
    if (roll > 0.66) {
        seat = buildWaitingBench(env, {
            padMat: env.fabricMat,
            frameMat: env.pittedMetalMat || env.metalMat,
            scale: 1.25
        });
    } else if (roll > 0.33 && ctx.buildCouch) {
        seat = ctx.buildCouch(0, 0, 0, 0);
        // buildCouch positions and registers itself; reposition below.
    } else {
        seat = buildHallPew(env);
    }
    if (!seat) return false;

    // Every seat in this engine is built facing local +Z with its back toward -Z, so
    // measuring the group tells us how far the back sticks out. Deriving the offset
    // from the actual bounds means the three variants all sit against the wall by the
    // same margin without three hand-tuned numbers going stale.
    seat.position.set(0, 0, 0);
    seat.rotation.y = 0;
    seat.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(seat);
    const backDepth = Math.abs(bounds.min.z);
    const offset = env.cellSize / 2 - WALL_GAP - backDepth;

    seat.position.set(cx + dirX * offset, 0, cz + dirZ * offset);
    seat.rotation.y = rotY;

    // Sittable, like the chairs and couches elsewhere. Waiting is the point.
    const selfRegistered = seat.userData && seat.userData.type === 'seat';
    if (!selfRegistered) {
        seat.userData = {type: 'seat', active: true};
        if (!env.interactables) env.interactables = [];
        env.interactables.push(seat);
    }

    // addFurniture probes the spatial grid and bails if anything is already there,
    // so a blocked cell silently gets no bench rather than a bench inside a pillar.
    const before = ctx.stagingMeshes ? ctx.stagingMeshes.length : 0;
    addFurniture(seat);
    const placed = ctx.stagingMeshes ? ctx.stagingMeshes.length > before : true;
    if (!placed) {
        // buildCouch registers itself as it is built, so an unplaced one has to be
        // pulled back out of the interactables list either way or it lingers as a
        // phantom the player can interact with through a wall.
        if (env.interactables) {
            const i = env.interactables.indexOf(seat);
            if (i > -1) env.interactables.splice(i, 1);
        }
        return false;
    }

    const label = BAY_LABELS[Math.floor(random() * BAY_LABELS.length)];
    const placard = new THREE.Mesh(env._boxGeo(0.42, 0.21, 0.03), placardMaterial(env, label));
    const face = env.cellSize / 2 - 0.05;
    placard.position.set(cx + dirX * face, PLACARD_Y, cz + dirZ * face);
    placard.rotation.y = rotY;
    placard.userData.noCollision = true;
    addGeometry(placard);

    return true;
}
