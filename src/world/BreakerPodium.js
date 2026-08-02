/**
 * The power breaker, rebuilt as a podium.
 *
 * The old fixture was a flat panel bolted to a three-meter pillar. It read as a texture swatch on a
 * column rather than as a thing a person built and another person operates. This is the same switch
 * with the same effect on the same chunk, given a body: a plinth you stand at, a console head angled
 * up toward the face of whoever is reading it, and a palm reader that wants a hand on it long enough
 * to be sure the hand is yours.
 *
 * The mast is load-bearing in the design sense, not the structural one. Cutting the pillar down to
 * hip height would make breakers invisible at fog distance and turn the radar hunt into a stumble.
 * The conduit runs from the head to the ceiling so the fixture still has a silhouette you can read
 * down a corridor, and so the podium has a reason to be standing where it is: the power comes down
 * to it from above.
 *
 * Everything here is cached through `env._cacheGeo`. A chunk can hold three of these and the world
 * holds many chunks, so per-instance geometry would be a slow leak dressed up as detail.
 */

const PLATE_W = 0.30;
const PLATE_H = 0.32;
// Positive, so the head's top face rolls toward the podium's local +Z and therefore toward whoever
// is standing at it. A negative tilt here angles the reader at the far wall and hides the print,
// which is exactly as useless as it sounds.
const HEAD_TILT = 0.46;
const HEAD_Y = 1.02;
const CEILING_Y = 3.0;

/**
 * Draws the palm reader's etched hand outline.
 *
 * Dark field, luminous print. Used as both albedo and emissive map so the outline stays legible when
 * the plate is idle at low emissive intensity and blooms when the scan drives that intensity up,
 * without needing a second material or a texture swap mid-interaction.
 *
 * @returns {THREE.CanvasTexture}
 */
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

/**
 * Lazily installs the shared podium geometry and materials on the environment.
 *
 * @param {Object} env - Environment, used for its geometry cache and base materials.
 */
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
        // The facility is warm amber everywhere. A neutral grey shell reads as an asset borrowed from
        // some other game and dropped in the corridor, so the podium is tinted into the same family
        // as the walls it stands between and separated from them by value rather than by hue.
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

/**
 * Builds one breaker podium, positioned at its own origin.
 *
 * The returned group carries the same `userData` contract the old pillar breaker did — `type`,
 * `chunkHash`, `active` — so `Environment`'s interact handler and the blackout logic need no
 * knowledge that the fixture changed shape. The extra handles (`plate`, `sweep`, `bead`) are what
 * the scan animation drives.
 *
 * @param {Object} env - Environment.
 * @param {number|string} hash - Chunk hash this breaker cuts power to.
 * @param {Function} [random] - Seeded RNG for cosmetic variation. Defaults to Math.random.
 * @returns {THREE.Group}
 */
export function buildBreakerPodium(env, hash, random = Math.random) {
    const a = ensureAssets(env);
    const podium = new THREE.Group();
    // The group's origin sits at the reader plate, not on the floor. Interaction is resolved by the
    // dot product between the camera's forward vector and the vector to an interactable's origin,
    // so an origin down at the player's feet would fail the >0.75 test at every sane standing
    // distance. Everything below is authored floor-relative and hung off a body offset up to meet it.
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

/**
 * Drives the podium's read-out from a normalised scan value.
 *
 * Called every frame while a scan is live and once on abort. Keeping the visual response in one
 * place means the abort path and the completion path cannot drift out of agreement about what a
 * given progress value should look like.
 *
 * @param {THREE.Group} podium
 * @param {number} t - Scan progress, 0 to 1.
 */
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

/**
 * Locks the podium into its spent state: reader dark, status bead green, no sweep.
 *
 * @param {THREE.Group} podium
 */
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

/** World-space height of the reader plate, which is also the podium group's origin. */
export const PODIUM_PLATE_Y = HEAD_Y;

/** Seconds of continuous contact the reader needs before it accepts a print. */
export const SCAN_DURATION = 1.2;
