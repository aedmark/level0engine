/**
 * ARCH_HALL — a vaulted arcade stamped onto an entire carved path.
 *
 * Where CURVED ARCHWAY punches a single arch through one wall cell, this profile
 * runs along a whole artery. Each cell reads its neighbours and decides what kind
 * of vault piece it is:
 *
 *   straight  two opposite arch neighbours. A full-cell-deep arch slab. Because the
 *             extruded profile is constant along its depth, consecutive straight
 *             cells tile into one continuous barrel vault with no visible seam.
 *   ribs      a turn, a junction, or a dead end. Thin arch ribs sit flush against
 *             each connected face, leaving the middle open as a landing so the
 *             vault has somewhere to change direction.
 *
 * The seam between two cells is owned by exactly one of them, so ribs never double
 * up, and a rib is never emitted against a straight neighbour whose full-depth slab
 * already reaches the shared face.
 */

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
    const {addGeometry, isWall, random} = ctx;

    const half = env.cellSize / 2;
    const radius = half - JAMB;
    const archHeight = radius + APEX_CLEARANCE;
    const springHeight = 3.0 - archHeight;
    const apexY = springHeight + radius;
    const jambOffset = half - JAMB / 2;

    const isArch = (bx, bz) =>
        !!ctx.getForcedStructure && ctx.getForcedStructure(bx, bz) === 'ARCH_HALL';

    const links = (bx, bz) => DIRS.filter(d => isArch(bx + d.dx, bz + d.dz));

    const opposed = (a, b) => a.dx === -b.dx && a.dz === -b.dz;

    /**
     * A cell is "straight" when the vault passes through it without turning.
     * Chunk-edge cells lose sight of their neighbour across the border (the wall
     * grid only covers this chunk), so a single link whose opposite side is open
     * still counts as straight. That keeps the vault continuous across chunk seams
     * instead of capping it every sixteen cells.
     */
    const axisOf = (bx, bz) => {
        const link = links(bx, bz);
        if (link.length === 2 && opposed(link[0], link[1])) {
            return link[0].dz !== 0;
        }
        if (link.length === 1) {
            const back = {dx: -link[0].dx, dz: -link[0].dz};
            if (!isWall(bx + back.dx, bz + back.dz)) return link[0].dz !== 0;
            return null;
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
        const slab = ctx.buildArchCutout(radius, JAMB, archHeight, depth, springHeight, env.sharedWallMat);
        const push = (env.cellSize - depth) / 2;
        slab.position.set(cx + (dir ? dir.dx * push : 0), 0, cz + (dir ? dir.dz * push : 0));
        if (!alongZ) slab.rotation.y = Math.PI / 2;
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

    /**
     * Replaces the continuous apex seam with segmented, realistic fluorescent ballasts.
     * Straight cells get two spaced-out fixtures, each with a housing, emissive panel,
     * and a protective louver grille.
     */
    const addApexSeam = (cx, cz, alongZ) => {
        // Place two ballasts per cell for a realistic cadence
        const offsets = [-env.cellSize / 4, env.cellSize / 4];

        for (let i = 0; i < offsets.length; i++) {
            const offset = offsets[i];
            const bx = cx + (alongZ ? 0 : offset);
            const bz = cz + (alongZ ? offset : 0);

            const isBroken = random() > 0.72;

            // Housing (attached to ceiling)
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
            addGeometry(housing);

            // Rotate through a small pool of material instances for independent flicker
            env._archSeamIndex = ((env._archSeamIndex || 0) + 1) % 8;
            const mat = ctx.getLightMaterial(
                0xfff0cc,
                isBroken ? 0x1a1712 : 0xffe9b0,
                isBroken,
                true,
                `archSeam${env._archSeamIndex}`
            );

            // Light panel (slightly inset width, slightly recessed to let housing form a border)
            const panelGeo = env._cacheGeo(
                `arch_ballast_panel_${alongZ ? 'z' : 'x'}`,
                () => new THREE.BoxGeometry(
                    alongZ ? 0.26 : 1.34,
                    0.02,
                    alongZ ? 1.34 : 0.26
                )
            );
            const panel = new THREE.Mesh(panelGeo, mat);
            panel.position.set(bx, apexY - 0.08, bz);
            panel.userData.noCollision = true;
            addGeometry(panel);

            // Louver grille
            const numSlats = 14;
            const slatSpacing = 1.34 / numSlats;
            const startSlat = -(1.34 / 2) + (slatSpacing / 2);

            const slatGeo = env._cacheGeo(
                `arch_ballast_slat_${alongZ ? 'z' : 'x'}`,
                () => new THREE.BoxGeometry(
                    alongZ ? 0.34 : 0.02,
                    0.04,
                    alongZ ? 0.02 : 0.34
                )
            );

            for (let s = 0; s < numSlats; s++) {
                const slatOffset = startSlat + s * slatSpacing;
                const slatX = bx + (alongZ ? 0 : slatOffset);
                const slatZ = bz + (alongZ ? slatOffset : 0);

                const slat = new THREE.Mesh(slatGeo, env.baseHousingMat);
                slat.position.set(slatX, apexY - 0.09, slatZ);
                slat.userData.noCollision = true;
                addGeometry(slat);
            }

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

    /**
     * Turns and junctions keep an open ceiling, so they carry an ordinary panel.
     * The chunk builder skips its own panel over arcade cells, so the profile has
     * to place this one itself.
     */
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
            addLandingPanel(cx, cz);
            return false;
        }
    };
};
