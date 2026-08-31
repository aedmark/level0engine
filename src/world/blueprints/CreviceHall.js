export const CREVICE_GAP = 0.65;

const FACE = {PX: 0, NX: 1, PY: 2, NY: 3, PZ: 4, NZ: 5};

export const CreviceHallProfile = (env, ctx) => {
    const { addGeometry, buildWall } = ctx;
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

    const buildCornerPillar = (cx, cz, offX, offZ) => {
        const mats = faceMats(offX > 0 ? FACE.NX : FACE.PX, offZ > 0 ? FACE.NZ : FACE.PZ);
        const p = buildWall(quadSize, quadSize, mats, 3.0, 0, 0);
        p.position.set(cx + offX * quadOffset, 1.5, cz + offZ * quadOffset);
        return addWallMesh(p);
    };

    const buildClosedChannel = (cx, cz, dir) => {
        if (dir === 'N') {
            const w = buildWall(channelSpan, quadSize, faceMats(FACE.PZ), 3.0, 0, 0);
            w.position.set(cx, 1.5, cz - quadOffset);
            return addWallMesh(w);
        } else if (dir === 'S') {
            const w = buildWall(channelSpan, quadSize, faceMats(FACE.NZ), 3.0, 0, 0);
            w.position.set(cx, 1.5, cz + quadOffset);
            return addWallMesh(w);
        } else if (dir === 'E') {
            const w = buildWall(quadSize, channelSpan, faceMats(FACE.NX), 3.0, 0, 0);
            w.position.set(cx + quadOffset, 1.5, cz);
            return addWallMesh(w);
        } else if (dir === 'W') {
            const w = buildWall(quadSize, channelSpan, faceMats(FACE.PX), 3.0, 0, 0);
            w.position.set(cx - quadOffset, 1.5, cz);
            return addWallMesh(w);
        }
    };

    const buildStraightZ = (cx, cz) => {
        const w1 = buildWall(quadSize, env.cellSize, faceMats(FACE.PX), 3.0, 0, 0);
        w1.position.set(cx - quadOffset, 1.5, cz);
        addWallMesh(w1);

        const w2 = buildWall(quadSize, env.cellSize, faceMats(FACE.NX), 3.0, 0, 0);
        w2.position.set(cx + quadOffset, 1.5, cz);
        addWallMesh(w2);
    };

    const buildStraightX = (cx, cz) => {
        const w1 = buildWall(env.cellSize, quadSize, faceMats(FACE.PZ), 3.0, 0, 0);
        w1.position.set(cx, 1.5, cz - quadOffset);
        addWallMesh(w1);

        const w2 = buildWall(env.cellSize, quadSize, faceMats(FACE.NZ), 3.0, 0, 0);
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
                buildStraightZ(cx, cz);
                buildFloorAndCeiling(cx, cz);
                return true;
            }
            if (E && W && !N && !S) {
                buildStraightX(cx, cz);
                buildFloorAndCeiling(cx, cz);
                return true;
            }

            buildCornerPillar(cx, cz, -1, -1);
            buildCornerPillar(cx, cz, 1, -1);
            buildCornerPillar(cx, cz, -1, 1);
            buildCornerPillar(cx, cz, 1, 1);

            if (!N) buildClosedChannel(cx, cz, 'N');
            if (!S) buildClosedChannel(cx, cz, 'S');
            if (!E) buildClosedChannel(cx, cz, 'E');
            if (!W) buildClosedChannel(cx, cz, 'W');

            buildFloorAndCeiling(cx, cz);

            return true;
        }
    };
};
