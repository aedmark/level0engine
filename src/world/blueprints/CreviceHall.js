export const CREVICE_GAP = 0.65;

// THREE.BoxGeometry face-group order: [+X, -X, +Y, -Y, +Z, -Z]
const FACE = {PX: 0, NX: 1, PY: 2, NY: 3, PZ: 4, NZ: 5};

export const CreviceHallProfile = (env, ctx) => {
    const { addGeometry, buildWall } = ctx;
    const gap = CREVICE_GAP;
    // buildWall rounds every dimension to the nearest 0.05, so round quadSize
    // the same way here too - otherwise the pillar renders wider than this
    // offset math accounts for (1.675 -> 1.7).
    const quadSize = Math.round(((env.cellSize - gap) / 2) * 20) / 20;
    // Anchor to the true cell boundary (cellSize/2) rather than building the
    // offset back up from quadSize+gap/2: since quadSize is rounded but gap
    // and cellSize aren't, quadSize+gap/2 no longer equals cellSize/2 (e.g.
    // 1.7+0.325 = 2.025, not 2.0), so every piece overshot its own cell by
    // the rounding error and z-fought with the neighboring cell's pieces at
    // seams and corners. Deriving the offset from cellSize instead keeps the
    // outer face exactly flush with the cell edge (the interior gap ends up
    // a hair narrower than CREVICE_GAP, which is invisible at this scale).
    const quadOffset = env.cellSize / 2 - quadSize / 2;

    const addWallMesh = (mesh) => {
        mesh.userData.isEntityBlocker = true;
        addGeometry(mesh);
        return mesh;
    };

    // Only the faces bordering the crevice's own interior gap get the exposed
    // lath/plaster material; every other face keeps the ordinary wallpaper so
    // the crevice blends in when seen from an adjoining room.
    const faceMats = (...interiorFaces) => {
        const arr = [env.sharedWallMat, env.sharedWallMat, env.sharedWallMat, env.sharedWallMat, env.sharedWallMat, env.sharedWallMat];
        for (const f of interiorFaces) arr[f] = env.creviceWallMat;
        return arr;
    };

    const buildCornerPillar = (cx, cz, offX, offZ) => {
        const mats = faceMats(offX > 0 ? FACE.NX : FACE.PX, offZ > 0 ? FACE.NZ : FACE.PZ);
        const p = buildWall(quadSize, quadSize, mats);
        p.position.set(cx + offX * quadOffset, 1.5, cz + offZ * quadOffset);
        return addWallMesh(p);
    };

    const buildClosedChannel = (cx, cz, dir) => {
        if (dir === 'N') {
            const w = buildWall(gap, quadSize, faceMats(FACE.PZ));
            w.position.set(cx, 1.5, cz - quadOffset);
            return addWallMesh(w);
        } else if (dir === 'S') {
            const w = buildWall(gap, quadSize, faceMats(FACE.NZ));
            w.position.set(cx, 1.5, cz + quadOffset);
            return addWallMesh(w);
        } else if (dir === 'E') {
            const w = buildWall(quadSize, gap, faceMats(FACE.NX));
            w.position.set(cx + quadOffset, 1.5, cz);
            return addWallMesh(w);
        } else if (dir === 'W') {
            const w = buildWall(quadSize, gap, faceMats(FACE.PX));
            w.position.set(cx - quadOffset, 1.5, cz);
            return addWallMesh(w);
        }
    };

    const buildStraightZ = (cx, cz) => {
        const w1 = buildWall(quadSize, env.cellSize, faceMats(FACE.PX));
        w1.position.set(cx - quadOffset, 1.5, cz);
        addWallMesh(w1);

        const w2 = buildWall(quadSize, env.cellSize, faceMats(FACE.NX));
        w2.position.set(cx + quadOffset, 1.5, cz);
        addWallMesh(w2);
    };

    const buildStraightX = (cx, cz) => {
        const w1 = buildWall(env.cellSize, quadSize, faceMats(FACE.PZ));
        w1.position.set(cx, 1.5, cz - quadOffset);
        addWallMesh(w1);

        const w2 = buildWall(env.cellSize, quadSize, faceMats(FACE.NZ));
        w2.position.set(cx, 1.5, cz + quadOffset);
        addWallMesh(w2);
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
                return true;
            }
            if (E && W && !N && !S) {
                buildStraightX(cx, cz);
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

            return true;
        }
    };
};
