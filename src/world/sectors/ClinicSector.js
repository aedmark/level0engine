import Vec3 from '../../math/Vec3.js';
import AABB from '../../math/AABB.js';
import {placeSectorPaper} from '../NarrativeProps.js';

/**
 * A procedural sector generator characterized by hospital beds, IV drips, and collapsed ceilings.
 *
 * This sector showcases "set dressing" overrides. While the base maze
 * generates walls, this script uses `random()` thresholds to occasionally replace a standard
 * hallway tile with a "collapsed ceiling" event, injecting scattered rubble and rebar
 * geometry directly into the chunk's `THREE.Group`.
 */
export const ClinicSector = (env, ctx) => {
    const {
        random,
        buildWall,
        addGeometry,
        buildChair,
        addFurniture,
        chunkGroup,
        hash,
        stagingMeshes
    } = ctx;
    return {
        id: "CLINIC",
        foundationMat: env.clinicFloorMat || env.clinicMat,
        ceilingMat: env.clinicCeilingMat || env.clinicMat,
        build: (x, z, localX, localZ, maze) => {
            if (ctx.buildPerimeter(x, z, localX, localZ, env.clinicWallMat || env.sharedWallMat, "CLINIC")) return;
            const cx0 = x * env.cellSize, cz0 = z * env.cellSize;
            const wallAt = (lx, lz) => (lx < 0 || lx > 15 || lz < 0 || lz > 15) ? true : (maze ? maze[lx][lz] === true : false);
            const RUN = env.cellSize - 0.1, RAIL_Y = 0.95, FACE = env.cellSize / 2 + 0.025;
            const geo = (key, w, h, d) => {
                let g = env.geoCache.get(key);
                if (!g) {
                    g = new THREE.BoxGeometry(w, h, d);
                    env.geoCache.set(key, g);
                    env.geoCache.set(g.uuid, true);
                }
                return g;
            };
            const stage = (mesh) => {
                mesh.userData.chunkHash = hash;
                mesh.updateMatrixWorld(true);
                stagingMeshes.push(mesh);
            };
            /**
             * Hangs a crash rail on every face of a ward wall that a corridor can actually see,
             * at the height `_buildClinicWall` has always centred its scuffing on.
             */
            const railFaces = (px, pz, lx, lz, at) => {
                const mat = env.clinicRailMat;
                if (!mat) return;
                for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    if (at(lx + dx, lz + dz)) continue;
                    const alongZ = dx !== 0;
                    const rail = new THREE.Mesh(
                        geo(alongZ ? 'clinicRailZ' : 'clinicRailX',
                            alongZ ? 0.05 : RUN, 0.15, alongZ ? RUN : 0.05),
                        mat
                    );
                    rail.position.set(px + dx * FACE, RAIL_Y, pz + dz * FACE);
                    stage(rail);
                    for (const end of [-1, 1]) {
                        const cap = new THREE.Mesh(
                            geo(alongZ ? 'clinicRailCapZ' : 'clinicRailCapX',
                                alongZ ? 0.028 : 0.07, 0.11, alongZ ? 0.07 : 0.028),
                            mat
                        );
                        cap.position.set(
                            px + dx * (FACE - 0.011) + (alongZ ? 0 : end * (RUN / 2 - 0.035)),
                            RAIL_Y,
                            pz + dz * (FACE - 0.011) + (alongZ ? end * (RUN / 2 - 0.035) : 0)
                        );
                        stage(cap);
                    }
                }
            };
            if (maze && maze[localX][localZ]) {
                const wall = buildWall(env.cellSize, env.cellSize, env.clinicWallMat || env.sharedWallMat, 3.0);
                wall.position.set(cx0, 1.5, cz0);
                addGeometry(wall);
                railFaces(cx0, cz0, localX, localZ, wallAt);
                return;
            }
            placeSectorPaper(env, ctx, "CLINIC", cx0, cz0);
            const gateApproach = (localX === 7 && (localZ <= 2 || localZ >= 13)) || (localZ === 7 && (localX <= 2 || localX >= 13));
            if (!gateApproach && (localX + localZ) % 2 === 0 && random() > 0.5) {
                env._buildCeilingPanelLight(chunkGroup, hash, cx0, cz0, random, ctx.getLightMaterial, 0xe6f0ee, 0xd6e4dc, 1.7, 0.6);
            }
        }
    };
};