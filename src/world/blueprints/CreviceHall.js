export const CREVICE_GAP = 0.65;

const FACE = {PX: 0, NX: 1, PY: 2, NY: 3, PZ: 4, NZ: 5};

export const CreviceHallProfile = (env, ctx) => {
    const { addGeometry, buildWall, random } = ctx;
    const gap = CREVICE_GAP;
    const quadSize = Math.round(((env.cellSize - gap) / 2) * 20) / 20;
    const quadOffset = env.cellSize / 2 - quadSize / 2;
    const channelSpan = env.cellSize - (2 * quadSize);

    const addWallMesh = (mesh) => {
        mesh.userData.isEntityBlocker = true;
        addGeometry(mesh);
        return mesh;
    };

    const faceMats = (...interiorFaces) => {
        const arr = [env.sharedWallMat, env.sharedWallMat, env.sharedWallMat, env.sharedWallMat, env.sharedWallMat, env.sharedWallMat];
        for (const f of interiorFaces) arr[f] = env.creviceWallMat;
        return arr;
    };

    // A crevice's exterior faces normally keep the ordinary wallpaper since they usually
    // border a normal wall cell - but when the neighbor in that direction is an ARCH_HALL,
    // swap that one face to a subway tile variant so the tiled look doesn't cut off abruptly
    // at the boundary.
    const straightTileMat = () => env.subwayTileMatsStraight
        ? env.subwayTileMatsStraight[Math.floor(random() * env.subwayTileMatsStraight.length)]
        : env.sharedWallMat;

    const applyArchBorder = (arr, faceIndex, gx, gz, dx, dz) => {
        if (ctx.getForcedStructure && ctx.getForcedStructure(gx + dx, gz + dz) === 'ARCH_HALL') {
            arr[faceIndex] = straightTileMat();
        }
        return arr;
    };

    const buildCornerPillar = (x, z, cx, cz, offX, offZ) => {
        const interiorX = offX > 0 ? FACE.NX : FACE.PX;
        const interiorZ = offZ > 0 ? FACE.NZ : FACE.PZ;
        const mats = faceMats(interiorX, interiorZ);
        applyArchBorder(mats, offX > 0 ? FACE.PX : FACE.NX, x, z, offX, 0);
        applyArchBorder(mats, offZ > 0 ? FACE.PZ : FACE.NZ, x, z, 0, offZ);
        const p = buildWall(quadSize, quadSize, mats, 3.0, 0, 0);
        p.position.set(cx + offX * quadOffset, 1.5, cz + offZ * quadOffset);
        return addWallMesh(p);
    };

    const buildClosedChannel = (x, z, cx, cz, dir) => {
        if (dir === 'N') {
            const mats = applyArchBorder(faceMats(FACE.PZ), FACE.NZ, x, z, 0, -1);
            const w = buildWall(channelSpan, quadSize, mats, 3.0, 0, 0);
            w.position.set(cx, 1.5, cz - quadOffset);
            return addWallMesh(w);
        } else if (dir === 'S') {
            const mats = applyArchBorder(faceMats(FACE.NZ), FACE.PZ, x, z, 0, 1);
            const w = buildWall(channelSpan, quadSize, mats, 3.0, 0, 0);
            w.position.set(cx, 1.5, cz + quadOffset);
            return addWallMesh(w);
        } else if (dir === 'E') {
            const mats = applyArchBorder(faceMats(FACE.NX), FACE.PX, x, z, 1, 0);
            const w = buildWall(quadSize, channelSpan, mats, 3.0, 0, 0);
            w.position.set(cx + quadOffset, 1.5, cz);
            return addWallMesh(w);
        } else if (dir === 'W') {
            const mats = applyArchBorder(faceMats(FACE.PX), FACE.NX, x, z, -1, 0);
            const w = buildWall(quadSize, channelSpan, mats, 3.0, 0, 0);
            w.position.set(cx - quadOffset, 1.5, cz);
            return addWallMesh(w);
        }
    };

    const buildStraightZ = (x, z, cx, cz) => {
        const mats1 = applyArchBorder(faceMats(FACE.PX), FACE.NX, x, z, -1, 0);
        const w1 = buildWall(quadSize, env.cellSize, mats1, 3.0, 0, 0);
        w1.position.set(cx - quadOffset, 1.5, cz);
        addWallMesh(w1);

        const mats2 = applyArchBorder(faceMats(FACE.NX), FACE.PX, x, z, 1, 0);
        const w2 = buildWall(quadSize, env.cellSize, mats2, 3.0, 0, 0);
        w2.position.set(cx + quadOffset, 1.5, cz);
        addWallMesh(w2);
    };

    const buildStraightX = (x, z, cx, cz) => {
        const mats1 = applyArchBorder(faceMats(FACE.PZ), FACE.NZ, x, z, 0, -1);
        const w1 = buildWall(env.cellSize, quadSize, mats1, 3.0, 0, 0);
        w1.position.set(cx, 1.5, cz - quadOffset);
        addWallMesh(w1);

        const mats2 = applyArchBorder(faceMats(FACE.NZ), FACE.PZ, x, z, 0, 1);
        const w2 = buildWall(env.cellSize, quadSize, mats2, 3.0, 0, 0);
        w2.position.set(cx, 1.5, cz + quadOffset);
        addWallMesh(w2);
    };

    const buildFloorAndCeiling = (cx, cz) => {
        const floor = new THREE.Mesh(env._planeGeo(env.cellSize, env.cellSize), env.creviceFloorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(cx, 0.015, cz);
        floor.userData.noCollision = true;
        floor.receiveShadow = true;
        addGeometry(floor);

        const ceiling = new THREE.Mesh(env._planeGeo(env.cellSize, env.cellSize), env.creviceCeilingMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(cx, 2.985, cz);
        ceiling.userData.noCollision = true;
        ceiling.receiveShadow = true;
        addGeometry(ceiling);
    };

    return {
        name: "CREVICE_HALL",
        prob: 0,
        build: (x, z, explicitConnections) => {
            const cx = x * env.cellSize;
            const cz = z * env.cellSize;

            let conn = explicitConnections;
            if (!conn || typeof conn === 'function') {
                const wallCheck = typeof explicitConnections === 'function' ? explicitConnections : (ctx.isWall || (() => false));
                const isConnected = (nx, nz) => {
                    if (ctx.getForcedStructure) {
                        const forced = ctx.getForcedStructure(nx, nz);
                        if (forced === 'CREVICE_HALL' || forced === 'CREVICE_NETWORK') return true;
                    }
                    return !wallCheck(nx, nz);
                };

                conn = {
                    N: isConnected(x, z - 1),
                    S: isConnected(x, z + 1),
                    E: isConnected(x + 1, z),
                    W: isConnected(x - 1, z)
                };
            }

            const { N, S, E, W } = conn;
            const count = (N ? 1 : 0) + (S ? 1 : 0) + (E ? 1 : 0) + (W ? 1 : 0);

            if (count === 0) {
                const wall = buildWall(env.cellSize, env.cellSize, env.sharedWallMat);
                wall.position.set(cx, 1.5, cz);
                return addWallMesh(wall);
            }

            if (N && S && !E && !W) {
                buildStraightZ(x, z, cx, cz);
                buildFloorAndCeiling(cx, cz);
                return true;
            }
            if (E && W && !N && !S) {
                buildStraightX(x, z, cx, cz);
                buildFloorAndCeiling(cx, cz);
                return true;
            }

            buildCornerPillar(x, z, cx, cz, -1, -1);
            buildCornerPillar(x, z, cx, cz, 1, -1);
            buildCornerPillar(x, z, cx, cz, -1, 1);
            buildCornerPillar(x, z, cx, cz, 1, 1);

            if (!N) buildClosedChannel(x, z, cx, cz, 'N');
            if (!S) buildClosedChannel(x, z, cx, cz, 'S');
            if (!E) buildClosedChannel(x, z, cx, cz, 'E');
            if (!W) buildClosedChannel(x, z, cx, cz, 'W');

            buildFloorAndCeiling(cx, cz);

            return true;
        }
    };
};
