/**
 * [ROLE] Builds and manages the 3D geometry and interactive state of the "Breaker Podium" object.
 * [WHY] Serves as a specific interactive prop in the game world, used for progression or triggering events.
 * [STATE] Stateless builder/utility. Modifies passed `podium` objects via `userData`.
 * [DEPENDS] Requires `THREE` globally and the environment `env` object containing material/geometry caches.
 */
const PLATE_W = 0.30;
const PLATE_H = 0.32;
const HEAD_TILT = 0.46;
const HEAD_Y = 1.02;
const CEILING_Y = 3.0;

function handprintTexture() {
    const S = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = S;
    const c = canvas.getContext('2d');
    c.fillStyle = '#07090a';
    c.fillRect(0, 0, S, S);

    for (let i = 0; i < 140; i++) {
        c.fillStyle = `rgba(120,140,150,${(0.01 + Math.random() * 0.03).toFixed(3)})`;
        c.beginPath();
        c.arc(Math.random() * S, Math.random() * S, 1 + Math.random() * 6, 0, Math.PI * 2);
        c.fill();
    }

    c.strokeStyle = 'rgba(150,215,225,0.85)';
    c.lineWidth = 2.4;
    c.lineJoin = 'round';
    c.lineCap = 'round';

    c.beginPath();
    c.moveTo(44, 108);
    c.bezierCurveTo(30, 96, 28, 74, 38, 62);
    c.bezierCurveTo(48, 50, 80, 50, 90, 62);
    c.bezierCurveTo(100, 74, 98, 96, 84, 108);
    c.closePath();
    c.stroke();

    const FINGERS = [
        {x: 44, top: 26, w: 9},
        {x: 60, top: 18, w: 9.5},
        {x: 76, top: 24, w: 9},
        {x: 90, top: 38, w: 7.5}
    ];
    for (const f of FINGERS) {
        c.beginPath();
        c.moveTo(f.x - f.w, 62);
        c.lineTo(f.x - f.w, f.top + f.w);
        c.arc(f.x, f.top + f.w, f.w, Math.PI, 0);
        c.lineTo(f.x + f.w, 62);
        c.stroke();
    }
    c.beginPath();
    c.moveTo(36, 74);
    c.bezierCurveTo(22, 70, 14, 84, 20, 94);
    c.bezierCurveTo(26, 104, 40, 102, 44, 96);
    c.stroke();

    c.strokeStyle = 'rgba(150,215,225,0.28)';
    c.lineWidth = 1.1;
    for (let i = 0; i < 5; i++) {
        c.beginPath();
        c.moveTo(40 + i * 3, 70 + i * 7);
        c.bezierCurveTo(56, 66 + i * 8, 74, 72 + i * 7, 88 - i * 2, 82 + i * 5);
        c.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
}

function ensureAssets(env) {
    if (env.podiumAssets) return env.podiumAssets;

    const plateTex = handprintTexture();
    const assets = {
        baseGeo: env._cacheGeo('podiumBase', () => new THREE.BoxGeometry(0.60, 0.09, 0.52)),
        stalkGeo: env._cacheGeo('podiumStalk', () => new THREE.BoxGeometry(0.38, 0.90, 0.30)),
        ribGeo: env._cacheGeo('podiumRib', () => new THREE.BoxGeometry(0.04, 0.72, 0.34)),
        headGeo: env._cacheGeo('podiumHead', () => new THREE.BoxGeometry(0.44, 0.13, 0.38)),
        collarGeo: env._cacheGeo('podiumCollar', () => new THREE.BoxGeometry(0.46, 0.06, 0.40)),
        plateGeo: env._cacheGeo('podiumPlate', () => new THREE.PlaneGeometry(PLATE_W, PLATE_H)),
        beadGeo: env._cacheGeo('podiumBead', () => new THREE.SphereGeometry(0.022, 8, 6)),
        mastGeo: env._cacheGeo('podiumMast', () =>
            new THREE.CylinderGeometry(0.05, 0.055, CEILING_Y - HEAD_Y - 0.05, 8)),
        bandGeo: env._cacheGeo('podiumBand', () => new THREE.CylinderGeometry(0.072, 0.072, 0.05, 8)),
        shellMat: new THREE.MeshStandardMaterial({
            color: 0x8a8168, roughness: 0.68, metalness: 0.5
        }),
        trimMat: new THREE.MeshStandardMaterial({
            color: 0x4a4436, roughness: 0.42, metalness: 0.78
        }),
        plateMat: new THREE.MeshStandardMaterial({
            map: plateTex,
            emissiveMap: plateTex,
            emissive: 0xffffff,
            emissiveIntensity: 0.22,
            roughness: 0.18,
            metalness: 0.1
        }),
        sweepMat: new THREE.MeshBasicMaterial({
            color: 0x9fe6f2, transparent: true, opacity: 0.0,
            blending: THREE.AdditiveBlending, depthWrite: false
        }),
        beadMat: new THREE.MeshStandardMaterial({
            color: 0x8a2b22, emissive: 0xff4433, emissiveIntensity: 0.9, roughness: 0.3
        })
    };
    env.podiumAssets = assets;
    return assets;
}

export function buildBreakerPodium(env, hash, random = Math.random) {
    const a = ensureAssets(env);
    const podium = new THREE.Group();
    const body = new THREE.Group();
    body.position.y = -HEAD_Y;
    podium.add(body);

    const base = new THREE.Mesh(a.baseGeo, a.trimMat);
    base.position.y = 0.05;
    body.add(base);

    const stalk = new THREE.Mesh(a.stalkGeo, a.shellMat);
    stalk.position.y = 0.56;
    body.add(stalk);

    for (const sx of [-1, 1]) {
        const rib = new THREE.Mesh(a.ribGeo, a.trimMat);
        rib.position.set(sx * 0.198, 0.54, 0);
        body.add(rib);
    }

    const collar = new THREE.Mesh(a.collarGeo, a.trimMat);
    collar.position.y = 0.99;
    body.add(collar);

    const head = new THREE.Group();
    head.position.y = HEAD_Y;
    head.rotation.x = HEAD_TILT;
    body.add(head);

    const shell = new THREE.Mesh(a.headGeo, a.shellMat);
    head.add(shell);

    const plate = new THREE.Mesh(a.plateGeo, a.plateMat.clone());
    plate.rotation.x = -Math.PI / 2;
    plate.position.set(0, 0.067, 0.005);
    head.add(plate);

    const sweep = new THREE.Mesh(a.plateGeo, a.sweepMat.clone());
    sweep.rotation.x = -Math.PI / 2;
    sweep.position.set(0, 0.070, 0.005);
    sweep.scale.y = 0.12;
    head.add(sweep);

    const bead = new THREE.Mesh(a.beadGeo, a.beadMat.clone());
    bead.position.set(0.17, 0.02, 0.17);
    head.add(bead);

    const mast = new THREE.Mesh(a.mastGeo, a.shellMat);
    mast.position.set(0, HEAD_Y + (CEILING_Y - HEAD_Y) / 2, -0.13);
    body.add(mast);

    for (let i = 0; i < 2; i++) {
        const band = new THREE.Mesh(a.bandGeo, a.trimMat);
        band.position.set(0, 1.45 + i * 0.75 + random() * 0.12, -0.13);
        body.add(band);
    }

    podium.userData = {
        type: 'breaker',
        chunkHash: hash,
        active: true,
        plate: plate,
        sweep: sweep,
        bead: bead,
        scan: 0
    };
    return podium;
}

export function setPodiumScan(podium, t) {
    const ud = podium.userData;
    if (!ud || !ud.plate) return;
    ud.scan = t;
    const eased = t * t * (3 - 2 * t);
    ud.plate.material.emissiveIntensity = 0.22 + eased * 1.5;
    ud.sweep.material.opacity = t > 0 ? 0.30 + Math.sin(t * Math.PI) * 0.35 : 0.0;
    ud.sweep.position.z = 0.01 + (PLATE_H * 0.5 - PLATE_H * t);
    if (ud.bead) {
        ud.bead.material.emissiveIntensity = 0.9 + Math.sin(t * Math.PI * 8) * t * 1.4;
    }
}

export function setPodiumSpent(podium) {
    const ud = podium.userData;
    if (!ud || !ud.plate) return;
    ud.scan = 0;
    ud.plate.material.emissiveIntensity = 0.06;
    ud.sweep.material.opacity = 0.0;
    if (ud.bead) {
        ud.bead.material.color.setHex(0x2b8a3a);
        ud.bead.material.emissive.setHex(0x55ff77);
        ud.bead.material.emissiveIntensity = 1.1;
    }
}

export function setPodiumBroken(podium) {
    const ud = podium.userData;
    if (!ud || !ud.plate) return;
    ud.type = 'broken_breaker';
    ud.active = false;
    ud.scan = 0;
    ud.plate.material.emissiveIntensity = 0.02;
    ud.sweep.material.opacity = 0.0;
    if (ud.bead) {
        ud.bead.material.color.setHex(0x333333);
        ud.bead.material.emissive.setHex(0x000000);
        ud.bead.material.emissiveIntensity = 0;
    }
}

export const PODIUM_PLATE_Y = HEAD_Y;

export const SCAN_DURATION = 1.2;
