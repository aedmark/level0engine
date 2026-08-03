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
    env.sharedAssets.add(env.clinicBedFrameMat.uuid);
    env.sharedAssets.add(env.clinicMattressMat.uuid);
    env.sharedAssets.add(env.clinicBagMat.uuid);
    env.sharedAssets.add(env.clinicPlasticMat.uuid);
    env.sharedAssets.add(env.clinicMonitorScreenMat.uuid);
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
    for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(railGeo, frameMat);
        rail.position.set(side * 0.47, 0.88, 0.05);
        group.add(rail);
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
