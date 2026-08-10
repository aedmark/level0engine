/**
 * [ROLE] Generates various 3D models for clinic-themed furniture (beds, monitors, wheelchairs, etc.).
 * [WHY] Provides domain-specific visual assets to populate the clinic sector of the map, enriching the environment.
 * [STATE] Stateless builders. Adds materials to `env.sharedAssets` and caches geometries.
 * [DEPENDS] Requires `THREE` globally and the environment `env` object for caching.
 */
function ecgScreenTexture() {
    const W = 128, H = 64;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const c = canvas.getContext('2d');
    c.fillStyle = '#03110a';
    c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(70, 255, 170, 0.12)';
    c.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 8) {
        c.beginPath();
        c.moveTo(gx, 0);
        c.lineTo(gx, H);
        c.stroke();
    }
    for (let gy = 0; gy < H; gy += 8) {
        c.beginPath();
        c.moveTo(0, gy);
        c.lineTo(W, gy);
        c.stroke();
    }
    c.strokeStyle = '#5dffb0';
    c.lineWidth = 2;
    c.lineJoin = 'round';
    c.beginPath();
    const midY = H * 0.56;
    c.moveTo(0, midY);
    let x = 0;
    while (x < W) {
        const beatW = 24;
        c.lineTo(x + beatW * 0.30, midY);
        c.lineTo(x + beatW * 0.38, midY + 5);
        c.lineTo(x + beatW * 0.46, midY - 22);
        c.lineTo(x + beatW * 0.54, midY + 12);
        c.lineTo(x + beatW * 0.62, midY);
        c.lineTo(x + beatW * 0.85, midY);
        x += beatW;
    }
    c.stroke();
    c.fillStyle = 'rgba(93, 255, 176, 0.85)';
    c.font = '9px monospace';
    c.fillText('72', 5, 12);
    return new THREE.CanvasTexture(canvas);
}

function ensureClinicFurnitureMats(env) {
    if (env.clinicBedFrameMat) return;
    env.clinicBedFrameMat = new THREE.MeshStandardMaterial({color: 0xd7dbd6, roughness: 0.5, metalness: 0.55});
    env.clinicMattressMat = new THREE.MeshStandardMaterial({color: 0xb9c7c2, roughness: 0.85, metalness: 0.02});
    env.clinicBagMat = new THREE.MeshStandardMaterial({
        color: 0xdde8c8, roughness: 0.2, metalness: 0.0, transparent: true, opacity: 0.72
    });
    env.clinicPlasticMat = new THREE.MeshStandardMaterial({color: 0xd6d2c4, roughness: 0.55, metalness: 0.05});
    env.clinicMonitorScreenMat = new THREE.MeshBasicMaterial({map: ecgScreenTexture()});
    env.clinicVinylMat = new THREE.MeshStandardMaterial({color: 0x415a54, roughness: 0.75, metalness: 0.02});
    env.clinicTireMat = new THREE.MeshStandardMaterial({color: 0x1c1c1c, roughness: 0.85, metalness: 0.0});
    env.clinicBasinMat = new THREE.MeshStandardMaterial({
        color: 0xd6d2c4, roughness: 0.5, metalness: 0.05, side: THREE.DoubleSide
    });
    env.sharedAssets.add(env.clinicBedFrameMat.uuid);
    env.sharedAssets.add(env.clinicMattressMat.uuid);
    env.sharedAssets.add(env.clinicBagMat.uuid);
    env.sharedAssets.add(env.clinicPlasticMat.uuid);
    env.sharedAssets.add(env.clinicMonitorScreenMat.uuid);
    env.sharedAssets.add(env.clinicVinylMat.uuid);
    env.sharedAssets.add(env.clinicTireMat.uuid);
    env.sharedAssets.add(env.clinicBasinMat.uuid);
}

export function buildClinicBed(env) {
    ensureClinicFurnitureMats(env);
    const group = new THREE.Group();
    const frameMat = env.clinicBedFrameMat;
    const legGeo = env._cacheGeo('clinicBedLeg', () => new THREE.CylinderGeometry(0.03, 0.03, 0.42, 6));
    for (const lx of [-0.4, 0.4]) {
        for (const lz of [-0.85, 0.85]) {
            const leg = new THREE.Mesh(legGeo, frameMat);
            leg.position.set(lx, 0.21, lz);
            group.add(leg);
            const caster = new THREE.Mesh(env._cacheGeo('clinicBedCaster', () => new THREE.CylinderGeometry(0.045, 0.045, 0.05, 8)), env.baseHousingMat);
            caster.position.set(lx, 0.025, lz);
            group.add(caster);
        }
    }
    const frame = new THREE.Mesh(env._boxGeo(0.9, 0.08, 1.9), frameMat);
    frame.position.y = 0.46;
    group.add(frame);
    const mattress = new THREE.Mesh(env._boxGeo(0.82, 0.16, 1.78), env.clinicMattressMat);
    mattress.position.y = 0.58;
    group.add(mattress);
    const headboard = new THREE.Mesh(env._boxGeo(0.9, 0.55, 0.06), frameMat);
    headboard.position.set(0, 0.75, 0.95);
    group.add(headboard);
    const footboard = new THREE.Mesh(env._boxGeo(0.9, 0.32, 0.05), frameMat);
    footboard.position.set(0, 0.62, -0.95);
    group.add(footboard);
    const railGeo = env._cacheGeo('clinicBedRail', () => new THREE.BoxGeometry(0.04, 0.04, 1.4));
    const railSupportGeo = env._cacheGeo('clinicBedRailSupport', () => new THREE.BoxGeometry(0.02, 0.38, 0.02));
    for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(railGeo, frameMat);
        rail.position.set(side * 0.47, 0.88, 0.05);
        group.add(rail);
        for (const zOffset of [-0.5, 0.5]) {
            const support = new THREE.Mesh(railSupportGeo, frameMat);
            support.position.set(side * 0.47, 0.69, 0.05 + zOffset);
            group.add(support);
        }
    }
    group.traverse((m) => {
        if (m.isMesh) m.castShadow = true;
    });
    return group;
}

export function buildIVPole(env) {
    ensureClinicFurnitureMats(env);
    const group = new THREE.Group();
    const mat = env.metalMat;
    const base = new THREE.Mesh(env._cacheGeo('clinicIVBase', () => new THREE.CylinderGeometry(0.16, 0.18, 0.03, 10)), mat);
    base.position.y = 0.015;
    group.add(base);
    const pole = new THREE.Mesh(env._cacheGeo('clinicIVPole', () => new THREE.CylinderGeometry(0.018, 0.018, 1.4, 8)), mat);
    pole.position.y = 0.73;
    group.add(pole);
    const arm = new THREE.Mesh(env._cacheGeo('clinicIVArm', () => new THREE.BoxGeometry(0.28, 0.02, 0.02)), mat);
    arm.position.set(0.13, 1.42, 0);
    group.add(arm);
    const hook = new THREE.Mesh(env._cacheGeo('clinicIVHook', () => new THREE.BoxGeometry(0.02, 0.06, 0.02)), mat);
    hook.position.set(0.26, 1.38, 0);
    group.add(hook);
    const bag = new THREE.Mesh(env._boxGeo(0.12, 0.16, 0.035), env.clinicBagMat);
    bag.position.set(0.26, 1.28, 0);
    group.add(bag);
    group.traverse((m) => {
        if (m.isMesh) m.castShadow = true;
    });
    return group;
}

export function buildHeartMonitor(env) {
    ensureClinicFurnitureMats(env);
    const group = new THREE.Group();
    const foot = new THREE.Mesh(env._boxGeo(0.36, 0.03, 0.3), env.baseHousingMat);
    foot.position.y = 0.015;
    group.add(foot);
    const post = new THREE.Mesh(env._cacheGeo('clinicMonPost', () => new THREE.CylinderGeometry(0.025, 0.025, 0.75, 8)), env.metalMat);
    post.position.y = 0.39;
    group.add(post);
    const housing = new THREE.Mesh(env._boxGeo(0.34, 0.26, 0.14), env.baseHousingMat);
    housing.position.y = 0.895;
    group.add(housing);
    const screen = new THREE.Mesh(env._planeGeo(0.28, 0.2), env.clinicMonitorScreenMat);
    screen.position.set(0, 0.9, 0.071);
    group.add(screen);
    const btnGeo = env._cacheGeo('clinicMonButton', () => new THREE.BoxGeometry(0.03, 0.02, 0.01));
    for (let i = -1; i <= 1; i++) {
        const btn = new THREE.Mesh(btnGeo, env.metalMat);
        btn.position.set(i * 0.08, 0.775, 0.071);
        group.add(btn);
    }
    group.traverse((m) => {
        if (m.isMesh) m.castShadow = true;
    });
    return group;
}

export function buildBedpan(env) {
    ensureClinicFurnitureMats(env);
    const basin = new THREE.Mesh(
        env._cacheGeo('clinicBedpan', () => new THREE.SphereGeometry(0.15, 10, 6)),
        env.clinicPlasticMat
    );
    basin.scale.set(1.0, 0.3, 0.65);
    basin.position.y = 0.045;
    basin.castShadow = true;
    return basin;
}

export function buildWheelchair(env) {
    ensureClinicFurnitureMats(env);
    const group = new THREE.Group();
    const frameMat = env.metalMat;
    const seatMat = env.clinicVinylMat;
    const tireMat = env.clinicTireMat;

    const seat = new THREE.Mesh(env._boxGeo(0.46, 0.04, 0.44), seatMat);
    seat.position.set(0, 0.5, 0.05);
    group.add(seat);
    const back = new THREE.Mesh(env._boxGeo(0.46, 0.5, 0.04), seatMat);
    back.position.set(0, 0.78, -0.19);
    back.rotation.x = -0.12;
    group.add(back);

    const railGeo = env._cacheGeo('wcRail', () => new THREE.CylinderGeometry(0.018, 0.018, 0.5, 6));
    for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(railGeo, frameMat);
        rail.rotation.x = Math.PI / 2;
        rail.position.set(side * 0.24, 0.48, 0.05);
        group.add(rail);
    }

    const RAIL_Y = 0.48, FRAME_X = 0.24, FRONT_Z = 0.32, REAR_Z = -0.05, CHASSIS_Y = 0.16;

    const armGeo = env._boxGeo(0.04, 0.04, 0.34);
    const armPostGeo = env._cacheGeo('wcArmPost', () => new THREE.CylinderGeometry(0.016, 0.016, 0.63 - RAIL_Y + 0.02, 6));
    for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(armGeo, frameMat);
        arm.position.set(side * 0.25, 0.63, 0.02);
        group.add(arm);
        const p1 = new THREE.Mesh(armPostGeo, frameMat);
        p1.position.set(side * 0.25, (RAIL_Y + 0.63) / 2, 0.15);
        group.add(p1);
        const p2 = new THREE.Mesh(armPostGeo, frameMat);
        p2.position.set(side * 0.25, (RAIL_Y + 0.63) / 2, -0.11);
        group.add(p2);
    }

    const handleBar = new THREE.Mesh(env._cacheGeo('wcHandleBar', () => new THREE.CylinderGeometry(0.014, 0.014, 0.42, 8)), frameMat);
    handleBar.rotation.z = Math.PI / 2;
    handleBar.position.set(0, 1.0, -0.28);
    group.add(handleBar);
    const handleMountGeo = env._cacheGeo('wcHandleMount', () => new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6));
    for (const side of [-1, 1]) {
        const mount = new THREE.Mesh(handleMountGeo, frameMat);
        mount.rotation.x = Math.PI / 2.3;
        mount.position.set(side * 0.17, 0.98, -0.23);
        group.add(mount);
    }

    const bigWheelGeo = env._cacheGeo('wcBigWheel', () => new THREE.CylinderGeometry(0.29, 0.29, 0.04, 20));
    const hubGeo = env._cacheGeo('wcHub', () => new THREE.CylinderGeometry(0.06, 0.06, 0.045, 10));
    const rimGeo = env._cacheGeo('wcRim', () => new THREE.TorusGeometry(0.24, 0.008, 6, 16));
    for (const side of [-1, 1]) {
        const wheel = new THREE.Mesh(bigWheelGeo, tireMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 0.29, 0.29, -0.05);
        group.add(wheel);
        const hub = new THREE.Mesh(hubGeo, frameMat);
        hub.rotation.z = Math.PI / 2;
        hub.position.set(side * 0.29, 0.29, -0.05);
        group.add(hub);
        const rim = new THREE.Mesh(rimGeo, frameMat);
        rim.rotation.y = Math.PI / 2;
        rim.position.set(side * (0.29 + 0.025), 0.29, -0.05);
        group.add(rim);
    }

    const chassisGeo = env._cacheGeo('wcChassis', () => new THREE.CylinderGeometry(0.016, 0.016, FRONT_Z - REAR_Z, 6));
    const postGeo = env._cacheGeo('wcPost', () => new THREE.CylinderGeometry(0.016, 0.016, RAIL_Y - CHASSIS_Y, 6));
    const axleBracketGeo = env._cacheGeo('wcAxleBracket', () => new THREE.CylinderGeometry(0.014, 0.014, 0.29 - FRAME_X, 6));
    for (const side of [-1, 1]) {
        const chassis = new THREE.Mesh(chassisGeo, frameMat);
        chassis.rotation.x = Math.PI / 2;
        chassis.position.set(side * FRAME_X, CHASSIS_Y, (FRONT_Z + REAR_Z) / 2);
        group.add(chassis);

        const frontPost = new THREE.Mesh(postGeo, frameMat);
        frontPost.position.set(side * FRAME_X, (RAIL_Y + CHASSIS_Y) / 2, FRONT_Z);
        group.add(frontPost);

        const rearPost = new THREE.Mesh(postGeo, frameMat);
        rearPost.position.set(side * FRAME_X, (RAIL_Y + CHASSIS_Y) / 2, REAR_Z);
        group.add(rearPost);

        const axleBracket = new THREE.Mesh(axleBracketGeo, frameMat);
        axleBracket.rotation.z = Math.PI / 2;
        axleBracket.position.set(side * (FRAME_X + 0.025), 0.29, REAR_Z);
        group.add(axleBracket);
    }

    const casterGeo = env._cacheGeo('wcCaster', () => new THREE.CylinderGeometry(0.06, 0.06, 0.03, 10));
    const forkGeo = env._cacheGeo('wcFork', () => new THREE.CylinderGeometry(0.012, 0.012, CHASSIS_Y - 0.06, 6));
    for (const side of [-1, 1]) {
        const caster = new THREE.Mesh(casterGeo, tireMat);
        caster.rotation.z = Math.PI / 2;
        caster.position.set(side * FRAME_X, 0.06, FRONT_Z);
        group.add(caster);
        const fork = new THREE.Mesh(forkGeo, frameMat);
        fork.position.set(side * FRAME_X, (CHASSIS_Y + 0.06) / 2, FRONT_Z);
        group.add(fork);
    }

    const footZ = 0.42;
    const footPlate = new THREE.Mesh(env._boxGeo(0.36, 0.02, 0.14), frameMat);
    footPlate.position.set(0, CHASSIS_Y, footZ);
    group.add(footPlate);
    const footStrutGeo = env._cacheGeo('wcFootStrut', () => new THREE.CylinderGeometry(0.014, 0.014, footZ - FRONT_Z, 6));
    for (const side of [-1, 1]) {
        const strut = new THREE.Mesh(footStrutGeo, frameMat);
        strut.rotation.x = Math.PI / 2;
        strut.position.set(side * 0.12, CHASSIS_Y, (footZ + FRONT_Z) / 2);
        group.add(strut);
    }

    group.scale.setScalar(1.4);
    group.traverse((m) => {
        if (m.isMesh) m.castShadow = true;
    });
    return group;
}

export function buildWaitingBench(env) {
    ensureClinicFurnitureMats(env);
    const group = new THREE.Group();
    const frameMat = env.metalMat;
    const padMat = env.clinicVinylMat;
    const width = 1.8, seatH = 0.46, depth = 0.5;

    const padGeo = env._boxGeo(0.56, 0.06, depth - 0.06);
    for (let i = 0; i < 3; i++) {
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.set(-width / 2 + 0.3 + i * 0.6, seatH, 0);
        group.add(pad);
    }
    const backGeo = env._boxGeo(0.56, 0.42, 0.05);
    for (let i = 0; i < 3; i++) {
        const back = new THREE.Mesh(backGeo, padMat);
        back.position.set(-width / 2 + 0.3 + i * 0.6, seatH + 0.24, -depth / 2 + 0.05);
        back.rotation.x = -0.06;
        group.add(back);
    }

    const railGeo = env._cacheGeo('benchRail', () => new THREE.BoxGeometry(width, 0.04, 0.06));
    const rail = new THREE.Mesh(railGeo, frameMat);
    rail.position.set(0, seatH - 0.05, depth / 2 - 0.05);
    group.add(rail);
    const railBack = new THREE.Mesh(railGeo, frameMat);
    railBack.position.set(0, seatH - 0.05, -depth / 2 + 0.05);
    group.add(railBack);

    const legGeo = env._cacheGeo('benchLeg', () => new THREE.CylinderGeometry(0.02, 0.02, seatH, 6));
    for (const lx of [-width / 2 + 0.12, width / 2 - 0.12]) {
        for (const lz of [depth / 2 - 0.08, -depth / 2 + 0.08]) {
            const leg = new THREE.Mesh(legGeo, frameMat);
            leg.position.set(lx, seatH / 2, lz);
            group.add(leg);
        }
    }
    const centerLeg = new THREE.Mesh(legGeo, frameMat);
    centerLeg.position.set(0, seatH / 2, depth / 2 - 0.08);
    group.add(centerLeg);
    const centerLegBack = new THREE.Mesh(legGeo, frameMat);
    centerLegBack.position.set(0, seatH / 2, -depth / 2 + 0.08);
    group.add(centerLegBack);

    const armGeo = env._boxGeo(0.04, 0.16, depth - 0.1);
    const armPostGeo = env._cacheGeo('benchArmPost', () => new THREE.CylinderGeometry(0.02, 0.02, 0.24, 6));
    for (const ax of [-width / 2 + 0.6, -width / 2 + 1.2]) {
        const arm = new THREE.Mesh(armGeo, frameMat);
        arm.position.set(ax, seatH + 0.16, 0);
        group.add(arm);
        const post = new THREE.Mesh(armPostGeo, frameMat);
        post.position.set(ax, seatH - 0.03, 0);
        group.add(post);
    }

    group.scale.setScalar(1.4);
    group.traverse((m) => {
        if (m.isMesh) m.castShadow = true;
    });
    return group;
}

export function buildWaterFountain(env) {
    ensureClinicFurnitureMats(env);
    const group = new THREE.Group();
    const bodyMat = env.clinicPlasticMat;
    const metalTrim = env.metalMat;

    const plate = new THREE.Mesh(env._boxGeo(0.34, 0.5, 0.04), bodyMat);
    plate.position.set(0, 0.95, -0.02);
    group.add(plate);

    const basinRadius = 0.1;
    const basinY = 0.74;
    const basin = new THREE.Mesh(
        env._cacheGeo('fountainBasin', () => new THREE.SphereGeometry(basinRadius, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)),
        env.clinicBasinMat
    );
    basin.position.set(0, basinY, 0.11);
    group.add(basin);

    const grille = new THREE.Mesh(env._cacheGeo('fountainGrille', () => new THREE.CylinderGeometry(0.065, 0.065, 0.008, 10)), metalTrim);
    grille.position.set(0, basinY - basinRadius + 0.03, 0.11);
    group.add(grille);

    const spoutArm = new THREE.Mesh(env._cacheGeo('fountainSpoutArm', () => new THREE.CylinderGeometry(0.012, 0.012, 0.07, 8)), metalTrim);
    spoutArm.rotation.x = Math.PI / 2;
    spoutArm.position.set(0, 0.86, 0.035);
    group.add(spoutArm);
    const spoutDrop = new THREE.Mesh(env._cacheGeo('fountainSpoutDrop', () => new THREE.CylinderGeometry(0.01, 0.01, 0.1, 8)), metalTrim);
    spoutDrop.position.set(0, 0.81, 0.07);
    group.add(spoutDrop);

    const button = new THREE.Mesh(env._cacheGeo('fountainButton', () => new THREE.CylinderGeometry(0.025, 0.025, 0.012, 8)), metalTrim);
    button.rotation.x = Math.PI / 2;
    button.position.set(0.1, 1.0, 0.005);
    group.add(button);

    const bracket = new THREE.Mesh(env._boxGeo(0.22, 0.06, 0.16), metalTrim);
    bracket.position.set(0, basinY - basinRadius - 0.02, 0.06);
    group.add(bracket);

    group.scale.setScalar(1.5);
    group.traverse((m) => {
        if (m.isMesh) m.castShadow = true;
    });
    return group;
}
