// TheArchitect.js
// LEVEL 0 PROCEDURAL BLUEPRINT FACTORY

export default class TheArchitect {
    static getStructuralMatrix(ctx) {
        const {random, buildWall, addGeometry, buildChair, buildTable, addFurniture, chunkGroup, hash, stagingMeshes} = ctx;
        return [
            {
                prob: 0.95, build: (x, z) => {
                    const pillar = buildWall(0.5 + (random() * 2.0), 0.5 + (random() * 2.0), this.sharedWallMat);
                    pillar.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                    addGeometry(pillar);
                }
            },
            {
                prob: 0.92, build: (x, z) => {
                    const colCount = Math.floor(random() * 3) + 2;
                    for (let i = 0; i < colCount; i++) {
                        const support = new THREE.Mesh(this.vPipeGeo, this.rustMat);
                        const scale = (0.1 + random() * 0.15) / 0.12;
                        support.scale.set(scale, 1, scale);
                        const offsetX = (random() - 0.5) * 2.0;
                        const offsetZ = (random() - 0.5) * 2.0;
                        support.position.set(x * this.cellSize + offsetX, 1.5, z * this.cellSize + offsetZ);
                        support.rotation.y = random() * Math.PI;
                        addGeometry(support);
                    }
                }
            },
            {
                prob: 0.90, build: (x, z) => {
                    const pW = 0.8, offset = (this.cellSize / 2) - (pW / 2), gap = this.cellSize - (pW * 2);
                    const p1 = buildWall(pW, this.cellSize, this.sharedWallMat);
                    p1.position.set(x * this.cellSize - offset, 1.5, z * this.cellSize);
                    addGeometry(p1);
                    const p2 = buildWall(pW, this.cellSize, this.sharedWallMat);
                    p2.position.set(x * this.cellSize + offset, 1.5, z * this.cellSize);
                    addGeometry(p2);
                    const top = new THREE.Mesh(new THREE.BoxGeometry(gap, 0.3, this.cellSize), this.headerMat);
                    top.position.set(x * this.cellSize, 2.85, z * this.cellSize);
                    addGeometry(top);
                }
            },
            {
                prob: 0.86, build: (x, z) => {
                    const isZ = random() > 0.5;
                    const pW = 0.6;
                    const offset = (this.cellSize / 2) - (pW / 2);
                    const p1 = buildWall(isZ ? pW : this.cellSize, isZ ? this.cellSize : pW, this.sharedWallMat);
                    p1.position.set(x * this.cellSize - (isZ ? offset : 0), 1.5, z * this.cellSize - (isZ ? 0 : offset));
                    addGeometry(p1);
                    const p2 = buildWall(isZ ? pW : this.cellSize, isZ ? this.cellSize : pW, this.sharedWallMat);
                    p2.position.set(x * this.cellSize + (isZ ? offset : 0), 1.5, z * this.cellSize + (isZ ? 0 : offset));
                    addGeometry(p2);
                    const header = buildWall(isZ ? this.cellSize - (pW * 2) : this.cellSize, isZ ? this.cellSize : this.cellSize - (pW * 2), this.headerMat, 0.8, 2.2);
                    header.position.set(x * this.cellSize, 2.6, z * this.cellSize);
                    addGeometry(header);
                }
            },
            {
                prob: 0.82, build: (x, z) => {
                    const pW = 1.2, offset = (this.cellSize / 2) - (pW / 2), gap = this.cellSize - (pW * 2);
                    const p1 = buildWall(pW, this.cellSize, this.sharedWallMat);
                    p1.position.set(x * this.cellSize - offset, 1.5, z * this.cellSize);
                    addGeometry(p1);
                    const p2 = buildWall(pW, this.cellSize, this.sharedWallMat);
                    p2.position.set(x * this.cellSize + offset, 1.5, z * this.cellSize);
                    addGeometry(p2);
                    const top = new THREE.Mesh(new THREE.BoxGeometry(gap, 0.3, this.cellSize), this.headerMat);
                    top.position.set(x * this.cellSize, 2.85, z * this.cellSize);
                    addGeometry(top);

                    // THE ARTISAN: Clean architectural wood framing replacing structural beams.
                    const frameMat = this.woodMat;
                    const jambL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.65, 0.32), frameMat);
                    jambL.position.set(x * this.cellSize - 0.75, 1.325, z * this.cellSize + 1.85);
                    addGeometry(jambL);
                    const jambR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.65, 0.32), frameMat);
                    jambR.position.set(x * this.cellSize + 0.75, 1.325, z * this.cellSize + 1.85);
                    addGeometry(jambR);
                    const jambT = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.32), frameMat);
                    jambT.position.set(x * this.cellSize, 2.70, z * this.cellSize + 1.85);
                    addGeometry(jambT);

                    const doorGeo = new THREE.BoxGeometry(1.4, 2.65, 0.1);
                    doorGeo.translate(0.7, 0, 0.05);
                    const door = new THREE.Mesh(doorGeo, this.doorMat);
                    door.position.set(x * this.cellSize - 0.7, 1.325, z * this.cellSize + 1.85);
                    door.castShadow = door.receiveShadow = true;
                    door.userData = {
                        chunkHash: hash,
                        closedRot: 0,
                        currentRot: 0
                    };
                    chunkGroup.add(door);
                    this.interactiveDoors.push(door);
                    this.walls.push(door);
                    door.updateMatrixWorld();
                    const dBox = new THREE.Box3().setFromObject(door);
                    dBox.chunkHash = hash;
                    door.userData.box = dBox;
                    this.spatialGrid.insert(dBox);
                }
            },
            {
                prob: 0.74, build: (x, z) => {
                    const dir = Math.floor(random() * 2), offset = (this.cellSize / 2) - 0.25;
                    const w1 = dir === 0 ? 0.5 : this.cellSize, d1 = dir === 0 ? this.cellSize : 0.5;
                    const gapW = dir === 0 ? this.cellSize - 1.0 : this.cellSize,
                        gapD = dir === 0 ? this.cellSize : this.cellSize - 1.0;
                    const p1 = buildWall(w1, d1, this.sharedWallMat);
                    p1.position.set(x * this.cellSize - (dir === 0 ? offset : 0), 1.5, z * this.cellSize - (dir === 1 ? offset : 0));
                    addGeometry(p1);
                    const p2 = buildWall(w1, d1, this.sharedWallMat);
                    p2.position.set(x * this.cellSize + (dir === 0 ? offset : 0), 1.5, z * this.cellSize + (dir === 1 ? offset : 0));
                    addGeometry(p2);
                    const top = new THREE.Mesh(new THREE.BoxGeometry(gapW, 0.3, gapD), this.headerMat);
                    top.position.set(x * this.cellSize, 2.85, z * this.cellSize);
                    addGeometry(top);
                }
            },
            {
                prob: 0.65, build: (x, z) => {
                    const w1 = buildWall(this.cellSize, 0.5, this.sharedWallMat);
                    w1.position.set(x * this.cellSize, 1.5, z * this.cellSize - (this.cellSize / 2) + 0.25);
                    addGeometry(w1);
                    const w2 = buildWall(0.5, this.cellSize, this.sharedWallMat);
                    w2.position.set(x * this.cellSize - (this.cellSize / 2) + 0.25, 1.5, z * this.cellSize);
                    addGeometry(w2);
                    if (random() > 0.6) {
                        const table = buildTable(x * this.cellSize + 0.5, 0, z * this.cellSize + 0.5);
                        addFurniture(table);
                    }
                }
            },
            {
                prob: 0.55, build: (x, z) => {
                    const back = buildWall(this.cellSize, 0.5, this.sharedWallMat);
                    back.position.set(x * this.cellSize, 1.5, z * this.cellSize - (this.cellSize / 2) + 0.25);
                    addGeometry(back);
                    const side = buildWall(0.5, this.cellSize / 2, this.sharedWallMat);
                    side.position.set(x * this.cellSize - (this.cellSize / 2) + 0.25, 1.5, z * this.cellSize - (this.cellSize / 4));
                    addGeometry(side);
                    if (random() > 0.5) {
                        const rot = random() > 0.5 ? -Math.PI / 2 : Math.PI / 2;
                        const chair = buildChair(x * this.cellSize + 0.5, 0, z * this.cellSize - 0.5, rot);
                        addFurniture(chair);
                    }
                }
            },
            {
                prob: 0.48, build: (x, z) => {
                    const structureType = random();
                    if (structureType > 0.40) {
                        const dir = Math.floor(random() * 4);
                        const isZ = dir % 2 === 0;
                        const sign = (dir > 1) ? 1 : -1;

                        const longWall = buildWall(isZ ? 0.6 : this.cellSize * 0.8, isZ ? this.cellSize * 0.8 : 0.6, this.sharedWallMat);
                        longWall.position.set(x * this.cellSize + (isZ ? sign * 1.2 : 0), 1.5, z * this.cellSize + (isZ ? 0 : sign * 1.2));
                        longWall.userData.isEntityBlocker = true;
                        addGeometry(longWall);

                        const shortWall = buildWall(isZ ? this.cellSize * 0.6 : 0.6, isZ ? 0.6 : this.cellSize * 0.6, this.sharedWallMat);
                        const sOffsetX = isZ ? (sign * 1.2) - (this.cellSize * 0.3) : sign * 1.2;
                        const sOffsetZ = isZ ? sign * 1.2 : (sign * 1.2) - (this.cellSize * 0.3);
                        shortWall.position.set(x * this.cellSize + sOffsetX, 1.5, z * this.cellSize + sOffsetZ);
                        shortWall.userData.isEntityBlocker = true;
                        addGeometry(shortWall);

                        if (random() > 0.5) {
                            const clutter = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.8), this.woodMat);
                            clutter.position.set(x * this.cellSize, 0.6, z * this.cellSize);
                            clutter.rotation.y = random() * Math.PI;
                            clutter.userData.isEntityBlocker = true;
                            addGeometry(clutter);
                        }
                    } else {
                        const isMagic = random() > 0.75;
                        const dir = Math.floor(random() * 4);
                        const isZ = dir % 2 === 0;
                        const w1 = buildWall(isZ ? 0.5 : this.cellSize, isZ ? this.cellSize : 0.5, this.sharedWallMat);
                        w1.position.set(x * this.cellSize + (isZ ? -(this.cellSize / 2) + 0.25 : 0), 1.5, z * this.cellSize + (isZ ? 0 : -(this.cellSize / 2) + 0.25));
                        addGeometry(w1);
                        const w2 = buildWall(isZ ? 0.5 : this.cellSize, isZ ? this.cellSize : 0.5, this.sharedWallMat);
                        w2.position.set(x * this.cellSize + (isZ ? (this.cellSize / 2) - 0.25 : 0), 1.5, z * this.cellSize + (isZ ? 0 : (this.cellSize / 2) - 0.25));
                        addGeometry(w2);
                        const w3 = buildWall(isZ ? this.cellSize : 0.5, isZ ? 0.5 : this.cellSize, this.sharedWallMat);
                        const backOffset = (this.cellSize / 2) - 0.25;
                        const sign = (dir === 2 || dir === 3) ? 1 : -1;
                        w3.position.set(x * this.cellSize + (isZ ? 0 : sign * backOffset), 1.5, z * this.cellSize + (isZ ? sign * backOffset : 0));
                        addGeometry(w3);
                        const stepCount = 10;
                        const stepDepth = (this.cellSize - 0.5) / stepCount;
                        const stepHeight = 3.0 / stepCount;
                        const innerW = this.cellSize - 1.0;
                        for (let s = 0; s < stepCount; s++) {
                            const h = (s + 1) * stepHeight;
                            const wX = isZ ? innerW : stepDepth;
                            const wZ = isZ ? stepDepth : innerW;
                            const step = new THREE.Mesh(new THREE.BoxGeometry(wX, h, wZ), this.structMat);
                            let offset = (this.cellSize / 2) - (stepDepth / 2) - (s * stepDepth);
                            if (dir === 2 || dir === 3) offset = -offset;
                            const posX = x * this.cellSize + (isZ ? 0 : offset);
                            const posZ = z * this.cellSize + (isZ ? offset : 0);
                            step.position.set(posX, h / 2, posZ);
                            const isTopStep = (s === stepCount - 1);
                            addGeometry(step, isMagic && isTopStep);
                        }
                    }
                }
            },
            {
                prob: 0.40, build: (x, z) => {
                    const face = Math.floor(random() * 4);
                    const tunnelOnZ = (face === 0 || face === 1);
                    const isFloorLevel = random() > 0.3;

                    if (isFloorLevel) {
                        const burstLength = Math.floor(random() * 3) + 1;
                        const holeW = 1.2;
                        const holeH = 0.7;
                        const sideW = (this.cellSize - holeW) / 2;
                        const sideOffset = (this.cellSize / 2) - (sideW / 2);
                        const topH = 3.0 - holeH;
                        const liningH = 0.05;
                        const sideH = holeH - (liningH * 2);
                        const sideOffsetLining = (holeW / 2) - (liningH / 2);

                        for (let i = 0; i < burstLength; i++) {
                            const segX = x + (tunnelOnZ ? 0 : i);
                            const segZ = z + (tunnelOnZ ? i : 0);
                            const w1 = tunnelOnZ ? sideW : this.cellSize;
                            const d1 = tunnelOnZ ? this.cellSize : sideW;

                            const side1 = buildWall(w1, d1, this.sharedWallMat);
                            side1.position.set(segX * this.cellSize + (tunnelOnZ ? -sideOffset : 0), 1.5, segZ * this.cellSize + (tunnelOnZ ? 0 : -sideOffset));
                            addGeometry(side1);

                            const side2 = buildWall(w1, d1, this.sharedWallMat);
                            side2.position.set(segX * this.cellSize + (tunnelOnZ ? sideOffset : 0), 1.5, segZ * this.cellSize + (tunnelOnZ ? 0 : sideOffset));
                            addGeometry(side2);

                            const topW = tunnelOnZ ? holeW : this.cellSize;
                            const topD = tunnelOnZ ? this.cellSize : holeW;
                            const top = buildWall(topW, topD, this.sharedWallMat, topH, holeH);
                            top.position.set(segX * this.cellSize, holeH + (topH / 2), segZ * this.cellSize);
                            addGeometry(top);

                            const linW = tunnelOnZ ? holeW : this.cellSize + 0.02;
                            const linD = tunnelOnZ ? this.cellSize + 0.02 : holeW;
                            const liningFloor = buildWall(linW, linD, this.ventMat, liningH);
                            liningFloor.position.set(segX * this.cellSize, liningH / 2, segZ * this.cellSize);
                            addGeometry(liningFloor);

                            const liningCeil = buildWall(linW, linD, this.ventMat, liningH);
                            liningCeil.position.set(segX * this.cellSize, holeH - (liningH / 2), segZ * this.cellSize);
                            addGeometry(liningCeil);

                            const liningSideW = tunnelOnZ ? liningH : linW;
                            const liningSideD = tunnelOnZ ? linD : liningH;
                            const liningLeft = buildWall(liningSideW, liningSideD, this.ventMat, sideH);
                            liningLeft.position.set(segX * this.cellSize + (tunnelOnZ ? -sideOffsetLining : 0), holeH / 2, segZ * this.cellSize + (tunnelOnZ ? 0 : -sideOffsetLining));
                            addGeometry(liningLeft);

                            const liningRight = buildWall(liningSideW, liningSideD, this.ventMat, sideH);
                            liningRight.position.set(segX * this.cellSize + (tunnelOnZ ? sideOffsetLining : 0), holeH / 2, segZ * this.cellSize + (tunnelOnZ ? 0 : sideOffsetLining));
                            addGeometry(liningRight);

                            const blockBox = new THREE.Box3(
                                new THREE.Vector3(segX * this.cellSize - (tunnelOnZ ? holeW/2 : this.cellSize/2), 0, segZ * this.cellSize - (tunnelOnZ ? this.cellSize/2 : holeW/2)),
                                new THREE.Vector3(segX * this.cellSize + (tunnelOnZ ? holeW/2 : this.cellSize/2), 3.0, segZ * this.cellSize + (tunnelOnZ ? this.cellSize/2 : holeW/2))
                            );
                            blockBox.isEntityBlocker = true;
                            blockBox.isInvisibleBlocker = true;
                            blockBox.chunkHash = hash;
                            this.spatialGrid.insert(blockBox);

                            const grateOffset = (this.cellSize / 2) - 0.025;
                            if (i === 0) {
                                if (tunnelOnZ) ctx.addGrate(segX * this.cellSize, 0.35, segZ * this.cellSize - grateOffset, false);
                                else ctx.addGrate(segX * this.cellSize - grateOffset, 0.35, segZ * this.cellSize, true);
                            }
                            if (i === burstLength - 1) {
                                if (tunnelOnZ) ctx.addGrate(segX * this.cellSize, 0.35, segZ * this.cellSize + grateOffset, false);
                                else ctx.addGrate(segX * this.cellSize + grateOffset, 0.35, segZ * this.cellSize, true);
                            }
                        }
                    } else {
                        const wall = new THREE.Mesh(this.sharedWallGeo, this.sharedWallMat);
                        wall.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        addGeometry(wall);
                        const ventGeo = new THREE.BoxGeometry(1.2, 0.6, 0.05);
                        const vent = new THREE.Mesh(ventGeo, this.wallVentMat);
                        const finalOffset = (this.cellSize / 2) + 0.06;
                        if (face === 0) {
                            vent.position.set(x * this.cellSize, 2.6, z * this.cellSize + finalOffset);
                        } else if (face === 1) {
                            vent.position.set(x * this.cellSize, 2.6, z * this.cellSize - finalOffset);
                        } else if (face === 2) {
                            vent.rotation.y = Math.PI / 2;
                            vent.position.set(x * this.cellSize + finalOffset, 2.6, z * this.cellSize);
                        } else {
                            vent.rotation.y = Math.PI / 2;
                            vent.position.set(x * this.cellSize - finalOffset, 2.6, z * this.cellSize);
                        }
                        addGeometry(vent);
                    }
                }
            },
            {
                prob: 0.35, build: (x, z) => {
                    const isStraight = random() > 0.5;
                    const blockW = 1.85;
                    const offset = 1.075;

                    if (isStraight) {
                        const isZ = random() > 0.5;
                        const w1 = isZ ? blockW : this.cellSize;
                        const d1 = isZ ? this.cellSize : blockW;

                        const block1 = buildWall(w1, d1, this.sharedWallMat);
                        block1.position.set(x * this.cellSize - (isZ ? offset : 0), 1.5, z * this.cellSize - (isZ ? 0 : offset));
                        block1.userData.isEntityBlocker = true;
                        addGeometry(block1);

                        const block2 = buildWall(w1, d1, this.sharedWallMat);
                        block2.position.set(x * this.cellSize + (isZ ? offset : 0), 1.5, z * this.cellSize + (isZ ? 0 : offset));
                        block2.userData.isEntityBlocker = true;
                        addGeometry(block2);
                    } else {
                        const flipX = random() > 0.5 ? 1 : -1;
                        const flipZ = random() > 0.5 ? 1 : -1;

                        const innerBlock = buildWall(blockW, blockW, this.sharedWallMat);
                        innerBlock.position.set(x * this.cellSize + (flipX * offset), 1.5, z * this.cellSize + (flipZ * offset));
                        innerBlock.userData.isEntityBlocker = true;
                        addGeometry(innerBlock);

                        const wallX = buildWall(blockW, this.cellSize, this.sharedWallMat);
                        wallX.position.set(x * this.cellSize - (flipX * offset), 1.5, z * this.cellSize);
                        wallX.userData.isEntityBlocker = true;
                        addGeometry(wallX);

                        const wallZ = buildWall(this.cellSize, blockW, this.sharedWallMat);
                        wallZ.position.set(x * this.cellSize, 1.5, z * this.cellSize - (flipZ * offset));
                        wallZ.userData.isEntityBlocker = true;
                        addGeometry(wallZ);
                    }
                }
            },
            {
                prob: 0.30, build: (x, z) => {
                    const typeRoll = random();
                    const dirZ = random() > 0.5;
                    const burstLength = Math.floor(random() * 4) + 1;

                    if (typeRoll > 0.66) {
                        const tunnelW = 1.2;
                        const tunnelH = 0.7;
                        const sideW = (this.cellSize - tunnelW) / 2;
                        const sideOffset = (this.cellSize / 2) - (sideW / 2);
                        const roofH_block = 3.0 - tunnelH;
                        const liningH = 0.05;
                        const sideH = tunnelH - (liningH * 2);
                        const sideOffsetLining = (tunnelW / 2) - (liningH / 2);

                        for (let i = 0; i < burstLength; i++) {
                            const segX = x + (dirZ ? 0 : i);
                            const segZ = z + (dirZ ? i : 0);

                            const side1 = buildWall(dirZ ? sideW : this.cellSize, dirZ ? this.cellSize : sideW, this.sharedWallMat);
                            side1.position.set(segX * this.cellSize + (dirZ ? -sideOffset : 0), 1.5, segZ * this.cellSize + (dirZ ? 0 : -sideOffset));
                            addGeometry(side1);

                            const side2 = buildWall(dirZ ? sideW : this.cellSize, dirZ ? this.cellSize : sideW, this.sharedWallMat);
                            side2.position.set(segX * this.cellSize + (dirZ ? sideOffset : 0), 1.5, segZ * this.cellSize + (dirZ ? 0 : sideOffset));
                            addGeometry(side2);

                            const roof = buildWall(dirZ ? tunnelW : this.cellSize, dirZ ? this.cellSize : tunnelW, this.sharedWallMat, roofH_block, tunnelH);
                            roof.position.set(segX * this.cellSize, tunnelH + (roofH_block / 2), segZ * this.cellSize);
                            addGeometry(roof);

                            const liningFloor = buildWall(dirZ ? tunnelW : this.cellSize + 0.05, dirZ ? this.cellSize + 0.05 : tunnelW, this.ventMat, liningH);
                            liningFloor.position.set(segX * this.cellSize, liningH / 2, segZ * this.cellSize);
                            addGeometry(liningFloor);

                            const liningCeil = buildWall(dirZ ? tunnelW : this.cellSize + 0.05, dirZ ? this.cellSize + 0.05 : tunnelW, this.ventMat, liningH);
                            liningCeil.position.set(segX * this.cellSize, tunnelH - (liningH / 2), segZ * this.cellSize);
                            addGeometry(liningCeil);

                            const liningSideW = dirZ ? liningH : this.cellSize + 0.05;
                            const liningSideD = dirZ ? this.cellSize + 0.05 : liningH;

                            const liningLeft = buildWall(liningSideW, liningSideD, this.ventMat, sideH);
                            liningLeft.position.set(segX * this.cellSize + (dirZ ? -sideOffsetLining : 0), tunnelH / 2, segZ * this.cellSize + (dirZ ? 0 : -sideOffsetLining));
                            addGeometry(liningLeft);

                            const liningRight = buildWall(liningSideW, liningSideD, this.ventMat, sideH);
                            liningRight.position.set(segX * this.cellSize + (dirZ ? sideOffsetLining : 0), tunnelH / 2, segZ * this.cellSize + (dirZ ? 0 : sideOffsetLining));
                            addGeometry(liningRight);

                            const blockBox = new THREE.Box3(
                                new THREE.Vector3(segX * this.cellSize - (dirZ ? tunnelW/2 : this.cellSize/2), 0, segZ * this.cellSize - (dirZ ? this.cellSize/2 : tunnelW/2)),
                                new THREE.Vector3(segX * this.cellSize + (dirZ ? tunnelW/2 : this.cellSize/2), 3.0, segZ * this.cellSize + (dirZ ? this.cellSize/2 : tunnelW/2))
                            );
                            blockBox.isEntityBlocker = true;
                            blockBox.isInvisibleBlocker = true;
                            blockBox.chunkHash = hash;
                            this.spatialGrid.insert(blockBox);

                            const grateOffset = (this.cellSize / 2) - 0.025;
                            if (i === 0) {
                                if (dirZ) ctx.addGrate(segX * this.cellSize, 0.35, segZ * this.cellSize - grateOffset, false);
                                else ctx.addGrate(segX * this.cellSize - grateOffset, 0.35, segZ * this.cellSize, true);
                            }
                            if (i === burstLength - 1) {
                                if (dirZ) ctx.addGrate(segX * this.cellSize, 0.35, segZ * this.cellSize + grateOffset, false);
                                else ctx.addGrate(segX * this.cellSize + grateOffset, 0.35, segZ * this.cellSize, true);
                            }
                        }
                    } else if (typeRoll > 0.33) {
                        const wallW = (this.cellSize - 0.3) / 2;
                        const offset = (wallW / 2) + 0.15;

                        for (let i = 0; i < burstLength; i++) {
                            const segX = x + (dirZ ? 0 : i);
                            const segZ = z + (dirZ ? i : 0);

                            const block1 = buildWall(dirZ ? wallW : this.cellSize, dirZ ? this.cellSize : wallW, this.sharedWallMat);
                            block1.position.set(segX * this.cellSize + (dirZ ? -offset : 0), 1.5, segZ * this.cellSize + (dirZ ? 0 : -offset));
                            block1.userData.isEntityBlocker = true;
                            addGeometry(block1);

                            const block2 = buildWall(dirZ ? wallW : this.cellSize, dirZ ? this.cellSize : wallW, this.sharedWallMat);
                            block2.position.set(segX * this.cellSize + (dirZ ? offset : 0), 1.5, segZ * this.cellSize + (dirZ ? 0 : offset));
                            block2.userData.isEntityBlocker = true;
                            addGeometry(block2);
                        }
                    } else {
                        const sideW = 1.0;
                        const sideOffset = (this.cellSize / 2) - (sideW / 2);
                        const roofW = this.cellSize - (sideW * 2);
                        const roofH = 1.8;

                        for (let i = 0; i < burstLength; i++) {
                            const segX = x + (dirZ ? 0 : i);
                            const segZ = z + (dirZ ? i : 0);

                            const side1 = buildWall(dirZ ? sideW : this.cellSize, dirZ ? this.cellSize : sideW, this.sharedWallMat);
                            side1.position.set(segX * this.cellSize + (dirZ ? -sideOffset : 0), 1.5, segZ * this.cellSize + (dirZ ? 0 : -sideOffset));
                            addGeometry(side1);

                            const side2 = buildWall(dirZ ? sideW : this.cellSize, dirZ ? this.cellSize : sideW, this.sharedWallMat);
                            side2.position.set(segX * this.cellSize + (dirZ ? sideOffset : 0), 1.5, segZ * this.cellSize + (dirZ ? 0 : sideOffset));
                            addGeometry(side2);

                            const roof = buildWall(dirZ ? roofW : this.cellSize, dirZ ? this.cellSize : roofW, this.sharedWallMat, roofH, 1.2);
                            roof.position.set(segX * this.cellSize, 1.2 + (roofH / 2), segZ * this.cellSize);
                            addGeometry(roof);

                            const blockBox = new THREE.Box3(
                                new THREE.Vector3(segX * this.cellSize - (dirZ ? roofW/2 : this.cellSize/2), 0, segZ * this.cellSize - (dirZ ? this.cellSize/2 : roofW/2)),
                                new THREE.Vector3(segX * this.cellSize + (dirZ ? roofW/2 : this.cellSize/2), 3.0, segZ * this.cellSize + (dirZ ? this.cellSize/2 : roofW/2))
                            );
                            blockBox.isEntityBlocker = true;
                            blockBox.isInvisibleBlocker = true;
                            blockBox.chunkHash = hash;
                            this.spatialGrid.insert(blockBox);
                        }
                    }
                }
            },
            {
                prob: 0.03, build: (x, z) => {
                    const wall = new THREE.Mesh(this.sharedWallGeo, this.sharedWallMat);
                    wall.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                    addGeometry(wall);
                }
            },
            {
                prob: 0.00, build: (x, z) => {
                    if (ctx.claimOasis && ctx.claimOasis()) {
                        const cx = x * this.cellSize;
                        const cz = z * this.cellSize;
                        const half = this.cellSize / 2;

                        const floorGeo = new THREE.PlaneGeometry(this.cellSize, this.cellSize);
                        const floor = new THREE.Mesh(floorGeo, this.tileMat);
                        floor.rotation.x = -Math.PI / 2;
                        floor.position.set(cx, 0.01, cz);
                        addGeometry(floor);

                        const wBack = buildWall(this.cellSize, 0.5, this.woodMat);
                        wBack.position.set(cx, 1.5, cz - half + 0.25);
                        wBack.userData.isEntityBlocker = true;
                        addGeometry(wBack);

                        const wLeft = buildWall(0.5, this.cellSize, this.woodMat);
                        wLeft.position.set(cx - half + 0.25, 1.5, cz);
                        wLeft.userData.isEntityBlocker = true;
                        addGeometry(wLeft);

                        const wRight = buildWall(0.5, this.cellSize, this.woodMat);
                        wRight.position.set(cx + half - 0.25, 1.5, cz);
                        wRight.userData.isEntityBlocker = true;
                        addGeometry(wRight);

                        const table = buildTable(cx, 0, cz);
                        table.userData.chunkHash = hash;
                        table.updateMatrixWorld(true);

                        const tBox = new THREE.Box3().setFromObject(table);
                        tBox.chunkHash = hash;
                        tBox.isEntityBlocker = true;
                        this.spatialGrid.insert(tBox);

                        table.traverse((child) => {
                            if (child.isMesh) {
                                child.userData.chunkHash = hash;
                                child.updateMatrixWorld(true);
                                stagingMeshes.push(child);
                            }
                        });

                        const almondGroup = new THREE.Group();
                        const almondMesh = this.almondPrefab.clone();
                        almondGroup.add(almondMesh);
                        const aGlow = new THREE.Mesh(this.glowGeo, this.glowMat);
                        aGlow.scale.set(0.15, 0.15, 0.15);
                        aGlow.position.y = 0.01;
                        almondGroup.add(aGlow);

                        almondGroup.position.set(cx - 0.3, 0.825, cz);

                        almondGroup.rotation.y = (random() - 0.5) * 0.8;
                        almondGroup.userData = {type: 'almond', chunkHash: hash, active: true};
                        chunkGroup.add(almondGroup);
                        if (!this.interactables) this.interactables = [];
                        this.interactables.push(almondGroup);

                        const batGroup = new THREE.Group();
                        const batMesh = this.batteryPrefab.clone();
                        batGroup.add(batMesh);
                        const bGlow = new THREE.Mesh(this.glowGeo, this.glowMat);
                        bGlow.scale.set(0.20, 0.20, 0.20);
                        bGlow.position.y = 0.01;
                        batGroup.add(bGlow);
                        batGroup.position.set(cx + 0.3, 0.825, cz);
                        batGroup.rotation.y = (random() - 0.5) * 0.8;
                        batGroup.userData = {type: 'battery', chunkHash: hash, active: true};
                        chunkGroup.add(batGroup);
                        this.interactables.push(batGroup);

                        const activeMat = this.baseLightMat.clone();
                        activeMat.color.setHex(0xffeedd);
                        activeMat.emissive.setHex(0xffaa55);
                        const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                        panel.position.set(cx, 2.98, cz);
                        chunkGroup.add(panel);
                        this.walls.push(panel);
                        this.fixtureData.push({
                            chunkHash: hash,
                            position: new THREE.Vector3(cx, 2.8, cz),
                            flickerOffset: 0,
                            material: activeMat,
                            isFaulty: false,
                            baseIntensity: 0.8,
                            targetIntensity: 0.8,
                            currentIntensity: 0.8,
                            isFake: false
                        });
                    } else {
                        const wall = new THREE.Mesh(this.sharedWallGeo, this.sharedWallMat);
                        wall.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        addGeometry(wall);
                    }
                }
            }
        ];
    }

    static getSectorMatrix(ctx) {
        const {
            random,
            buildWall,
            addGeometry,
            buildChair,
            buildTable,
            addFurniture,
            chunkGroup,
            hash,
            stagingMeshes
        } = ctx;
        return [
            {
                name: "THE POOLROOMS",
                prob: 0.12,
                foundationMat: this.structMat,
                build: (x, z, localX, localZ, maze, inDir, outDir) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, inDir, outDir, this.sharedWallMat)) return;
                    const isWall = maze && maze[localX][localZ];
                    if (isWall) {
                        const cPillar = new THREE.Mesh(this.vPipeGeo, this.rustMat);
                        cPillar.position.set(x * this.cellSize + (this.cellSize / 2), 1.5, z * this.cellSize + (this.cellSize / 2));
                        addGeometry(cPillar);
                        const fenceGeoX = new THREE.BoxGeometry(this.cellSize, 3.0, 0.05);
                        const fenceX = new THREE.Mesh(fenceGeoX, this.waterMat);
                        fenceX.position.set(x * this.cellSize, 1.5, z * this.cellSize + (this.cellSize / 2));
                        fenceX.userData.isEntityBlocker = true;
                        addGeometry(fenceX);
                        const fenceGeoZ = new THREE.BoxGeometry(0.05, 3.0, this.cellSize);
                        const fenceZ = new THREE.Mesh(fenceGeoZ, this.waterMat);
                        fenceZ.position.set(x * this.cellSize + (this.cellSize / 2), 1.5, z * this.cellSize);
                        fenceZ.userData.isEntityBlocker = true;
                        addGeometry(fenceZ);
                    } else {
                        if (localX % 3 === 0 && localZ % 3 === 0 && random() > 0.5) {
                            const activeMat = this.baseLightMat.clone();
                            activeMat.color.setHex(0xffaa55);
                            activeMat.emissive.setHex(0xffaa55);
                            const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                            panel.position.set(x * this.cellSize, 2.98, z * this.cellSize);
                            chunkGroup.add(panel);
                            this.walls.push(panel);
                            this.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(x * this.cellSize, 2.8, z * this.cellSize),
                                flickerOffset: random() * 500,
                                material: activeMat,
                                isFaulty: random() > 0.5,
                                baseIntensity: 0.5,
                                targetIntensity: 0.5,
                                currentIntensity: 0.5
                            });
                        }
                    }
                }
            },
            {
                name: "THE CLINIC",
                prob: 0.12,
                foundationMat: this.clinicMat,
                build: (x, z, localX, localZ, maze, inDir, outDir) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, inDir, outDir, this.sharedWallMat)) return;
                    if (localX % 2 === 1 && localZ % 2 === 1) {
                        const curtain = new THREE.Mesh(new THREE.BoxGeometry(this.cellSize * 0.9, 2.2, 0.05), this.fabricMat);
                        curtain.position.set(x * this.cellSize, 1.1, z * this.cellSize - 1.8);
                        addGeometry(curtain);
                        const cotFrame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 2.0), this.structMat);
                        cotFrame.position.set(x * this.cellSize, 0.25, z * this.cellSize);
                        addGeometry(cotFrame);
                        const mattress = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.15, 1.9), this.fabricMat);
                        mattress.position.set(x * this.cellSize, 0.575, z * this.cellSize);
                        addGeometry(mattress);
                        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.0, 0.08), this.rustMat);
                        pole.position.set(x * this.cellSize + 0.8, 1.0, z * this.cellSize + 0.8);
                        addGeometry(pole);
                        if (random() > 0.3) {
                            const chair = buildChair(x * this.cellSize - 0.8, 0, z * this.cellSize + 0.5, random() * Math.PI);
                            addFurniture(chair);
                        }
                        const activeMat = this.baseLightMat.clone();
                        activeMat.color.setHex(0xd0e8ff);
                        activeMat.emissive.setHex(0xa0d0ff);
                        const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                        panel.position.set(x * this.cellSize, 2.98, z * this.cellSize);
                        chunkGroup.add(panel);
                        this.walls.push(panel);
                        this.fixtureData.push({
                            chunkHash: hash,
                            position: new THREE.Vector3(x * this.cellSize, 2.8, z * this.cellSize),
                            flickerOffset: random() * 500,
                            material: activeMat,
                            isFaulty: random() > 0.6,
                            baseIntensity: 0.5,
                            targetIntensity: 0.5,
                            currentIntensity: 0.5
                        });
                    } else {
                        const clutterRoll = random();
                        if (clutterRoll > 0.65) {
                            const isRotated = random() > 0.5;
                            const screenW = isRotated ? 0.1 : this.cellSize * 0.8;
                            const screenD = isRotated ? this.cellSize * 0.8 : 0.1;
                            const screen = new THREE.Mesh(new THREE.BoxGeometry(screenW, 2.4, screenD), this.fabricMat);
                            screen.position.set(x * this.cellSize, 1.2, z * this.cellSize);
                            addGeometry(screen);
                        } else if (clutterRoll > 0.50) {
                            const boxCount = Math.floor(random() * 3) + 1;
                            for (let i = 0; i < boxCount; i++) {
                                const mBox = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), this.woodMat);
                                mBox.position.set(x * this.cellSize + (random() * 0.4 - 0.2), 0.25 + (i * 0.5), z * this.cellSize + (random() * 0.4 - 0.2));
                                mBox.rotation.y = random() * Math.PI;
                                mBox.rotation.x = random() > 0.8 ? Math.PI / 2 : 0;
                                addGeometry(mBox);
                            }
                        } else if (clutterRoll > 0.40) {
                            const chair = buildChair(x * this.cellSize, 0, z * this.cellSize, random() * Math.PI * 2);
                            addFurniture(chair);
                        }
                    }
                }
            },
            {
                name: "THE BOARDROOM",
                prob: 0.12,
                foundationMat: this.tileMat,
                build: (x, z, localX, localZ, maze, inDir, outDir) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, inDir, outDir, this.sharedWallMat)) return;
                    if (localX >= 3 && localX <= 12 && (localZ === 7 || localZ === 8)) {
                        const table = buildTable(x * this.cellSize, 0, z * this.cellSize);
                        addFurniture(table);
                        if (localZ === 8) {
                            addFurniture(buildChair(x * this.cellSize, 0, z * this.cellSize + 1.2, 0));
                        }
                        if (localZ === 7) {
                            addFurniture(buildChair(x * this.cellSize, 0, z * this.cellSize - 1.2, Math.PI));
                        }
                        if (localX === 3 && localZ === 7) {
                            addFurniture(buildChair(x * this.cellSize - 1.2, 0, z * this.cellSize + 2.0, -Math.PI / 2));
                        }
                        if (localX === 12 && localZ === 8) {
                            addFurniture(buildChair(x * this.cellSize + 1.2, 0, z * this.cellSize - 2.0, Math.PI / 2));
                        }
                        const activeMat = this.baseLightMat.clone();
                        const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                        panel.position.set(x * this.cellSize, 2.98, z * this.cellSize);
                        chunkGroup.add(panel);
                        this.walls.push(panel);
                        this.fixtureData.push({
                            chunkHash: hash,
                            position: new THREE.Vector3(x * this.cellSize, 2.8, z * this.cellSize),
                            flickerOffset: random() * 500,
                            material: activeMat,
                            isFaulty: random() > 0.8,
                            baseIntensity: 0.6,
                            targetIntensity: 0.6,
                            currentIntensity: 0.6
                        });
                    }
                }
            },
            {
                name: "THE ARCHIVE",
                prob: 0.12,
                foundationMat: this.structMat,
                build: (x, z, localX, localZ, maze, inDir, outDir) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, inDir, outDir, this.structMat)) return;
                    const isWall = maze && maze[localX][localZ];
                    if (isWall) {
                        const rack = buildWall(this.cellSize * 0.95, this.cellSize * 0.95, this.structMat);
                        rack.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        rack.userData.isEntityBlocker = true;
                        addGeometry(rack);
                        for (let h = 0.4; h < 2.8; h += 0.6) {
                            if (random() > 0.4) {
                                const boxW = 0.5 + random() * 0.5;
                                const box = new THREE.Mesh(new THREE.BoxGeometry(boxW, 0.45, 0.65), this.woodMat);
                                box.position.set(x * this.cellSize + (random() * 0.4 - 0.2), h, z * this.cellSize + (random() * 0.4 - 0.2));
                                box.rotation.y = (random() - 0.5) * 0.5;
                                addGeometry(box);
                            }
                        }
                    } else {
                        if (random() > 0.85) {
                            const activeMat = this.baseBrokenLightMat.clone();
                            const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                            panel.position.set(x * this.cellSize, 2.98, z * this.cellSize);
                            chunkGroup.add(panel);
                            this.walls.push(panel);
                            this.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(x * this.cellSize, 2.8, z * this.cellSize),
                                flickerOffset: random() * 500,
                                material: activeMat,
                                isFaulty: true,
                                baseIntensity: 0.1,
                                targetIntensity: 0.1,
                                currentIntensity: 0.1
                            });
                        }
                    }
                }
            },
            {
                name: "THE SERVER FARM",
                prob: 0.12,
                foundationMat: this.serverFloorMat,
                build: (x, z, localX, localZ, maze, inDir, outDir) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, inDir, outDir, this.sharedWallMat)) return;
                    const isWall = maze && maze[localX][localZ];
                    if (isWall) {
                        const rack = buildWall(this.cellSize * 0.85, this.cellSize * 0.85, this.serverMat);
                        rack.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        rack.userData.isEntityBlocker = true;
                        addGeometry(rack);
                    } else {
                        const openE = localX < this.chunkSize - 1 ? !maze[localX + 1][localZ] : !maze[localX][localZ];
                        const openS = localZ < this.chunkSize - 1 ? !maze[localX][localZ + 1] : !maze[localX][localZ];
                        const openN = localZ > 0 ? !maze[localX][localZ - 1] : !maze[localX][localZ];
                        const openW = localX > 0 ? !maze[localX - 1][localZ] : !maze[localX][localZ];
                        const offset = 0.9;
                        let hasPipes = false;
                        if (openE) {
                            const pipeE = new THREE.Mesh(this.pipeGeo, this.rustMat);
                            pipeE.position.set(x * this.cellSize + (this.cellSize / 2) + offset, 2.75, z * this.cellSize + offset);
                            addGeometry(pipeE);
                            hasPipes = true;
                        }
                        if (openS) {
                            const pipeS = new THREE.Mesh(this.pipeGeo, this.rustMat);
                            pipeS.rotation.y = Math.PI / 2;
                            pipeS.position.set(x * this.cellSize + offset, 2.75, z * this.cellSize + (this.cellSize / 2) + offset);
                            addGeometry(pipeS);
                            hasPipes = true;
                        }
                        if (hasPipes || openN || openW) {
                            const mount = new THREE.Mesh(this.pipeMountGeo, this.rustMat);
                            mount.position.set(x * this.cellSize + offset, 2.9, z * this.cellSize + offset);
                            addGeometry(mount);
                            if (random() > 0.1) {
                                const junction = new THREE.Mesh(this.pipeJunctionGeo, this.rustMat);
                                junction.position.set(x * this.cellSize + offset, 2.75, z * this.cellSize + offset);
                                addGeometry(junction);
                            }
                        }
                        if (random() > 0.8) {
                            const activeMat = this.baseLightMat.clone();
                            activeMat.color.setHex(0xff3333);
                            activeMat.emissive.setHex(0xff0000);
                            const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                            panel.position.set(x * this.cellSize, 2.98, z * this.cellSize);
                            chunkGroup.add(panel);
                            this.walls.push(panel);
                            this.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(x * this.cellSize, 2.8, z * this.cellSize),
                                flickerOffset: random() * 500,
                                material: activeMat,
                                isFaulty: random() > 0.6,
                                baseIntensity: 0.4,
                                targetIntensity: 0.4,
                                currentIntensity: 0.4
                            });
                        }
                    }
                }
            },
            {
                name: "THE MAINTENANCE SHAFTS",
                prob: 0.10,
                foundationMat: this.ventMat,
                build: (x, z, localX, localZ, maze, inDir, outDir) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, inDir, outDir, this.structMat)) return;
                    const isWall = maze && maze[localX][localZ];
                    if (isWall) {
                        const block = buildWall(this.cellSize, this.cellSize, this.structMat);
                        block.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        block.userData.isEntityBlocker = true;
                        addGeometry(block);
                    } else {
                        if (random() > 0.4) {
                            const isZWall = random() > 0.5;
                            const offset = random() > 0.5 ? 1.8 : -1.8;
                            const trim = new THREE.Mesh(new THREE.BoxGeometry(this.cellSize, 0.1, 0.4), this.hazardMat);
                            if (isZWall) {
                                trim.rotation.y = Math.PI / 2;
                                trim.position.set(x * this.cellSize + offset, 0.05, z * this.cellSize);
                            } else {
                                trim.position.set(x * this.cellSize, 0.05, z * this.cellSize + offset);
                            }
                            addGeometry(trim);
                        }
                        const openE = localX < this.chunkSize - 1 ? !maze[localX + 1][localZ] : !maze[localX][localZ];
                        const openS = localZ < this.chunkSize - 1 ? !maze[localX][localZ + 1] : !maze[localX][localZ];
                        const openN = localZ > 0 ? !maze[localX][localZ - 1] : !maze[localX][localZ];
                        const openW = localX > 0 ? !maze[localX - 1][localZ] : !maze[localX][localZ];
                        const offset = -1.1;
                        let hasPipes = false;
                        if (openE) {
                            const pipeE = new THREE.Mesh(this.pipeGeo, this.rustMat);
                            pipeE.position.set(x * this.cellSize + (this.cellSize / 2) + offset, 2.8, z * this.cellSize + offset);
                            addGeometry(pipeE);
                            hasPipes = true;
                        }
                        if (openS) {
                            const pipeS = new THREE.Mesh(this.pipeGeo, this.rustMat);
                            pipeS.rotation.y = Math.PI / 2;
                            pipeS.position.set(x * this.cellSize + offset, 2.8, z * this.cellSize + (this.cellSize / 2) + offset);
                            addGeometry(pipeS);
                            hasPipes = true;
                        }
                        if (hasPipes || openN || openW) {
                            const mount = new THREE.Mesh(this.pipeMountGeo, this.rustMat);
                            mount.position.set(x * this.cellSize + offset, 2.925, z * this.cellSize + offset);
                            addGeometry(mount);
                            if (random() > 0.1) {
                                const junction = new THREE.Mesh(this.pipeJunctionGeo, this.rustMat);
                                junction.position.set(x * this.cellSize + offset, 2.8, z * this.cellSize + offset);
                                addGeometry(junction);
                            }
                        }
                        if (random() > 0.7) {
                            const activeMat = this.baseLightMat.clone();
                            activeMat.color.setHex(0xffaa00);
                            activeMat.emissive.setHex(0xaa5500);
                            const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                            panel.position.set(x * this.cellSize, 2.98, z * this.cellSize);
                            chunkGroup.add(panel);
                            this.walls.push(panel);
                            this.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(x * this.cellSize, 2.8, z * this.cellSize),
                                flickerOffset: random() * 500,
                                material: activeMat,
                                isFaulty: true,
                                baseIntensity: 0.25,
                                targetIntensity: 0.25,
                                currentIntensity: 0.25
                            });
                        }
                    }
                }
            },
            {
                name: "THE CHASM",
                prob: 0.06,
                foundationMat: null,
                build: (x, z, localX, localZ, maze, inDir, outDir) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, inDir, outDir, this.sharedWallMat)) return;

                    const isBridgeZ = localX >= 6 && localX <= 8;
                    const isBridgeX = localZ >= 6 && localZ <= 8;
                    const needsBridgeZ = inDir === 0 || inDir === 2 || outDir === 0 || outDir === 2;
                    const needsBridgeX = inDir === 1 || inDir === 3 || outDir === 1 || outDir === 3;

                    let isBridge = false;
                    if (needsBridgeZ && isBridgeZ) isBridge = true;
                    if (needsBridgeX && isBridgeX) isBridge = true;

                    if (isBridge) {
                        const bFloor = buildWall(this.cellSize, this.cellSize, this.structMat, 0.5);
                        bFloor.position.set(x * this.cellSize, -0.25, z * this.cellSize);
                        addGeometry(bFloor);

                        if (!isBridgeX && (localX === 6 || localX === 8)) {
                            const railing = buildWall(0.2, this.cellSize, this.rustMat, 1.2);
                            railing.position.set(x * this.cellSize + (localX === 6 ? 1.8 : -1.8), 0.6, z * this.cellSize);
                            addGeometry(railing);
                        } else if (!isBridgeZ && (localZ === 6 || localZ === 8)) {
                            const railing = buildWall(this.cellSize, 0.2, this.rustMat, 1.2);
                            railing.position.set(x * this.cellSize, 0.6, z * this.cellSize + (localZ === 6 ? 1.8 : -1.8));
                            addGeometry(railing);
                        }
                    } else {
                        const voidBox = new THREE.Box3();
                        voidBox.min.set(x * this.cellSize - 2, -100, z * this.cellSize - 2);
                        voidBox.max.set(x * this.cellSize + 2, 3, z * this.cellSize + 2);
                        voidBox.isVoid = true;
                        voidBox.chunkHash = hash;
                        this.spatialGrid.insert(voidBox);

                        if ((localX === 2 || localX === 13) && localZ % 4 === 0) {
                            const pillar = buildWall(2.0, 2.0, this.rustMat, 40.0);
                            pillar.position.set(x * this.cellSize, -15.0, z * this.cellSize);
                            addGeometry(pillar);
                        }
                    }
                }
            },
            {
                name: "THE OVERGROWN ATRIUM",
                prob: 0.08,
                foundationMat: this.mossMat,
                build: (x, z, localX, localZ, maze, inDir, outDir) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, inDir, outDir, this.sharedWallMat)) return;
                    if (random() > 0.45) {
                        const w = 0.4 + (random() * 0.8);
                        const d = 0.4 + (random() * 0.8);
                        const trunk = buildWall(w, d, this.woodMat);
                        const offsetX = (random() - 0.5) * 2.0;
                        const offsetZ = (random() - 0.5) * 2.0;
                        trunk.position.set(x * this.cellSize + offsetX, 1.5, z * this.cellSize + offsetZ);
                        trunk.rotation.y = random() * Math.PI;
                        addGeometry(trunk);
                        if (random() > 0.20) {
                            const cHeight = 0.4 + random() * 0.4;
                            const canopyGeo = new THREE.BoxGeometry(this.cellSize * (1.2 + random()), cHeight, this.cellSize * (1.2 + random()));
                            const canopy = new THREE.Mesh(canopyGeo, this.fabricMat);
                            canopy.position.set(x * this.cellSize + offsetX, 3.0 - (cHeight / 2), z * this.cellSize + offsetZ);
                            canopy.rotation.y = random() * Math.PI;
                            canopy.castShadow = true;
                            chunkGroup.add(canopy);
                        }
                    }
                    if (random() > 0.90) {
                        const activeMat = this.baseBrokenLightMat.clone();
                        const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                        panel.position.set(x * this.cellSize, 0.05, z * this.cellSize);
                        chunkGroup.add(panel);
                        this.fixtureData.push({
                            chunkHash: hash,
                            position: new THREE.Vector3(x * this.cellSize, 0.5, z * this.cellSize),
                            flickerOffset: random() * 500,
                            material: activeMat,
                            isFaulty: true,
                            baseIntensity: 0.15,
                            targetIntensity: 0.15,
                            currentIntensity: 0.15
                        });
                    }
                }
            },
            {
                name: "THE CHECKPOINT",
                prob: 0.16,
                foundationMat: this.tileMat,
                build: (x, z, localX, localZ, maze, inDir, outDir) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, inDir, outDir, this.structMat)) return;

                    // Calculate a singular dynamic hallway based strictly on the in/out paths
                    const isPathN = (inDir === 0 || outDir === 0) && localX === 7 && localZ <= 7;
                    const isPathS = (inDir === 2 || outDir === 2) && localX === 7 && localZ >= 7;
                    const isPathW = (inDir === 3 || outDir === 3) && localZ === 7 && localX <= 7;
                    const isPathE = (inDir === 1 || outDir === 1) && localZ === 7 && localX >= 7;

                    const isPath = isPathN || isPathS || isPathW || isPathE;

                    // If not on the path, seal the grid in solid rock
                    if (!isPath) {
                        const block = buildWall(this.cellSize, this.cellSize, this.structMat);
                        block.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        block.userData.isEntityBlocker = true;
                        addGeometry(block);
                        return;
                    }

                    // Place exactly one dynamic bottleneck directly in the center of the traversal path
                    if (localX === 7 && localZ === 7) {
                        const spansX = (inDir === 1 || inDir === 3) && (outDir === 1 || outDir === 3);
                        const chokeType = Math.floor(random() * 4); // 0: Squeeze, 1: Crawl, 2: Crouch, 3: Door

                        const wallThick = 0.6;
                        const gapW = chokeType === 0 ? 0.35 : 1.4;
                        const sideW = (this.cellSize - gapW) / 2;
                        const sOff = (this.cellSize / 2) - (sideW / 2);

                        const p1 = buildWall(spansX ? sideW : wallThick, spansX ? wallThick : sideW, this.sharedWallMat);
                        p1.position.set(x * this.cellSize + (spansX ? -sOff : 0), 1.5, z * this.cellSize + (spansX ? 0 : -sOff));
                        p1.userData.isEntityBlocker = true;
                        addGeometry(p1);

                        const p2 = buildWall(spansX ? sideW : wallThick, spansX ? wallThick : sideW, this.sharedWallMat);
                        p2.position.set(x * this.cellSize + (spansX ? sOff : 0), 1.5, z * this.cellSize + (spansX ? 0 : sOff));
                        p2.userData.isEntityBlocker = true;
                        addGeometry(p2);

                        if (chokeType === 0) {
                            const top = buildWall(spansX ? gapW : wallThick, spansX ? wallThick : gapW, this.structMat, 0.5);
                            top.position.set(x * this.cellSize, 2.75, z * this.cellSize);
                            addGeometry(top);

                            const frame1 = new THREE.Mesh(new THREE.BoxGeometry(spansX ? 0.05 : wallThick + 0.02, 3.0, spansX ? wallThick + 0.02 : 0.05), this.woodMat);
                            frame1.position.set(x * this.cellSize + (spansX ? -gapW/2 - 0.025 : 0), 1.5, z * this.cellSize + (spansX ? 0 : -gapW/2 - 0.025));
                            addGeometry(frame1);

                            const frame2 = new THREE.Mesh(new THREE.BoxGeometry(spansX ? 0.05 : wallThick + 0.02, 3.0, spansX ? wallThick + 0.02 : 0.05), this.woodMat);
                            frame2.position.set(x * this.cellSize + (spansX ? gapW/2 + 0.025 : 0), 1.5, z * this.cellSize + (spansX ? 0 : gapW/2 + 0.025));
                            addGeometry(frame2);
                        } else if (chokeType === 1 || chokeType === 2) {
                            const gapH = chokeType === 1 ? 0.6 : 1.2;
                            const topH = 3.0 - gapH;

                            const top = buildWall(spansX ? gapW : wallThick, spansX ? wallThick : gapW, this.sharedWallMat, topH, gapH);
                            top.position.set(x * this.cellSize, gapH + (topH / 2), z * this.cellSize);
                            top.userData.isEntityBlocker = true;
                            addGeometry(top);

                            const frameTop = new THREE.Mesh(new THREE.BoxGeometry(spansX ? gapW : wallThick + 0.02, 0.05, spansX ? wallThick + 0.02 : gapW), this.woodMat);
                            frameTop.position.set(x * this.cellSize, gapH + 0.025, z * this.cellSize);
                            addGeometry(frameTop);

                            const blockBox = new THREE.Box3(
                                new THREE.Vector3(x * this.cellSize - (spansX ? gapW/2 : wallThick/2), 0, z * this.cellSize - (spansX ? wallThick/2 : gapW/2)),
                                new THREE.Vector3(x * this.cellSize + (spansX ? gapW/2 : wallThick/2), 3.0, z * this.cellSize + (spansX ? wallThick/2 : gapW/2))
                            );
                            blockBox.isEntityBlocker = true;
                            blockBox.isInvisibleBlocker = true;
                            blockBox.chunkHash = hash;
                            this.spatialGrid.insert(blockBox);
                        } else if (chokeType === 3) {
                            const top = buildWall(spansX ? gapW : wallThick, spansX ? wallThick : gapW, this.structMat, 0.35, 2.65);
                            top.position.set(x * this.cellSize, 2.825, z * this.cellSize);
                            addGeometry(top);

                            const jambL = new THREE.Mesh(new THREE.BoxGeometry(spansX ? 0.1 : wallThick+0.05, 2.65, spansX ? wallThick+0.05 : 0.1), this.woodMat);
                            jambL.position.set(x * this.cellSize + (spansX ? -0.75 : 0), 1.325, z * this.cellSize + (spansX ? 0 : -0.75));
                            addGeometry(jambL);

                            const jambR = new THREE.Mesh(new THREE.BoxGeometry(spansX ? 0.1 : wallThick+0.05, 2.65, spansX ? wallThick+0.05 : 0.1), this.woodMat);
                            jambR.position.set(x * this.cellSize + (spansX ? 0.75 : 0), 1.325, z * this.cellSize + (spansX ? 0 : 0.75));
                            addGeometry(jambR);

                            const jambT = new THREE.Mesh(new THREE.BoxGeometry(spansX ? 1.6 : wallThick+0.05, 0.1, spansX ? wallThick+0.05 : 1.6), this.woodMat);
                            jambT.position.set(x * this.cellSize, 2.70, z * this.cellSize);
                            addGeometry(jambT);

                            const doorW = 1.4;
                            const doorT = 0.1;
                            let doorGeo;
                            let doorMesh;

                            if (spansX) {
                                doorGeo = new THREE.BoxGeometry(doorW, 2.65, doorT);
                                doorGeo.translate(doorW/2, 0, doorT/2);
                                doorMesh = new THREE.Mesh(doorGeo, this.doorMat);
                                doorMesh.position.set(x * this.cellSize - doorW/2, 1.325, z * this.cellSize);
                                doorMesh.userData = { chunkHash: hash, closedRot: 0, currentRot: 0 };
                            } else {
                                doorGeo = new THREE.BoxGeometry(doorT, 2.65, doorW);
                                doorGeo.translate(doorT/2, 0, doorW/2);
                                doorMesh = new THREE.Mesh(doorGeo, this.doorMat);
                                doorMesh.position.set(x * this.cellSize, 1.325, z * this.cellSize - doorW/2);
                                doorMesh.userData = { chunkHash: hash, closedRot: -Math.PI / 2, currentRot: -Math.PI / 2 };
                            }

                            doorMesh.castShadow = doorMesh.receiveShadow = true;
                            chunkGroup.add(doorMesh);
                            this.interactiveDoors.push(doorMesh);
                            this.walls.push(doorMesh);
                            doorMesh.updateMatrixWorld();
                            const dBox = new THREE.Box3().setFromObject(doorMesh);
                            dBox.chunkHash = hash;
                            doorMesh.userData.box = dBox;
                            this.spatialGrid.insert(dBox);
                        }
                    } else {
                        if ((localX % 3 === 0 || localZ % 3 === 0) && random() > 0.5) {
                            const activeMat = this.baseLightMat.clone();
                            const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                            panel.position.set(x * this.cellSize, 2.98, z * this.cellSize);
                            chunkGroup.add(panel);
                            this.walls.push(panel);
                            this.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(x * this.cellSize, 2.8, z * this.cellSize),
                                flickerOffset: random() * 500,
                                material: activeMat,
                                isFaulty: random() > 0.8,
                                baseIntensity: 0.7,
                                targetIntensity: 0.7,
                                currentIntensity: 0.7
                            });
                        }
                    }
                }
            }
        ];
    }
}