import {buildWaitingBench} from '../ClinicFurniture.js';

const BAY_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const WALL_GAP = 0.06;
const PLACARD_Y = 1.72;

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

export function placeArchWaitingArea(env, ctx, cellX, cellZ, dirX, dirZ) {
    const {random, addFurniture, addGeometry} = ctx;
    if (!addFurniture) return false;

    const cx = cellX * env.cellSize;
    const cz = cellZ * env.cellSize;
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
    } else {
        seat = buildHallPew(env);
    }
    if (!seat) return false;

    seat.position.set(0, 0, 0);
    seat.rotation.y = 0;
    seat.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(seat);
    const backDepth = Math.abs(bounds.min.z);
    const offset = env.cellSize / 2 - WALL_GAP - backDepth;

    seat.position.set(cx + dirX * offset, 0, cz + dirZ * offset);
    seat.rotation.y = rotY;

    if (!seat.userData) seat.userData = {};
    seat.userData.type = 'seat';
    seat.userData.active = true;

    if (!addFurniture(seat)) return false;

    const label = BAY_LABELS[Math.floor(random() * BAY_LABELS.length)];
    const placard = new THREE.Mesh(env._boxGeo(0.42, 0.21, 0.03), placardMaterial(env, label));
    const face = env.cellSize / 2 - 0.05;
    placard.position.set(cx + dirX * face, PLACARD_Y, cz + dirZ * face);
    placard.rotation.y = rotY;
    placard.userData.noCollision = true;
    addGeometry(placard);

    return true;
}
