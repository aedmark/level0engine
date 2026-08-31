import {ARCH_WALK_CLEARANCE} from '../StructureKit.js';

const DIRS = [
    {dx: 1, dz: 0},
    {dx: -1, dz: 0},
    {dx: 0, dz: 1},
    {dx: 0, dz: -1}
];

const RIB_DEPTH = 1.0;
const JAMB = 0.8;
const APEX_CLEARANCE = 0.3;

export const ArchHallProfile = (env, ctx) => {
    const {addGeometry, random} = ctx;
    const isWall = (bx, bz) => ctx.isWall(bx, bz);

    const half = env.cellSize / 2;
    const radius = half - JAMB;
    const archHeight = radius + APEX_CLEARANCE;
    const springHeight = 3.0 - archHeight;
    const apexY = springHeight + radius;
    const jambOffset = half - JAMB / 2;

    const isArch = (bx, bz) =>
        !!ctx.getForcedStructure && ctx.getForcedStructure(bx, bz) === 'ARCH_HALL';

    const links = (bx, bz) => DIRS.filter(d => !isWall(bx + d.dx, bz + d.dz));

    const opposed = (a, b) => a.dx === -b.dx && a.dz === -b.dz;

    const axisOf = (bx, bz) => {
        const link = links(bx, bz);
        if (link.length === 2 && opposed(link[0], link[1])) {
            return link[0].dz !== 0;
        }
        if (link.length === 1) {
            return link[0].dz !== 0;
        }
        if (link.length === 0) {
            const openZ = !isWall(bx, bz + 1) || !isWall(bx, bz - 1);
            const openX = !isWall(bx + 1, bz) || !isWall(bx - 1, bz);
            if (openZ && !openX) return true;
            if (openX && !openZ) return false;
            return true;
        }
        return null;
    };

    const buildSlab = (cx, cz, depth, dir, alongZ) => {
        const mat = env.subwayTileMats ? env.subwayTileMats[Math.floor(random() * env.subwayTileMats.length)] : env.structMat;
        const outerMat = env.subwayTileMatsStraight
            ? env.subwayTileMatsStraight[Math.floor(random() * env.subwayTileMatsStraight.length)]
            : mat;
        const slab = ctx.buildArchCutout(radius, JAMB, archHeight, depth, springHeight, mat, outerMat);
        const push = (env.cellSize - depth) / 2;
        slab.position.set(cx + (dir ? dir.dx * push : 0), 0, cz + (dir ? dir.dz * push : 0));
        
        if (dir) {
            if (dir.dx === 1) slab.rotation.y = Math.PI / 2;
            else if (dir.dx === -1) slab.rotation.y = -Math.PI / 2;
            else if (dir.dz === 1) slab.rotation.y = 0;
            else if (dir.dz === -1) slab.rotation.y = Math.PI;
        } else {
            if (!alongZ) slab.rotation.y = Math.PI / 2;
        }
        
        slab.userData.isEntityBlocker = true;
        slab.userData.noCollision = true;
        addGeometry(slab);
        ctx.addArchCutoutColliders(slab, radius, JAMB, archHeight, depth, springHeight, 24, ARCH_WALK_CLEARANCE);

        const spanW = alongZ ? JAMB : depth;
        const spanD = alongZ ? depth : JAMB;
        for (const side of [-1, 1]) {
            ctx.addBaseboardBox(
                slab.position.x + (alongZ ? side * jambOffset : 0),
                slab.position.z + (alongZ ? 0 : side * jambOffset),
                spanW,
                spanD
            );
        }
        return slab;
    };

    const capClosedSide = (cx, cz, d) => {
        const mat = env.subwayTileMatsStraight
            ? env.subwayTileMatsStraight[Math.floor(random() * env.subwayTileMatsStraight.length)]
            : env.structMat;
        const thickness = 0.5;
        const alongZWall = d.dx !== 0;
        const w = alongZWall ? thickness : env.cellSize;
        const depth = alongZWall ? env.cellSize : thickness;
        const wall = ctx.buildWall(w, depth, mat);
        wall.position.set(cx + d.dx * (half - thickness / 2), 1.5, cz + d.dz * (half - thickness / 2));
        wall.userData.isEntityBlocker = true;
        addGeometry(wall);
        ctx.addBaseboardBox(wall.position.x, wall.position.z, w, depth);
    };

    const addApexSeam = (cx, cz, alongZ) => {
        const offsets = [-env.cellSize / 4, env.cellSize / 4];

        for (let i = 0; i < offsets.length; i++) {
            const offset = offsets[i];
            const bx = cx + (alongZ ? 0 : offset);
            const bz = cz + (alongZ ? offset : 0);

            const isBroken = random() > 0.72;

            const housingGeo = env._cacheGeo(
                `arch_ballast_housing_${alongZ ? 'z' : 'x'}`,
                () => new THREE.BoxGeometry(
                    alongZ ? 0.34 : 1.4,
                    0.08,
                    alongZ ? 1.4 : 0.34
                )
            );
            const housing = new THREE.Mesh(housingGeo, env.baseHousingMat);
            housing.position.set(bx, apexY - 0.04, bz);
            housing.userData.noCollision = true;
            housing.userData.noShadow = true;
            addGeometry(housing);

            env._archSeamIndex = ((env._archSeamIndex || 0) + 1) % 8;
            const mat = ctx.getLightMaterial(
                0xffb732,
                isBroken ? 0x1a1100 : 0xffa522,
                isBroken,
                true,
                `archSeam${env._archSeamIndex}`
            );

            const panelGeo = env._cacheGeo(
                `arch_ballast_panel_${alongZ ? 'z' : 'x'}`,
                () => new THREE.BoxGeometry(
                    alongZ ? 0.26 : 1.34,
                    0.08,
                    alongZ ? 1.34 : 0.26
                )
            );
            const panel = new THREE.Mesh(panelGeo, mat);
            panel.position.set(bx, apexY - 0.10, bz);
            panel.userData.noCollision = true;
            panel.userData.noShadow = true;
            addGeometry(panel);

            if (isBroken) continue;

            const isTracked = random() > 0.55;
            env.fixtureData.push({
                chunkHash: ctx.hash,
                position: new THREE.Vector3(bx, apexY - 0.2, bz),
                flickerOffset: random() * 500,
                material: mat,
                isFaulty: isTracked ? (random() > 0.80) : false,
                baseIntensity: isTracked ? 0.5 : 0.0,
                targetIntensity: isTracked ? 0.5 : 0.0,
                currentIntensity: isTracked ? 0.5 : 0.0,
                isFake: !isTracked
            });
        }
    };

    const addLandingPanel = (cx, cz) => {
        if (random() > 0.82) return;
        const isBroken = random() > 0.62;
        const activeMat = env.getPooledMazeLightMaterial(isBroken);
        const panel = new THREE.Mesh(env.sharedPanelGeo, [
            env.baseHousingMat, env.baseHousingMat, env.baseHousingMat,
            activeMat, env.baseHousingMat, env.baseHousingMat
        ]);
        panel.position.set(cx, 2.98, cz);
        if (random() > 0.5) panel.rotation.y = Math.PI / 2;
        panel.userData.noCollision = true;
        panel.userData.noShadow = true;
        addGeometry(panel);

        if (isBroken) return;
        env.fixtureData.push({
            chunkHash: ctx.hash,
            position: new THREE.Vector3(cx, 2.8, cz),
            flickerOffset: random() * 500,
            material: activeMat,
            isFaulty: random() > 0.75,
            baseIntensity: 0.6,
            targetIntensity: 0.6,
            currentIntensity: 0.6,
            isFake: false
        });
    };

    return {
        name: 'ARCH_HALL',
        prob: 0,
        build: (x, z) => {
            const cx = x * env.cellSize;
            const cz = z * env.cellSize;
            const alongZ = axisOf(x, z);

            if (alongZ !== null) {
                buildSlab(cx, cz, env.cellSize, null, alongZ);
                addApexSeam(cx, cz, alongZ);
                return true;
            }

            const link = links(x, z);
            for (const d of link) {
                const nx = x + d.dx;
                const nz = z + d.dz;
                const neighbourIsArch = isArch(nx, nz);
                if (neighbourIsArch && axisOf(nx, nz) !== null) continue;
                if (neighbourIsArch && d.dx <= 0 && d.dz <= 0) continue;
                buildSlab(cx, cz, RIB_DEPTH, d, d.dz !== 0);
            }
            for (const d of DIRS) {
                if (link.some(l => l.dx === d.dx && l.dz === d.dz)) continue;
                capClosedSide(cx, cz, d);
            }
            addLandingPanel(cx, cz);
            return false;
        }
    };
};
