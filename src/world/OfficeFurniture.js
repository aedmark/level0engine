
/**
 * [ROLE] Provides builder functions for office-themed set-dressing props (water coolers, potted plants, and similar).
 * [WHY] Keeps generic office furniture builders out of sector-specific files so multiple sectors can furnish rooms with the same props.
 * [STATE] Stateless factory functions; each caches its own geometry/materials on the shared `env` object on first use.
 * [DEPENDS] Requires `THREE` globally and an `env` object carrying shared materials and cached geometry helpers.
 */
export function buildWaterCooler(env, x, y, z, rotY = 0) {
    const group = new THREE.Group();
    if (!env.coolerBodyGeo) env.coolerBodyGeo = new THREE.BoxGeometry(0.45, 1.15, 0.45);
    if (!env.coolerJugGeo) env.coolerJugGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.55, 12);
    if (!env.coolerWaterMat) env.coolerWaterMat = new THREE.MeshStandardMaterial({
        color: 0xaaeeff, transparent: true, opacity: 0.6, roughness: 0.2, emissive: 0x3388bb, emissiveIntensity: 0.2
    });
    const body = new THREE.Mesh(env.coolerBodyGeo, env.baseHousingMat);
    body.position.set(0, 0.575, 0);
    group.add(body);
    const jug = new THREE.Mesh(env.coolerJugGeo, env.coolerWaterMat);
    jug.position.set(0, 1.425, 0);
    group.add(jug);
    const spout = new THREE.Mesh(env._boxGeo(0.05, 0.05, 0.08), env.metalMat);
    spout.position.set(0, 0.95, 0.25);
    group.add(spout);
    
    const trayBody = new THREE.Mesh(env._boxGeo(0.3, 0.08, 0.16), env.baseHousingMat);
    trayBody.position.set(0, 0.75, 0.28);
    group.add(trayBody);
    
    const trayGrate = new THREE.Mesh(env._boxGeo(0.24, 0.02, 0.12), env.metalMat);
    trayGrate.position.set(0, 0.79, 0.28);
    group.add(trayGrate);

    group.position.set(x, y, z);
    group.rotation.y = rotY;
    return group;
}

export function buildPottedPlant(env, x, y, z) {
    const group = new THREE.Group();
    if (!env.potGeo) env.potGeo = new THREE.CylinderGeometry(0.28, 0.22, 0.5, 8);
    if (!env.potMat) env.potMat = new THREE.MeshStandardMaterial({color: 0xeeddcc, roughness: 0.9});
    if (!env.fernMat) {
        env.fernMat = new THREE.MeshStandardMaterial({
            map: env.fernTex,
            transparent: true,
            alphaTest: 0.5,
            side: THREE.DoubleSide,
            roughness: 0.9,
            emissive: 0x999999,
            emissiveIntensity: 0.08,
            userData: {noShadow: true}
        });
    }
    const pot = new THREE.Mesh(env.potGeo, env.potMat);
    pot.position.set(0, 0.25, 0);
    group.add(pot);
    
    const planeSize = 1.25;
    if (!env.fernGeo) {
        env.fernGeo = new THREE.PlaneGeometry(planeSize, planeSize);
        env.fernGeo.translate(0, planeSize / 2, 0);
    }
    
    const f1 = new THREE.Mesh(env.fernGeo, env.fernMat);
    f1.position.set(0, 0.45, 0);
    group.add(f1);
    
    const f2 = new THREE.Mesh(env.fernGeo, env.fernMat);
    f2.position.set(0, 0.45, 0);
    f2.rotation.y = Math.PI / 2;
    group.add(f2);

    group.position.set(x, y, z);
    return group;
}

export function buildFilingCabinet(env, random, x, y, z, rotY = 0) {
    const cab = new THREE.Group();
    if (!env.cabinetMat) {
        env.cabinetMat = new THREE.MeshStandardMaterial({color: 0x999999, roughness: 0.4, metalness: 0.3});
        if (env.sharedAssets) env.sharedAssets.add(env.cabinetMat.uuid);
    }
    const bodyWidth = 0.65;
    const bodyHeight = 1.65;
    const bodyDepth = 0.75;
    const body = new THREE.Mesh(env._boxGeo(bodyWidth, bodyHeight, bodyDepth), env.cabinetMat);
    body.position.y = bodyHeight / 2;
    cab.add(body);
    
    const drawerCount = 3 + Math.floor(random() * 2);
    const margin = 0.05;
    const availableHeight = bodyHeight - margin * 2;
    const drawerH = availableHeight / drawerCount;
    
    for (let i = 0; i < drawerCount; i++) {
        const yPos = margin + drawerH / 2 + i * drawerH;
        const face = new THREE.Mesh(env._boxGeo(bodyWidth - 0.04, drawerH - 0.02, 0.04), env.cabinetMat);
        face.position.set(0, yPos, bodyDepth / 2 + 0.02);
        cab.add(face);
        
        const handle = new THREE.Mesh(env._boxGeo(0.26, 0.04, 0.04), env.metalMat);
        handle.position.set(0, yPos, bodyDepth / 2 + 0.04 + 0.02);
        cab.add(handle);
    }
    if (random() > 0.55) {
        const body2Width = 0.65;
        const body2Height = 1.25;
        const body2Depth = 0.75;
        const body2 = new THREE.Mesh(env._boxGeo(body2Width, body2Height, body2Depth), env.cabinetMat);
        body2.position.set(bodyWidth + 0.02, body2Height / 2, 0);
        cab.add(body2);
        
        const drawerCount2 = 2 + Math.floor(random() * 2);
        const availableHeight2 = body2Height - margin * 2;
        const drawerH2 = availableHeight2 / drawerCount2;
        
        for (let i = 0; i < drawerCount2; i++) {
            const yPos = margin + drawerH2 / 2 + i * drawerH2;
            const face = new THREE.Mesh(env._boxGeo(body2Width - 0.04, drawerH2 - 0.02, 0.04), env.cabinetMat);
            face.position.set(bodyWidth + 0.02, yPos, body2Depth / 2 + 0.02);
            cab.add(face);

            const handle = new THREE.Mesh(env._boxGeo(0.26, 0.04, 0.04), env.metalMat);
            handle.position.set(bodyWidth + 0.02, yPos, body2Depth / 2 + 0.04 + 0.02);
            cab.add(handle);
        }
    }
    cab.position.set(x, y, z);
    cab.rotation.y = rotY;
    return cab;
}

export function buildBulletinBoard(env, random, x, y, z, rotY = 0) {
    const group = new THREE.Group();
    if (!env.pegboardMat) {
        env.pegboardMat = new THREE.MeshStandardMaterial({color: 0xc2a67a, roughness: 0.9});
    }
    if (!env.paperMat) env.paperMat = new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.9});
    const board = new THREE.Mesh(env._boxGeo(1.6, 1.0, 0.04), env.pegboardMat);
    board.position.set(0, 0, 0);
    group.add(board);
    const frameGeo = env._boxGeo(1.64, 1.04, 0.02);
    const frame = new THREE.Mesh(frameGeo, env.metalMat);
    frame.position.set(0, 0, -0.01);
    group.add(frame);
    const numPapers = 5 + Math.floor(random() * 8);
    for (let i = 0; i < numPapers; i++) {
        const paper = new THREE.Mesh(env._boxGeo(0.18 + random() * 0.05, 0.25 + random() * 0.05, 0.01), env.paperMat);
        paper.position.set((random() - 0.5) * 1.4, (random() - 0.5) * 0.8, 0.025);
        paper.rotation.z = (random() - 0.5) * 0.4;
        group.add(paper);
    }
    group.position.set(x, y, z);
    group.rotation.y = rotY;
    return group;
}
