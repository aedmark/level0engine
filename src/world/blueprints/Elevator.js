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
            }

            if (ctx.setWall) {
                if (dir === 0) ctx.setWall(x, z + 1, false);
                else if (dir === 1) ctx.setWall(x + 1, z, false);
                else if (dir === 2) ctx.setWall(x, z - 1, false);
                else if (dir === 3) ctx.setWall(x - 1, z, false);
            }

            if (ctx.markOccupied) {
                if (dir === 0) ctx.markOccupied(x, z + 1);
                else if (dir === 1) ctx.markOccupied(x + 1, z);
                else if (dir === 2) ctx.markOccupied(x, z - 1);
                else if (dir === 3) ctx.markOccupied(x - 1, z);
            }

            if (!env._elevatorPanelMat) {
                env._elevatorPanelMat = env.structuralSteelMat || env.metalMat || env.sharedWallMat;
            }
            if (!env._elevatorBtnOnMat) {
                env._elevatorBtnOnMat = env.matteLightMat ? env.matteLightMat : (env.baseLightMat || env.sharedWallMat);
            }
            if (!env._elevatorBtnOffMat) {
                env._elevatorBtnOffMat = env.baseHousingMat || env.sharedWallMat;
            }

            const interiorMat = env.metalMat || env.structuralSteelMat || env.sharedWallMat;
            const doorMat = env.rustMat || env.sharedWallMat;
            const floorMat = env.serverFloorMat || env.metalMat || env.structMat;

            const isZ = dir % 2 === 0;
            const wallH = 4.5;
            const wallY = 2.25;
            
            // Side walls
            const w1 = buildWall(isZ ? 0.5 : env.cellSize, isZ ? env.cellSize : 0.5, interiorMat, wallH);
            w1.position.set(x * env.cellSize + (isZ ? -(env.cellSize / 2) + 0.25 : 0), wallY, z * env.cellSize + (isZ ? 0 : -(env.cellSize / 2) + 0.25));
            addGeometry(w1);
            
            const w2 = buildWall(isZ ? 0.5 : env.cellSize, isZ ? env.cellSize : 0.5, interiorMat, wallH);
            w2.position.set(x * env.cellSize + (isZ ? (env.cellSize / 2) - 0.25 : 0), wallY, z * env.cellSize + (isZ ? 0 : (env.cellSize / 2) - 0.25));
            addGeometry(w2);
            
            // Back wall
            const w3 = buildWall(isZ ? env.cellSize : 0.5, isZ ? 0.5 : env.cellSize, interiorMat, wallH);
            const backOffset = (env.cellSize / 2) - 0.25;
            const sign = (dir === 2 || dir === 3) ? 1 : -1;
            w3.position.set(x * env.cellSize + (isZ ? 0 : sign * backOffset), wallY, z * env.cellSize + (isZ ? sign * backOffset : 0));
            addGeometry(w3);
            
            // Elevator ceiling
            const ceil = buildWall(env.cellSize, env.cellSize, interiorMat, 0.5);
            ceil.position.set(x * env.cellSize, wallH - 0.25, z * env.cellSize);
            addGeometry(ceil);

            // Elevator floor
            const floor = buildWall(env.cellSize - 1.0, env.cellSize - 1.0, floorMat, 0.2, 0.0);
            floor.position.set(x * env.cellSize, 0.1, z * env.cellSize);
            addGeometry(floor, isMagic);

            // Elevator doors (partially open)
            const gap = 1.0;
            const innerSpace = env.cellSize - 1.0; 
            const doorW = (innerSpace - gap) / 2.0; 
            const d1 = buildWall(isZ ? doorW : 0.2, isZ ? 0.2 : doorW, doorMat, wallH);
            const d2 = buildWall(isZ ? doorW : 0.2, isZ ? 0.2 : doorW, doorMat, wallH);
            
            const frontOffset = (env.cellSize / 2) - 0.25;
            const frontSign = (dir === 0 || dir === 1) ? 1 : -1;
            const doorShift = (gap / 2.0) + (doorW / 2.0); 
            
            if (isZ) {
                d1.position.set(x * env.cellSize - doorShift, wallY, z * env.cellSize + frontSign * frontOffset);
                d2.position.set(x * env.cellSize + doorShift, wallY, z * env.cellSize + frontSign * frontOffset);
            } else {
                d1.position.set(x * env.cellSize + frontSign * frontOffset, wallY, z * env.cellSize - doorShift);
                d2.position.set(x * env.cellSize + frontSign * frontOffset, wallY, z * env.cellSize + doorShift);
            }
            addGeometry(d1);
            addGeometry(d2);

            // Elevator Panel & Button
            let pX = x * env.cellSize;
            let pZ = z * env.cellSize;
            const pY = 1.5;
            let pW = 0.1, pD = 0.2; 
            
            // Inner face offset: half cell size - wall thickness(0.5) - half panel width(0.05)
            const panelOffset = (env.cellSize / 2.0) - 0.5 - 0.05;

            if (dir === 0) { 
                pX += panelOffset; pZ += 0.5;
            } else if (dir === 2) { 
                pX -= panelOffset; pZ -= 0.5;
            } else if (dir === 1) { 
                pZ -= panelOffset; pX += 0.5;
                pW = 0.2; pD = 0.1;
            } else if (dir === 3) { 
                pZ += panelOffset; pX -= 0.5;
                pW = 0.2; pD = 0.1;
            }
            
            const panel = buildWall(pW, pD, env._elevatorPanelMat, 0.4);
            panel.position.set(pX, pY, pZ);
            addGeometry(panel);

            let btnW = pW === 0.1 ? 0.12 : 0.1;
            let btnD = pD === 0.1 ? 0.12 : 0.1;
            const btn = buildWall(btnW, btnD, isMagic ? env._elevatorBtnOnMat : env._elevatorBtnOffMat, 0.08);
            btn.position.set(pX, pY + 0.05, pZ);
            addGeometry(btn);
        }
    };
};
