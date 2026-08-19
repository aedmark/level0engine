import {attachPropGlow} from '../PropGlow.js';
import {PROP_GLOW} from '../NarrativeProps.js';

const EXIT_DIRS = [
    {dx: 0, dz: 1, spansX: true},
    {dx: 1, dz: 0, spansX: false},
    {dx: 0, dz: -1, spansX: true},
    {dx: -1, dz: 0, spansX: false}
];

const DOOR_HALF_SPAN = 1.55;
const DOOR_TOP = 2.6;
const WALL_THICK = 0.3;
const ROOM_H = 3.0;

export const spawnElevatorCar = (env, ctx, x, z, forcedExitIndex) => {
    const {random, chunkGroup, hash, stagingMeshes, buildWall, addGeometry, buildTable, getLightMaterial} = ctx;
    const cell = env.cellSize;
    const half = cell / 2;
    const cx = x * cell;
    const cz = z * cell;

    if (ctx.markOccupied) ctx.markOccupied(x, z);

    let exitIndex = 0;
    if (forcedExitIndex !== undefined && forcedExitIndex !== null && EXIT_DIRS[forcedExitIndex]) {
        exitIndex = forcedExitIndex;
    } else if (ctx.isWall) {
        const found = EXIT_DIRS.findIndex(d => !ctx.isWall(x + d.dx, z + d.dz));
        if (found !== -1) exitIndex = found;
    }
    const exit = EXIT_DIRS[exitIndex];
    if (ctx.setWall) ctx.setWall(x + exit.dx, z + exit.dz, false);

    const shellMat = env.stainlessMat || env.titaniumMat || env.metalMat || env.sharedWallMat;

    let floor;
    if (env.checkpointFloorMat) {
        const floorGeo = new THREE.PlaneGeometry(cell, cell);
        const uv = floorGeo.attributes.uv;
        for (let i = 0; i < uv.count; i++) {
            uv.setXY(i, uv.getX(i) / 14, uv.getY(i) / 14);
        }
        uv.needsUpdate = true;
        floor = new THREE.Mesh(floorGeo, env.checkpointFloorMat);
    } else {
        floor = new THREE.Mesh(env._planeGeo(cell, cell), env.tileMat);
    }
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0.01, cz);
    addGeometry(floor);

    const shroudMat = env.checkpointWallMat || env.woodMat;
    const sThick = 0.4;
    const sHeight = ROOM_H;
    const sHalf = half + sThick / 2;

    for (const d of EXIT_DIRS) {
        const isExit = d === exit;
        const wx = cx + d.dx * (half - WALL_THICK / 2);
        const wz = cz + d.dz * (half - WALL_THICK / 2);
        if (!isExit) {
            const w = d.dz !== 0 ? cell : WALL_THICK;
            const dep = d.dz !== 0 ? WALL_THICK : cell;
            const wall = buildWall(w, dep, shellMat);
            wall.position.set(wx, ROOM_H / 2, wz);
            wall.userData.isEntityBlocker = true;
            addGeometry(wall);

            const sw = d.dz !== 0 ? cell + sThick * 2 : sThick;
            const sdep = d.dz !== 0 ? sThick : cell + sThick * 2;
            const sWall = buildWall(sw, sdep, shroudMat, sHeight);
            sWall.position.set(cx + d.dx * sHalf, sHeight / 2, cz + d.dz * sHalf);
            sWall.userData.noCollision = true;
            addGeometry(sWall);
            
            continue;
        }
        const jambW = half - DOOR_HALF_SPAN;
        const jambCentre = DOOR_HALF_SPAN + jambW / 2;
        for (const side of [-1, 1]) {
            const jamb = buildWall(
                d.spansX ? jambW : WALL_THICK,
                d.spansX ? WALL_THICK : jambW,
                shellMat
            );
            jamb.position.set(
                wx + (d.spansX ? side * jambCentre : 0),
                ROOM_H / 2,
                wz + (d.spansX ? 0 : side * jambCentre)
            );
            jamb.userData.isEntityBlocker = true;
            addGeometry(jamb);
        }
        const headerH = ROOM_H - DOOR_TOP;
        const header = buildWall(
            d.spansX ? cell : WALL_THICK,
            d.spansX ? WALL_THICK : cell,
            shellMat,
            headerH,
            DOOR_TOP
        );
        header.position.set(wx, DOOR_TOP + headerH / 2, wz);
        header.userData.noCollision = true;
        addGeometry(header);

        for (const side of [-1, 1]) {
            const sjW = d.spansX ? jambW + 0.2 : sThick;
            const sjD = d.spansX ? sThick : jambW + 0.2;
            const sJamb = buildWall(sjW, sjD, shroudMat, sHeight);
            sJamb.position.set(
                cx + d.dx * sHalf + (d.spansX ? side * jambCentre : 0),
                sHeight / 2,
                cz + d.dz * sHalf + (d.spansX ? 0 : side * jambCentre)
            );
            sJamb.userData.noCollision = true;
            addGeometry(sJamb);
        }
    }

    const doorRet = env.setPieces.buildBlastDoor(
        chunkGroup, hash,
        cx + exit.dx * half, cz + exit.dz * half,
        exit.spansX,
        {
            sectorId: null,
            outSign: exit.dz !== 0 ? exit.dz : exit.dx,
            isAirlockDoor: false,
            openRadiusSq: 1.44
        }
    );
    doorRet.group.traverse((child) => {
        if (child.isMesh) child.castShadow = true;
    });

    const table = buildTable(cx - exit.dx * 1.1, 0, cz - exit.dz * 1.1);
    table.userData.chunkHash = hash;
    table.updateMatrixWorld(true);
    const tBox = new THREE.Box3().setFromObject(table);
    tBox.chunkHash = hash;
    tBox.isEntityBlocker = true;
    env.spatialGrid.insert(tBox);
    table.traverse((child) => {
        if (child.isMesh) {
            child.userData.chunkHash = hash;
            child.updateMatrixWorld(true);
            stagingMeshes.push(child);
        }
    });

    const spanX = exit.spansX ? 1 : 0;
    const spanZ = exit.spansX ? 0 : 1;
    const tx = cx - exit.dx * 1.1;
    const tz = cz - exit.dz * 1.1;
    const SURFACE_Y = 0.93;
    const PAPER_Y = SURFACE_Y + 0.005;

    if (!env.interactables) env.interactables = [];
    const taken = env.consumedProps || new Set();

    const placePickup = (type, prefab, glowScale, offset) => {
        if (taken.has(`elevator:${type}`)) return;
        const group = new THREE.Group();
        group.add(prefab.clone());
        const glow = new THREE.Mesh(env.glowGeo, env.glowMat);
        glow.scale.set(glowScale, glowScale, glowScale);
        glow.position.y = 0.01;
        group.add(glow);
        group.position.set(tx + spanX * offset, SURFACE_Y, tz + spanZ * offset);
        group.rotation.y = (random() - 0.5) * 0.8;
        group.userData = {type: type, chunkHash: hash, active: true, consumeKey: `elevator:${type}`};
        chunkGroup.add(group);
        env.interactables.push(group);
    };
    placePickup('almond', env.almondPrefab, 0.15, -0.38);
    placePickup('battery', env.batteryPrefab, 0.20, 0.38);

    {
        const note = new THREE.Mesh(env.documentGeo, env.documentMat);
        note.position.set(tx + exit.dx * 0.22, PAPER_Y, tz + exit.dz * 0.22);
        note.rotation.y = Math.atan2(exit.dx, exit.dz);
        note.userData = {
            type: 'document',
            chunkHash: hash,
            active: true,
            zone: null,
            docId: 'NOTE_TUTORIAL'
        };
        chunkGroup.add(note);
        note.updateMatrixWorld(true);
        attachPropGlow(env, note, hash, {...PROP_GLOW.paper, flickerOffset: 0});
        env._registerInteractable(note, hash);
    }

    const activeMat = getLightMaterial(0xffeedd, 0xffaa55, false);
    const panel = new THREE.Mesh(env.sharedPanelGeo, [
        env.baseHousingMat, env.baseHousingMat, env.baseHousingMat,
        activeMat, env.baseHousingMat, env.baseHousingMat
    ]);
    panel.position.set(cx, 2.98, cz);
    chunkGroup.add(panel);
    env.walls.push(panel);
    env.fixtureData.push({
        chunkHash: hash,
        position: new THREE.Vector3(cx, 2.8, cz),
        flickerOffset: 0,
        material: activeMat,
        isFaulty: false,
        baseIntensity: 0.8,
        targetIntensity: 0.8,
        currentIntensity: 0.8,
        isFake: false
    });

    return {
        x: cx + exit.dx * 0.3,
        z: cz + exit.dz * 0.3,
        rotationY: Math.atan2(exit.dx, exit.dz),
        cellX: x,
        cellZ: z,
        exitIndex: exitIndex
    };
};
