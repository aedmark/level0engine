/**
 * [ROLE] Generates an Empty Door Frame (that spans partitions) in place of a solid wall cell.
 * [WHY] Gives the maze visual variety and alternate routes where a wall would otherwise be a dead, uniform surface.
 * [STATE] Stateless; returns a configuration object with a build function. `prob: 0` means it's only placed by explicit reference, not random rolls.
 * [DEPENDS] Depends on env properties and context functions like addGeometry, buildWall, the caller's isWallCell, and env.doorFrameMat.
 */
export const EmptyDoorFrameProfile = (env, ctx) => {
    const { buildWall } = ctx;
    return {
        name: "empty_door_frame",
        prob: 0,
        build: (x, z, isWallCell) => {
            const isRotated = isWallCell(x, z - 1) || isWallCell(x, z + 1);
            const rot = isRotated ? Math.PI / 2 : 0;
            const px = x * env.cellSize;
            const pz = z * env.cellSize;

            const addGroupToStaging = (grp) => {
                grp.position.set(px, 0, pz);
                grp.rotation.y = rot;
                grp.updateMatrixWorld(true);
                const children = [...grp.children];
                for (const child of children) {
                    if (child.isMesh) {
                        child.userData.isEntityBlocker = true;
                        
                        // Detach to apply world transform properly to position/rotation
                        grp.remove(child);
                        child.applyMatrix4(grp.matrixWorld);
                        
                        ctx.addGeometry(child);
                    }
                }
            };

            const startX = Math.floor(x / env.chunkSize) * env.chunkSize;
            const startZ = Math.floor(z / env.chunkSize) * env.chunkSize;
            const inChunk = (cx, cz) => cx >= startX && cx < startX + env.chunkSize && cz >= startZ && cz < startZ + env.chunkSize;

            const blockers = ["empty_door_frame", "CREVICE_HALL", "HINGED DOORWAY", "DUCT OR VENT", "CRAWLSPACE_DUCT", "HATCH", "CRATES OR STAIRWAY"];
            let dLeft = 0;
            while (dLeft < 5) {
                const chkX = isRotated ? x : x - (dLeft + 1);
                const chkZ = isRotated ? z + (dLeft + 1) : z;
                if (!inChunk(chkX, chkZ)) break;
                const forced = ctx.getForcedStructure ? ctx.getForcedStructure(chkX, chkZ) : null;
                if (isWallCell(chkX, chkZ) || blockers.includes(forced)) break;
                dLeft++;
            }

            let dRight = 0;
            while (dRight < 5) {
                const chkX = isRotated ? x : x + (dRight + 1);
                const chkZ = isRotated ? z - (dRight + 1) : z;
                if (!inChunk(chkX, chkZ)) break;
                const forced = ctx.getForcedStructure ? ctx.getForcedStructure(chkX, chkZ) : null;
                if (isWallCell(chkX, chkZ) || blockers.includes(forced)) break;
                dRight++;
            }

            const g = new THREE.Group();
            const baseStubW = (env.cellSize - 1.4) / 2;
            
            const leftW = baseStubW + dLeft * env.cellSize;
            const stub1 = buildWall(leftW, 0.2, env.sharedWallMat, 3.0, 0);
            stub1.position.set(-0.7 - leftW / 2, 1.5, 0);
            g.add(stub1);
            
            const rightW = baseStubW + dRight * env.cellSize;
            const stub2 = buildWall(rightW, 0.2, env.sharedWallMat, 3.0, 0);
            stub2.position.set(0.7 + rightW / 2, 1.5, 0);
            g.add(stub2);
            
            env._breachWalls = env._breachWalls || [];
            env._breachWalls.push(stub1, stub2);

            const headW = 1.4;
            const head1 = buildWall(headW, 0.2, env.sharedWallMat, 0.4, 2.6);
            head1.position.set(0, 2.8, 0);
            g.add(head1);
            
            const frameMat = env.woodMat || env.sharedWallMat;
            const jamb1 = buildWall(0.1, 0.24, frameMat, 2.67, 0);
            jamb1.position.set(-headW / 2 + 0.05, 1.335, 0);
            g.add(jamb1);
            
            const jamb2 = buildWall(0.1, 0.24, frameMat, 2.67, 0);
            jamb2.position.set(headW / 2 - 0.05, 1.335, 0);
            g.add(jamb2);
            
            const topJamb = buildWall(headW - 0.2, 0.24, frameMat, 0.1, 2.62);
            topJamb.position.set(0, 2.62, 0);
            g.add(topJamb);
            
            addGroupToStaging(g);
        }
    };
};
