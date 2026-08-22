import {placeSectorPaper} from '../NarrativeProps.js';

export const ACME_LEVEL_SPACING = 1.2;

// --- Asset closet --------------------------------------------------------
// The crate/container/stair/arch pass below turned into a visual nightmare
// once everything fired at once - too much competing geometry to read or
// navigate. Rather than delete that work, it's gated off here. The clean-
// slate layout (pit + catwalks + open ceiling) runs instead. Flip this back
// on - or build a smaller, deliberate subset - when we're ready to lay the
// pieces out again one at a time.
const ACME_STASHED_ASSETS_ENABLED = false;

const ACME_PLATFORM_SKIP_CHANCE = 0.58;
const ACME_CONTAINER_CHANCE = 0.05;
const ACME_CATWALK_CHANCE = 0.22;
const ACME_STAIR_CHANCE = 0.27;
const ACME_ARCH_CHANCE = 0.16;
const ACME_ENTRANCE_CLEARANCE_LEVELS = 3;

const createAcmeTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx2d = canvas.getContext('2d');
    ctx2d.fillStyle = '#8B5A2B';
    ctx2d.fillRect(0, 0, 512, 512);
    ctx2d.fillStyle = '#654321';
    for(let i = 0; i < 4; i++) ctx2d.fillRect(0, i * 128, 512, 10);
    ctx2d.fillStyle = '#ff0000';
    ctx2d.font = 'bold 120px sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';
    ctx2d.fillText('ACME', 256, 256);
    return new THREE.CanvasTexture(canvas);
};

const createContainerTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx2d = canvas.getContext('2d');
    const bodyColor = Math.random() > 0.5 ? '#2c5f5a' : '#7a2e2e';
    ctx2d.fillStyle = bodyColor;
    ctx2d.fillRect(0, 0, 512, 512);
    ctx2d.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = 0; i < 512; i += 22) ctx2d.fillRect(0, i, 512, 5);
    ctx2d.fillStyle = 'rgba(130,90,50,0.3)';
    for (let i = 0; i < 8; i++) {
        const rx = Math.random() * 512;
        ctx2d.fillRect(rx, 0, 5 + Math.random() * 10, 512);
    }
    ctx2d.fillStyle = 'rgba(230,220,190,0.85)';
    ctx2d.font = 'bold 42px monospace';
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';
    ctx2d.fillText('ACME-' + (100 + Math.floor(Math.random() * 899)), 256, 230);
    ctx2d.font = 'bold 26px monospace';
    ctx2d.fillText('HANDLE WITH CARE', 256, 280);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
};

export const AcmeSector = (env, ctx) => {
    const { random, chunkGroup, hash } = ctx;
    if (!env.warehouseMat) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx2d = canvas.getContext('2d');
        ctx2d.fillStyle = '#3a3a3a';
        ctx2d.fillRect(0, 0, 512, 512);
        for(let i=0; i<1500; i++) {
            ctx2d.fillStyle = Math.random() > 0.5 ? '#2a2a2a' : '#4a4a4a';
            ctx2d.fillRect(Math.random()*512, Math.random()*512, 3, 3);
        }
        ctx2d.fillStyle = '#111111';
        for(let i=0; i<512; i+=64) {
            ctx2d.fillRect(0, i, 512, 3);
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 2);
        env.warehouseMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0.2 });
    }

    if (!env.acmeMat) env.acmeMat = new THREE.MeshStandardMaterial({ map: createAcmeTexture(), roughness: 0.9 });
    if (!env.acmeContainerMat) env.acmeContainerMat = new THREE.MeshStandardMaterial({ map: createContainerTexture(), roughness: 0.75, metalness: 0.3 });
    if (!env.blackIronMat) env.blackIronMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.7, metalness: 0.9 });

    const buildCratePlatform = (gx, gz, levelBaseY) => {
        const baseSize = env.cellSize * (0.5 + random() * 0.15);
        const isLong = random() > 0.7;
        const sizeX = isLong ? baseSize * (1.3 + random() * 0.4) : baseSize;
        const sizeZ = isLong ? baseSize * 0.7 : baseSize;
        const rotY = isLong && random() > 0.5 ? Math.PI / 2 : 0;
        const topY = levelBaseY + (random() * 1.5) - 0.75;

        const crateGeo = new THREE.BoxGeometry(sizeX, baseSize, sizeZ);
        const crateMesh = new THREE.Mesh(crateGeo, env.acmeMat);
        crateMesh.position.set(gx, topY - baseSize / 2, gz);
        crateMesh.rotation.y = rotY;
        crateMesh.castShadow = true;
        crateMesh.receiveShadow = true;
        chunkGroup.add(crateMesh);

        const bandH = baseSize * 0.12;
        const bandGeo = new THREE.BoxGeometry(sizeX * 1.03, bandH, sizeZ * 1.03);
        const band = new THREE.Mesh(bandGeo, env.blackIronMat);
        band.position.set(gx, topY - baseSize * 0.5, gz);
        band.rotation.y = rotY;
        chunkGroup.add(band);

        const halfX = rotY === 0 ? sizeX / 2 : sizeZ / 2;
        const halfZ = rotY === 0 ? sizeZ / 2 : sizeX / 2;
        const box = new THREE.Box3();
        box.min.set(gx - halfX, topY - baseSize, gz - halfZ);
        box.max.set(gx + halfX, topY, gz + halfZ);
        box.chunkHash = hash;
        env.spatialGrid.insert(box);

        if (random() > 0.82) {
            const stackHeight = Math.floor(random() * 2) + 1;
            for (let s = 1; s <= stackHeight; s++) {
                const smSize = baseSize * 0.4;
                const smGeo = new THREE.BoxGeometry(smSize, smSize, smSize);
                const smMesh = new THREE.Mesh(smGeo, env.acmeMat);
                const ox = (random() - 0.5) * (Math.min(sizeX, sizeZ) - smSize);
                const oz = (random() - 0.5) * (Math.min(sizeX, sizeZ) - smSize);
                smMesh.position.set(gx + ox, topY + (smSize / 2) + (s - 1) * smSize, gz + oz);
                smMesh.rotation.y = random() * Math.PI;
                smMesh.castShadow = true;
                smMesh.receiveShadow = true;
                chunkGroup.add(smMesh);

                const smBox = new THREE.Box3().setFromObject(smMesh);
                smBox.chunkHash = hash;
                smBox.noCeilingClamp = true;
                env.spatialGrid.insert(smBox);
            }
        }
    };

    const buildContainerPlatform = (gx, gz, levelBaseY) => {
        const length = env.cellSize * (1.6 + random() * 0.5);
        const width = env.cellSize * 0.75;
        const height = 2.85;
        const rotY = random() > 0.5 ? 0 : Math.PI / 2;

        const geo = new THREE.BoxGeometry(length, height, width);
        const mesh = new THREE.Mesh(geo, env.acmeContainerMat);
        mesh.position.set(gx, levelBaseY - height / 2, gz);
        mesh.rotation.y = rotY;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        chunkGroup.add(mesh);

        const trimGeo = new THREE.BoxGeometry(length * 1.01, 0.1, width * 1.01);
        const trim = new THREE.Mesh(trimGeo, env.blackIronMat);
        trim.position.set(gx, levelBaseY - height / 2, gz);
        trim.rotation.y = rotY;
        chunkGroup.add(trim);

        const halfX = rotY === 0 ? length / 2 : width / 2;
        const halfZ = rotY === 0 ? width / 2 : length / 2;
        const box = new THREE.Box3();
        box.min.set(gx - halfX, levelBaseY - height, gz - halfZ);
        box.max.set(gx + halfX, levelBaseY, gz + halfZ);
        box.chunkHash = hash;
        env.spatialGrid.insert(box);
    };

    const buildCatwalkPlatform = (gx, gz, levelBaseY) => {
        const floorGeo = env._cacheGeo('acmeCatwalkFloor', () => new THREE.PlaneGeometry(env.cellSize, env.cellSize));
        const floor = new THREE.Mesh(floorGeo, env.catwalkMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(gx, levelBaseY, gz);
        floor.castShadow = true;
        floor.receiveShadow = true;
        chunkGroup.add(floor);

        const half = env.cellSize / 2;
        const frameLongGeo = env._cacheGeo('acmeCatwalkFrameLong', () => new THREE.BoxGeometry(env.cellSize, 0.2, 0.1));
        const frameShortGeo = env._cacheGeo('acmeCatwalkFrameShort', () => new THREE.BoxGeometry(0.1, 0.2, env.cellSize - 0.2));
        const addFrame = (geo, px, pz) => {
            const beam = new THREE.Mesh(geo, env.blackIronMat);
            beam.position.set(px, levelBaseY - 0.1, pz);
            beam.castShadow = true;
            beam.receiveShadow = true;
            chunkGroup.add(beam);
        };
        addFrame(frameLongGeo, gx, gz - half + 0.05);
        addFrame(frameLongGeo, gx, gz + half - 0.05);
        addFrame(frameShortGeo, gx - half + 0.05, gz);
        addFrame(frameShortGeo, gx + half - 0.05, gz);

        const box = new THREE.Box3();
        box.min.set(gx - half, levelBaseY - 0.15, gz - half);
        box.max.set(gx + half, levelBaseY, gz + half);
        box.chunkHash = hash;
        env.spatialGrid.insert(box);
    };

    // A climbable flight of solid steps. Each tread rises within the player's auto-step
    // allowance so it reads as real stairs rather than a jump gauntlet, but the total rise
    // doesn't promise to reach the next maze level - a staircase that goes nowhere in
    // particular is exactly the Escher note we want here.
    const buildStairPlatform = (gx, gz, levelBaseY) => {
        const numSteps = 3 + Math.floor(random() * 4);
        const stepRise = 0.28 + random() * 0.05;
        const stepRun = 0.55 + random() * 0.18;
        const stepWidth = env.cellSize * (0.5 + random() * 0.25);
        const baseY = levelBaseY - 0.5;
        const dirIdx = Math.floor(random() * 4);
        const dx = dirIdx === 0 ? 1 : (dirIdx === 2 ? -1 : 0);
        const dz = dirIdx === 1 ? 1 : (dirIdx === 3 ? -1 : 0);
        const alongX = dx !== 0;
        const totalRun = numSteps * stepRun;
        const startOffset = -totalRun / 2;

        for (let i = 0; i < numSteps; i++) {
            const topY = levelBaseY + stepRise * i;
            const stepH = topY - baseY;
            const along = startOffset + stepRun * (i + 0.5);
            const px = gx + dx * along;
            const pz = gz + dz * along;

            const treadGeo = new THREE.BoxGeometry(
                alongX ? stepRun + 0.02 : stepWidth,
                stepH,
                alongX ? stepWidth : stepRun + 0.02
            );
            const tread = new THREE.Mesh(treadGeo, env.warehouseMat);
            tread.position.set(px, baseY + stepH / 2, pz);
            tread.castShadow = true;
            tread.receiveShadow = true;
            chunkGroup.add(tread);

            const noseGeo = new THREE.BoxGeometry(
                alongX ? 0.05 : stepWidth,
                0.06,
                alongX ? stepWidth : 0.05
            );
            const nose = new THREE.Mesh(noseGeo, env.blackIronMat);
            nose.position.set(px - dx * stepRun / 2, topY, pz - dz * stepRun / 2);
            chunkGroup.add(nose);

            const box = new THREE.Box3();
            const halfW = alongX ? (stepRun / 2 + 0.01) : stepWidth / 2;
            const halfD = alongX ? stepWidth / 2 : (stepRun / 2 + 0.01);
            box.min.set(px - halfW, baseY, pz - halfD);
            box.max.set(px + halfW, topY, pz + halfD);
            box.chunkHash = hash;
            env.spatialGrid.insert(box);
        }
    };

    // A freestanding archway: two pillars carrying a walkable lintel/bridge, with a
    // decorative curved voussoir underside tracing the arch. The bridge sits roughly a
    // level's height up, so it doubles as a mid-air stepping stone between platforms.
    const buildArchPlatform = (gx, gz, levelBaseY) => {
        const spanX = random() > 0.5;
        const span = env.cellSize * (0.75 + random() * 0.35);
        const halfSpan = span / 2;
        const pillarSize = 0.28 + random() * 0.1;
        const archHeight = 0.85 + random() * 0.5;
        const lintelH = 0.3 + random() * 0.08;
        const deckDepth = env.cellSize * 0.4;

        const pillarGeo = new THREE.BoxGeometry(
            spanX ? pillarSize : deckDepth,
            archHeight,
            spanX ? deckDepth : pillarSize
        );
        for (const side of [-1, 1]) {
            const px = gx + (spanX ? side * halfSpan : 0);
            const pz = gz + (spanX ? 0 : side * halfSpan);
            const pillar = new THREE.Mesh(pillarGeo, env.warehouseMat);
            pillar.position.set(px, levelBaseY + archHeight / 2, pz);
            pillar.castShadow = true;
            pillar.receiveShadow = true;
            chunkGroup.add(pillar);

            const halfPX = spanX ? pillarSize / 2 : deckDepth / 2;
            const halfPZ = spanX ? deckDepth / 2 : pillarSize / 2;
            const pBox = new THREE.Box3();
            pBox.min.set(px - halfPX, levelBaseY, pz - halfPZ);
            pBox.max.set(px + halfPX, levelBaseY + archHeight, pz + halfPZ);
            pBox.chunkHash = hash;
            env.spatialGrid.insert(pBox);
        }

        const lintelLen = span + pillarSize * 1.4;
        const lintelGeo = new THREE.BoxGeometry(
            spanX ? lintelLen : deckDepth,
            lintelH,
            spanX ? deckDepth : lintelLen
        );
        const lintel = new THREE.Mesh(lintelGeo, env.blackIronMat);
        lintel.position.set(gx, levelBaseY + archHeight + lintelH / 2, gz);
        lintel.castShadow = true;
        lintel.receiveShadow = true;
        chunkGroup.add(lintel);

        const halfLX = spanX ? lintelLen / 2 : deckDepth / 2;
        const halfLZ = spanX ? deckDepth / 2 : lintelLen / 2;
        const lBox = new THREE.Box3();
        lBox.min.set(gx - halfLX, levelBaseY + archHeight, gz - halfLZ);
        lBox.max.set(gx + halfLX, levelBaseY + archHeight + lintelH, gz + halfLZ);
        lBox.chunkHash = hash;
        env.spatialGrid.insert(lBox);

        const archRadius = halfSpan * 0.85;
        const voussoirCount = 7;
        const voussoirLen = (archRadius * Math.PI / voussoirCount) * 1.2;
        const voussoirGeo = new THREE.BoxGeometry(
            spanX ? voussoirLen : 0.16,
            0.2,
            spanX ? 0.16 : voussoirLen
        );
        for (let i = 0; i < voussoirCount; i++) {
            const t = (i + 0.5) / voussoirCount;
            const ang = Math.PI * t;
            const vOff = Math.cos(ang) * archRadius;
            const vY = levelBaseY + archHeight - archRadius + Math.sin(ang) * archRadius;
            const seg = new THREE.Mesh(voussoirGeo, env.acmeMat);
            if (spanX) {
                seg.position.set(gx + vOff, vY, gz);
                seg.rotation.z = Math.PI / 2 - ang;
            } else {
                seg.position.set(gx, vY, gz + vOff);
                seg.rotation.x = ang - Math.PI / 2;
            }
            seg.castShadow = true;
            seg.receiveShadow = true;
            chunkGroup.add(seg);
        }
    };

    return {
        id: "ACME",
        foundationMat: null,
        ceilingMat: null,
        build: (x, z, localX, localZ, maze, levelMazes) => {
            const gx = x * env.cellSize, gz = z * env.cellSize;

            const voidBox = new THREE.Box3();
            voidBox.min.set(gx - env.cellSize / 2, -100000, gz - env.cellSize / 2);
            voidBox.max.set(gx + env.cellSize / 2, 100000, gz + env.cellSize / 2);
            voidBox.isVoid = true;
            voidBox.chunkHash = hash;
            env.spatialGrid.insert(voidBox);

            if (ctx.buildPerimeter(x, z, localX, localZ, env.warehouseMat, "ACME")) return;

            const nearEntrance = localX <= 2 || localX >= env.chunkSize - 3 || localZ <= 2 || localZ >= env.chunkSize - 3;
            if (nearEntrance) buildCatwalkPlatform(gx, gz, 0);

            if (random() > 0.6) {
                const beamGeo = new THREE.BoxGeometry(env.cellSize * 4, 1.0, 1.0);
                const beamMat = new THREE.MeshStandardMaterial({color: 0x222222, emissive: 0x111111, metalness: 0.8, roughness: 0.4});
                const beam = new THREE.Mesh(beamGeo, beamMat);
                beam.position.set(gx, -10 - random() * 99900, gz);
                beam.rotation.y = random() > 0.5 ? 0 : Math.PI / 2;
                beam.receiveShadow = true;
                chunkGroup.add(beam);
            }

            const levels = levelMazes || [maze];
            const midLevel = Math.floor(levels.length / 2);
            for (let li = 0; li < levels.length; li++) {
                const levelMaze = levels[li];
                const isPath = levelMaze && !levelMaze[localX][localZ];
                if (!isPath) continue;
                if (nearEntrance && li >= midLevel && li <= midLevel + ACME_ENTRANCE_CLEARANCE_LEVELS) continue;

                const levelBaseY = (li - midLevel) * ACME_LEVEL_SPACING;

                if (!ACME_STASHED_ASSETS_ENABLED) {
                    // Clean-slate layout: nothing but catwalks dotted across the open pit.
                    if (random() < ACME_CATWALK_CHANCE) buildCatwalkPlatform(gx, gz, levelBaseY);
                    continue;
                }

                if (random() < ACME_PLATFORM_SKIP_CHANCE) continue;
                const roll = random();
                if (roll < ACME_CONTAINER_CHANCE) {
                    buildContainerPlatform(gx, gz, levelBaseY);
                } else if (roll < ACME_CONTAINER_CHANCE + ACME_CATWALK_CHANCE) {
                    buildCatwalkPlatform(gx, gz, levelBaseY);
                } else if (roll < ACME_CONTAINER_CHANCE + ACME_CATWALK_CHANCE + ACME_STAIR_CHANCE) {
                    buildStairPlatform(gx, gz, levelBaseY);
                } else if (roll < ACME_CONTAINER_CHANCE + ACME_CATWALK_CHANCE + ACME_STAIR_CHANCE + ACME_ARCH_CHANCE) {
                    buildArchPlatform(gx, gz, levelBaseY);
                } else {
                    buildCratePlatform(gx, gz, levelBaseY);
                }
            }
        }
    };
};
