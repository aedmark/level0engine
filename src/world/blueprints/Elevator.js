export const ElevatorProfile = (env, ctx) => {
    const {random, buildWall, addGeometry} = ctx;
    return {
        name: "ELEVATOR",
        prob: 0.0302, build: (x, z) => {
            const isMagic = random() > 0.60;
            
            const nC = ctx.isWall && !ctx.isWall(x, z - 1);
            const sC = ctx.isWall && !ctx.isWall(x, z + 1);
            const wC = ctx.isWall && !ctx.isWall(x - 1, z);
            const eC = ctx.isWall && !ctx.isWall(x + 1, z);
            
            const openDirs = [];
            if (sC) openDirs.push(0);
            if (eC) openDirs.push(1);
            if (nC) openDirs.push(2);
            if (wC) openDirs.push(3);
            
            let dir;
            if (openDirs.length > 0) {
                dir = openDirs[Math.floor(random() * openDirs.length)];
            } else {
                dir = Math.floor(random() * 4);
                if (ctx.setWall) {
                    if (dir === 0) ctx.setWall(x, z + 1, false);
                    else if (dir === 1) ctx.setWall(x + 1, z, false);
                    else if (dir === 2) ctx.setWall(x, z - 1, false);
                    else if (dir === 3) ctx.setWall(x - 1, z, false);
                }
            }

            if (ctx.markOccupied) {
                if (dir === 0) ctx.markOccupied(x, z + 1);
                else if (dir === 1) ctx.markOccupied(x + 1, z);
                else if (dir === 2) ctx.markOccupied(x, z - 1);
                else if (dir === 3) ctx.markOccupied(x - 1, z);
            }

            const isZ = dir % 2 === 0;
            const wallH = 4.5;
            const wallY = 2.25;
            const w1 = buildWall(isZ ? 0.5 : env.cellSize, isZ ? env.cellSize : 0.5, env.sharedWallMat, wallH);
            w1.position.set(x * env.cellSize + (isZ ? -(env.cellSize / 2) + 0.25 : 0), wallY, z * env.cellSize + (isZ ? 0 : -(env.cellSize / 2) + 0.25));
            addGeometry(w1);
            
            const w2 = buildWall(isZ ? 0.5 : env.cellSize, isZ ? env.cellSize : 0.5, env.sharedWallMat, wallH);
            w2.position.set(x * env.cellSize + (isZ ? (env.cellSize / 2) - 0.25 : 0), wallY, z * env.cellSize + (isZ ? 0 : (env.cellSize / 2) - 0.25));
            addGeometry(w2);
            
            const w3 = buildWall(isZ ? env.cellSize : 0.5, isZ ? 0.5 : env.cellSize, env.sharedWallMat, wallH);
            const backOffset = (env.cellSize / 2) - 0.25;
            const sign = (dir === 2 || dir === 3) ? 1 : -1;
            w3.position.set(x * env.cellSize + (isZ ? 0 : sign * backOffset), wallY, z * env.cellSize + (isZ ? sign * backOffset : 0));
            addGeometry(w3);
            
            // Elevator ceiling
            const ceil = buildWall(env.cellSize, env.cellSize, env.sharedWallMat, 0.5);
            ceil.position.set(x * env.cellSize, wallH - 0.25, z * env.cellSize);
            addGeometry(ceil);

            // Elevator floor
            const floor = new THREE.Mesh(env._boxGeo(env.cellSize - 1.0, 0.2, env.cellSize - 1.0), env.structMat);
            floor.position.set(x * env.cellSize, 0.1, z * env.cellSize);
            addGeometry(floor, isMagic);
        }
    };
};
