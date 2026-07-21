// TheArchitect.js
// LEVEL 0 PROCEDURAL BLUEPRINT FACTORY

import Vec3 from './Vec3.js';
import AABB from './AABB.js';

export default class TheArchitect {
    static getStructuralMatrix(ctx) {
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
                    const top = new THREE.Mesh(this._boxGeo(gap, 0.3, this.cellSize), this.headerMat);
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
                prob: 0.78, build: (x, z) => {
                    const pW = 1.2, offset = (this.cellSize / 2) - (pW / 2), gap = this.cellSize - (pW * 2);
                    const p1 = buildWall(pW, this.cellSize, this.sharedWallMat);
                    p1.position.set(x * this.cellSize - offset, 1.5, z * this.cellSize);
                    addGeometry(p1);
                    const p2 = buildWall(pW, this.cellSize, this.sharedWallMat);
                    p2.position.set(x * this.cellSize + offset, 1.5, z * this.cellSize);
                    addGeometry(p2);
                    const top = new THREE.Mesh(this._boxGeo(gap, 0.3, this.cellSize), this.headerMat);
                    top.position.set(x * this.cellSize, 2.85, z * this.cellSize);
                    addGeometry(top);
                    const frameMat = this.woodMat;
                    const jambL = new THREE.Mesh(this._boxGeo(0.1, 2.65, 0.32), frameMat);
                    jambL.position.set(x * this.cellSize - 0.75, 1.325, z * this.cellSize + 1.85);
                    addGeometry(jambL);
                    const jambR = new THREE.Mesh(this._boxGeo(0.1, 2.65, 0.32), frameMat);
                    jambR.position.set(x * this.cellSize + 0.75, 1.325, z * this.cellSize + 1.85);
                    addGeometry(jambR);
                    const jambT = new THREE.Mesh(this._boxGeo(1.6, 0.1, 0.32), frameMat);
                    jambT.position.set(x * this.cellSize, 2.70, z * this.cellSize + 1.85);
                    addGeometry(jambT);
                    const doorGeo = this._cacheGeo('hingedDoor:X', () => {
                        const g = new THREE.BoxGeometry(1.4, 2.65, 0.1);
                        g.translate(0.7, 0, 0.05);
                        return g;
                    });
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
                    const top = new THREE.Mesh(this._boxGeo(gapW, 0.3, gapD), this.headerMat);
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
                            if (!this.cartonGeo) {
                                this.cartonGeo = new THREE.BoxGeometry(0.6, 0.5, 0.6);
                                this.geoCache.set(this.cartonGeo.uuid, true);
                            }
                            const stackN = 2 + (random() > 0.6 ? 1 : 0);
                            const byaw = random() * Math.PI;
                            const cartonPool = this.cartonMats || [this.fileBoxMat];
                            for (let ci = 0; ci < stackN; ci++) {
                                const carton = new THREE.Mesh(this.cartonGeo, cartonPool[Math.floor(random() * cartonPool.length)]);
                                carton.scale.set(1.2 - ci * 0.12, 1.1, 1.2 - ci * 0.12);
                                carton.position.set(
                                    x * this.cellSize + (random() - 0.5) * 0.12,
                                    0.275 + ci * 0.55,
                                    z * this.cellSize + (random() - 0.5) * 0.12
                                );
                                carton.rotation.y = byaw + (random() - 0.5) * 0.5;
                                carton.userData.isEntityBlocker = true;
                                addGeometry(carton);
                            }
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
                            const step = new THREE.Mesh(this._boxGeo(wX, h, wZ), this.structMat);
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
                        const holeW = 1.2;
                        const holeH = 0.7;
                        const topH = 3.0 - holeH;
                        const sideW = (this.cellSize - holeW) / 2;
                        const sideOffset = (this.cellSize / 2) - (sideW / 2);
                        const liningH = 0.05;
                        const sideH = holeH - (liningH * 2);
                        const sideOffsetLining = (holeW / 2) - (liningH / 2);
                        const isCorner = random() > 0.4;
                        if (isCorner) {
                            if (ctx.markOccupied) ctx.markOccupied(x, z);
                            const flipX = random() > 0.5 ? 1 : -1;
                            const flipZ = random() > 0.5 ? 1 : -1;
                            const outer = buildWall(sideW, sideW, this.sharedWallMat);
                            outer.position.set(x * this.cellSize - (flipX * (this.cellSize / 2 - sideW / 2)), 1.5, z * this.cellSize - (flipZ * (this.cellSize / 2 - sideW / 2)));
                            addGeometry(outer);
                            const full = buildWall(sideW, this.cellSize, this.sharedWallMat);
                            full.position.set(x * this.cellSize + (flipX * (this.cellSize / 2 - sideW / 2)), 1.5, z * this.cellSize);
                            addGeometry(full);
                            const innerW = this.cellSize - sideW;
                            const inner = buildWall(innerW, sideW, this.sharedWallMat);
                            inner.position.set(x * this.cellSize - (flipX * (this.cellSize / 2 - innerW / 2)), 1.5, z * this.cellSize + (flipZ * (this.cellSize / 2 - sideW / 2)));
                            addGeometry(inner);
                            const roof1 = buildWall(holeW, innerW, this.sharedWallMat, topH, holeH);
                            roof1.position.set(x * this.cellSize, holeH + topH / 2, z * this.cellSize - (flipZ * (this.cellSize / 2 - innerW / 2)));
                            addGeometry(roof1);
                            const roof2 = buildWall(sideW, holeW, this.sharedWallMat, topH, holeH);
                            roof2.position.set(x * this.cellSize - (flipX * (this.cellSize / 2 - sideW / 2)), holeH + topH / 2, z * this.cellSize);
                            addGeometry(roof2);
                            const floor1 = buildWall(holeW, innerW, this.ventMat, liningH);
                            floor1.position.set(x * this.cellSize, liningH / 2, z * this.cellSize - (flipZ * (this.cellSize / 2 - innerW / 2)));
                            addGeometry(floor1);
                            const floor2 = buildWall(sideW, holeW, this.ventMat, liningH);
                            floor2.position.set(x * this.cellSize - (flipX * (this.cellSize / 2 - sideW / 2)), liningH / 2, z * this.cellSize);
                            addGeometry(floor2);
                            const ceil1 = buildWall(holeW, innerW, this.ventMat, liningH);
                            ceil1.position.set(x * this.cellSize, holeH - liningH / 2, z * this.cellSize - (flipZ * (this.cellSize / 2 - innerW / 2)));
                            addGeometry(ceil1);
                            const ceil2 = buildWall(sideW, holeW, this.ventMat, liningH);
                            ceil2.position.set(x * this.cellSize - (flipX * (this.cellSize / 2 - sideW / 2)), holeH - liningH / 2, z * this.cellSize);
                            addGeometry(ceil2);
                            const lOuterX = buildWall(liningH, sideW, this.ventMat, sideH);
                            lOuterX.position.set(x * this.cellSize - (flipX * (holeW / 2 - liningH / 2)), holeH / 2, z * this.cellSize - (flipZ * (this.cellSize / 2 - sideW / 2)));
                            addGeometry(lOuterX);
                            const lOuterZ = buildWall(sideW, liningH, this.ventMat, sideH);
                            lOuterZ.position.set(x * this.cellSize - (flipX * (this.cellSize / 2 - sideW / 2)), holeH / 2, z * this.cellSize - (flipZ * (holeW / 2 - liningH / 2)));
                            addGeometry(lOuterZ);
                            const lInnerX = buildWall(liningH, innerW, this.ventMat, sideH);
                            lInnerX.position.set(x * this.cellSize + (flipX * (holeW / 2 - liningH / 2)), holeH / 2, z * this.cellSize - (flipZ * (this.cellSize / 2 - innerW / 2)));
                            addGeometry(lInnerX);
                            const lInnerZ = buildWall(innerW, liningH, this.ventMat, sideH);
                            lInnerZ.position.set(x * this.cellSize - (flipX * (this.cellSize / 2 - innerW / 2)), holeH / 2, z * this.cellSize + (flipZ * (holeW / 2 - liningH / 2)));
                            addGeometry(lInnerZ);
                            const blockBox = new AABB(
                                new Vec3(x * this.cellSize - this.cellSize / 2, 0, z * this.cellSize - this.cellSize / 2),
                                new Vec3(x * this.cellSize + this.cellSize / 2, 3.0, z * this.cellSize + this.cellSize / 2)
                            );
                            blockBox.isEntityBlocker = true;
                            blockBox.isInvisibleBlocker = true;
                            blockBox.chunkHash = hash;
                            this.spatialGrid.insert(blockBox);
                            const grateOffset = (this.cellSize / 2) - 0.025;
                            ctx.addGrate(x * this.cellSize, 0.35, z * this.cellSize - (flipZ * grateOffset), false);
                            ctx.addGrate(x * this.cellSize - (flipX * grateOffset), 0.35, z * this.cellSize, true);
                        } else {
                            const rawBurst = Math.floor(random() * 3) + 1;
                            const modX = ((x % this.chunkSize) + this.chunkSize) % this.chunkSize;
                            const modZ = ((z % this.chunkSize) + this.chunkSize) % this.chunkSize;
                            const burstLength = Math.min(rawBurst, tunnelOnZ ? this.chunkSize - modZ : this.chunkSize - modX);
                            for (let i = 0; i < burstLength; i++) {
                                const segX = x + (tunnelOnZ ? 0 : i);
                                const segZ = z + (tunnelOnZ ? i : 0);
                                if (ctx.markOccupied) ctx.markOccupied(segX, segZ);
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
                                const blockBox = new AABB(
                                    new Vec3(segX * this.cellSize - (tunnelOnZ ? holeW / 2 : this.cellSize / 2), 0, segZ * this.cellSize - (tunnelOnZ ? this.cellSize / 2 : holeW / 2)),
                                    new Vec3(segX * this.cellSize + (tunnelOnZ ? holeW / 2 : this.cellSize / 2), 3.0, segZ * this.cellSize + (tunnelOnZ ? this.cellSize / 2 : holeW / 2))
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
                        }
                    } else {
                        const wall = new THREE.Mesh(this.sharedWallGeo, this.sharedWallMat);
                        wall.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        addGeometry(wall);
                        const ventGeo = this._boxGeo(1.2, 0.6, 0.05);
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
                prob: 0.10, build: (x, z) => {
                    const typeRoll = random();
                    const dirZ = random() > 0.5;
                    const rawBurst = Math.floor(random() * 4) + 1;
                    const modX = ((x % this.chunkSize) + this.chunkSize) % this.chunkSize;
                    const modZ = ((z % this.chunkSize) + this.chunkSize) % this.chunkSize;
                    const burstLength = Math.min(rawBurst, dirZ ? this.chunkSize - modZ : this.chunkSize - modX);
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
                            if (ctx.markOccupied) ctx.markOccupied(segX, segZ);
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
                            const blockBox = new AABB(
                                new Vec3(segX * this.cellSize - (dirZ ? tunnelW / 2 : this.cellSize / 2), 0, segZ * this.cellSize - (dirZ ? this.cellSize / 2 : tunnelW / 2)),
                                new Vec3(segX * this.cellSize + (dirZ ? tunnelW / 2 : this.cellSize / 2), 3.0, segZ * this.cellSize + (dirZ ? this.cellSize / 2 : tunnelW / 2))
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
                            if (ctx.markOccupied) ctx.markOccupied(segX, segZ);
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
                            if (ctx.markOccupied) ctx.markOccupied(segX, segZ);
                            const side1 = buildWall(dirZ ? sideW : this.cellSize, dirZ ? this.cellSize : sideW, this.sharedWallMat);
                            side1.position.set(segX * this.cellSize + (dirZ ? -sideOffset : 0), 1.5, segZ * this.cellSize + (dirZ ? 0 : -sideOffset));
                            addGeometry(side1);
                            const side2 = buildWall(dirZ ? sideW : this.cellSize, dirZ ? this.cellSize : sideW, this.sharedWallMat);
                            side2.position.set(segX * this.cellSize + (dirZ ? sideOffset : 0), 1.5, segZ * this.cellSize + (dirZ ? 0 : sideOffset));
                            addGeometry(side2);
                            const roof = buildWall(dirZ ? roofW : this.cellSize, dirZ ? this.cellSize : roofW, this.sharedWallMat, roofH, 1.2);
                            roof.position.set(segX * this.cellSize, 1.2 + (roofH / 2), segZ * this.cellSize);
                            addGeometry(roof);
                            const blockBox = new AABB(
                                new Vec3(segX * this.cellSize - (dirZ ? roofW / 2 : this.cellSize / 2), 0, segZ * this.cellSize - (dirZ ? this.cellSize / 2 : roofW / 2)),
                                new Vec3(segX * this.cellSize + (dirZ ? roofW / 2 : this.cellSize / 2), 3.0, segZ * this.cellSize + (dirZ ? this.cellSize / 2 : roofW / 2))
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
                prob: 0.035, build: (x, z) => {
                    if (random() > 0.92 && ctx.addObserver) {
                        ctx.addObserver(x * this.cellSize, z * this.cellSize);
                        if (ctx.markOccupied) ctx.markOccupied(x, z);
                    } else {
                        const wall = buildWall(this.cellSize, this.cellSize, this.sharedWallMat);
                        wall.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        wall.userData.isEntityBlocker = true;
                        addGeometry(wall);
                    }
                }
            },
            {
                name: "THE COMPRESSION ARCHWAY",
                prob: 0.03, build: (x, z) => {
                    const cx = x * this.cellSize;
                    const cz = z * this.cellSize;
                    if (ctx.markOccupied) ctx.markOccupied(x, z);
                    const isAlignedZ = random() > 0.5;
                    const pillarThickness = 0.8;
                    const overheadHeight = 1.0;
                    const verticalClearance = 3.0 - overheadHeight;
                    const supportLeft = buildWall(isAlignedZ ? pillarThickness : this.cellSize, isAlignedZ ? this.cellSize : pillarThickness, this.sharedWallMat, verticalClearance, 0);
                    supportLeft.position.set(cx + (isAlignedZ ? -1.6 : 0), verticalClearance / 2, cz + (isAlignedZ ? 0 : -1.6));
                    supportLeft.userData.isEntityBlocker = true;
                    addGeometry(supportLeft);
                    const supportRight = buildWall(isAlignedZ ? pillarThickness : this.cellSize, isAlignedZ ? this.cellSize : pillarThickness, this.sharedWallMat, verticalClearance, 0);
                    supportRight.position.set(cx + (isAlignedZ ? 1.6 : 0), verticalClearance / 2, cz + (isAlignedZ ? 0 : 1.6));
                    supportRight.userData.isEntityBlocker = true;
                    addGeometry(supportRight);
                    const overheadBeam = buildWall(this.cellSize, this.cellSize, this.headerMat, overheadHeight, verticalClearance);
                    overheadBeam.position.set(cx, verticalClearance + (overheadHeight / 2), cz);
                    overheadBeam.userData.isEntityBlocker = true;
                    addGeometry(overheadBeam);
                }
            },
            {
                name: "THE SETTLING FIELD",
                prob: 0.028, build: (x, z) => {
                    if (ctx.markOccupied) ctx.markOccupied(x, z);
                    const cx = x * this.cellSize;
                    const cz = z * this.cellSize;
                    const dA = random();
                    const dB = random();
                    let lSeed = ((dA * 4294967296) ^ (dB * 65536)) >>> 0;
                    const lRand = () => {
                        lSeed = (lSeed * 1664525 + 1013904223) >>> 0;
                        return lSeed / 4294967296.0;
                    };
                    if (!this.fallenTileGeo) {
                        this.fallenTileGeo = new THREE.BoxGeometry(0.9, 0.04, 0.9);
                        this.geoCache.set(this.fallenTileGeo.uuid, true);
                    }
                    if (!this.rottedTileMat) {
                        this.rottedTileMat = this.ceilMat.clone();
                        this.rottedTileMat.color.setHex(0x93856b);
                        this.rottedTileMat.roughness = 0.95;
                        this.sharedAssets.add(this.rottedTileMat.uuid);
                    }
                    if (!this.ceilingHoleMat) {
                        this.ceilingHoleMat = new THREE.MeshBasicMaterial({color: 0x060504});
                        this.sharedAssets.add(this.ceilingHoleMat.uuid);
                    }
                    const tileCount = 2 + Math.floor(lRand() * 3);
                    for (let i = 0; i < tileCount; i++) {
                        const tile = new THREE.Mesh(this.fallenTileGeo, this.rottedTileMat);
                        tile.position.set(cx + (lRand() - 0.5) * 2.6, 0.03 + lRand() * 0.09, cz + (lRand() - 0.5) * 2.6);
                        tile.rotation.set((lRand() - 0.5) * 0.3, lRand() * Math.PI, (lRand() - 0.5) * 0.3);
                        addGeometry(tile);
                    }
                    const hole = buildWall(1.6, 1.6, this.ceilingHoleMat, 0.02);
                    hole.position.set(cx, 2.975, cz);
                    addGeometry(hole);
                    if (!this.hingedTileGeo) {
                        this.hingedTileGeo = new THREE.BoxGeometry(0.9, 0.04, 0.9);
                        this.hingedTileGeo.translate(0, 0, 0.45);
                        this.geoCache.set(this.hingedTileGeo.uuid, true);
                    }
                    const dangleCount = 1 + Math.floor(lRand() * 3);
                    for (let i = 0; i < dangleCount; i++) {
                        const side = Math.floor(lRand() * 4);
                        const along = (lRand() - 0.5) * 1.0;
                        const dangle = new THREE.Mesh(this.hingedTileGeo, this.rottedTileMat);
                        const dxr = (side === 0 ? -0.85 : (side === 1 ? 0.85 : along));
                        const dzr = (side === 2 ? -0.85 : (side === 3 ? 0.85 : along));
                        dangle.position.set(cx + dxr, 2.955, cz + dzr);
                        dangle.rotation.order = 'YXZ';
                        dangle.rotation.y = (side === 0 ? Math.PI / 2 : (side === 1 ? -Math.PI / 2 : (side === 3 ? Math.PI : 0)));
                        dangle.rotation.x = 1.0 + lRand() * 0.45;
                        dangle.rotation.z = (lRand() - 0.5) * 0.12;
                        dangle.userData.chunkHash = hash;
                        dangle.updateMatrixWorld(true);
                        stagingMeshes.push(dangle);
                    }
                    const paperCount = 2 + Math.floor(lRand() * 3);
                    for (let i = 0; i < paperCount; i++) {
                        const sheet = new THREE.Mesh(this.documentGeo, this.documentMat);
                        sheet.position.set(cx + (lRand() - 0.5) * 3.2, 0.015, cz + (lRand() - 0.5) * 3.2);
                        sheet.rotation.y = lRand() * Math.PI * 2;
                        addGeometry(sheet);
                    }
                    const stain = new THREE.Mesh(this.ceilingStainGeo, this.ceilingStainMat);
                    stain.position.set(cx, 2.99, cz);
                    stain.rotation.y = lRand() * Math.PI * 2;
                    const stScale = 0.8 + lRand() * 0.6;
                    stain.scale.set(stScale, stScale, stScale);
                    addGeometry(stain);
                    if (dA > 0.6) {
                        const felled = buildChair(cx + (lRand() - 0.5) * 1.6, 0, cz + (lRand() - 0.5) * 1.6, lRand() * Math.PI * 2);
                        felled.rotation.z = (lRand() > 0.5 ? 1 : -1) * Math.PI / 2;
                        felled.position.y = 0.38;
                        addFurniture(felled);
                    }
                }
            },
            {
                prob: 0.032, build: (x, z) => {
                    const cx = x * this.cellSize;
                    const cz = z * this.cellSize;
                    if (!this._globalSwitches) this._globalSwitches = [];
                    let tooClose = false;
                    for (let i = 0; i < this._globalSwitches.length; i++) {
                        const s = this._globalSwitches[i];
                        const distSq = (cx - s.x) * (cx - s.x) + (cz - s.z) * (cz - s.z);
                        // breakers repel breakers at 60u; POIs only need 30u clearance
                        const limit = s.poi ? 900.0 : 3600.0;
                        if (distSq > 0.1 && distSq < limit) {
                            tooClose = true;
                            break;
                        }
                    }
                    if (ctx.playerPos) {
                        const dxPlayer = cx - ctx.playerPos.x;
                        const dzPlayer = cz - ctx.playerPos.z;
                        if (dxPlayer * dxPlayer + dzPlayer * dzPlayer < 1600.0) {
                            tooClose = true;
                        }
                    }
                    if (tooClose) {
                        const wall = buildWall(this.cellSize, this.cellSize, this.sharedWallMat);
                        wall.position.set(cx, 1.5, cz);
                        wall.userData.isEntityBlocker = true;
                        addGeometry(wall);
                        return;
                    }
                    const isHallucination = (this.player && this.player.paranoia > 0.8) && (random() > 0.5);
                    if (!isHallucination && !this._globalSwitches.some(s => Math.abs(s.x - cx) < 0.1 && Math.abs(s.z - cz) < 0.1)) {
                        this._globalSwitches.push({x: cx, z: cz, poi: false});
                    }
                    if (ctx.markOccupied) ctx.markOccupied(x, z);
                    const pillar = buildWall(1.5, 1.5, this.metalMat);
                    pillar.position.set(cx, 1.5, cz);
                    pillar.userData.isEntityBlocker = !isHallucination;
                    addGeometry(pillar);
                    const bBox = new THREE.Mesh(this._boxGeo(0.8, 1.2, 0.2), this.rustMat);
                    const isZ = random() > 0.5;
                    const sign = random() > 0.5 ? 1 : -1;
                    if (isZ) {
                        bBox.position.set(cx, 1.5, cz + (sign * 0.85));
                    } else {
                        bBox.rotation.y = Math.PI / 2;
                        bBox.position.set(cx + (sign * 0.85), 1.5, cz);
                    }
                    bBox.userData = {type: isHallucination ? 'grate' : 'exit_switch', chunkHash: hash, active: false};
                    chunkGroup.add(bBox);
                    if (!this.interactables) this.interactables = [];
                    this.interactables.push(bBox);
                    const lightMesh = new THREE.Mesh(this._boxGeo(0.2, 0.2, 0.25), this.hazardMat);
                    lightMesh.position.set(0, 0.3, 0);
                    if (isHallucination) {
                        lightMesh.material = new THREE.MeshBasicMaterial({color: 0xffaa00});
                    }
                    bBox.add(lightMesh);
                }
            },
            {
                // NOTE: this prob must never tie another entry's — the cell picker
                // is find() over a descending sort, and a tied threshold makes the
                // later entry unreachable. This blueprint was dead code at 0.028
                // (tied with the dangle-tile entry) until v0.4.11.
                prob: 0.0235, build: (x, z) => {
                    const cx = x * this.cellSize;
                    const cz = z * this.cellSize;
                    if (!this._globalSwitches) this._globalSwitches = [];
                    if (!this.pointsOfInterest) this.pointsOfInterest = [];
                    let tooClose = false;
                    for (let i = 0; i < this._globalSwitches.length; i++) {
                        const s = this._globalSwitches[i];
                        const distSq = (cx - s.x) * (cx - s.x) + (cz - s.z) * (cz - s.z);
                        // POIs pack denser than breakers: 40u from each other, 30u from switches
                        const limit = s.poi ? 1600.0 : 900.0;
                        if (distSq > 0.1 && distSq < limit) {
                            tooClose = true;
                            break;
                        }
                    }
                    if (ctx.playerPos) {
                        const dxPlayer = cx - ctx.playerPos.x;
                        const dzPlayer = cz - ctx.playerPos.z;
                        if (dxPlayer * dxPlayer + dzPlayer * dzPlayer < 900.0) {
                            tooClose = true;
                        }
                    }
                    if (tooClose) {
                        const wall = buildWall(this.cellSize, this.cellSize, this.sharedWallMat);
                        wall.position.set(cx, 1.5, cz);
                        wall.userData.isEntityBlocker = true;
                        addGeometry(wall);
                        return;
                    }
                    this._globalSwitches.push({x: cx, z: cz, poi: true});
                    if (ctx.markOccupied) ctx.markOccupied(x, z);
                    const flavor = Math.floor(random() * 6);
                    if (flavor === 0) {
                        if (!this.fallenTileGeo) {
                            this.fallenTileGeo = new THREE.BoxGeometry(0.9, 0.04, 0.9);
                            this.geoCache.set(this.fallenTileGeo.uuid, true);
                        }
                        if (!this.rottedTileMat) {
                            this.rottedTileMat = this.ceilMat.clone();
                            this.rottedTileMat.color.setHex(0x93856b);
                            this.rottedTileMat.roughness = 0.95;
                            this.sharedAssets.add(this.rottedTileMat.uuid);
                        }
                        if (!this.ceilingHoleMat) {
                            this.ceilingHoleMat = new THREE.MeshBasicMaterial({color: 0x060504});
                            this.sharedAssets.add(this.ceilingHoleMat.uuid);
                        }
                        const tileCount = 4 + Math.floor(random() * 4);
                        for (let i = 0; i < tileCount; i++) {
                            const tile = new THREE.Mesh(this.fallenTileGeo, this.rottedTileMat);
                            tile.position.set(cx + (random() - 0.5) * 2.6, 0.03 + random() * 0.09, cz + (random() - 0.5) * 2.6);
                            tile.rotation.set((random() - 0.5) * 0.3, random() * Math.PI, (random() - 0.5) * 0.3);
                            addGeometry(tile);
                        }
                        const hole = buildWall(2.2, 2.2, this.ceilingHoleMat, 0.02);
                        hole.position.set(cx, 2.975, cz);
                        addGeometry(hole);
                    } else if (flavor === 1) {
                        const pieces = 2 + Math.floor(random() * 2);
                        for (let i = 0; i < pieces; i++) {
                            const felled = buildChair(cx + (random() - 0.5) * 1.8, 0, cz + (random() - 0.5) * 1.8, random() * Math.PI * 2);
                            felled.rotation.z = (random() > 0.5 ? 1 : -1) * Math.PI / 2;
                            felled.position.y = 0.38;
                            addFurniture(felled);
                        }
                        const table = buildTable(cx, 0, cz);
                        table.rotation.x = Math.PI / 2;
                        table.position.y = 0.5;
                        addFurniture(table);
                    } else if (flavor === 2) {
                        if (!this.anomalyPanelMat) {
                            this.anomalyPanelMat = new THREE.MeshStandardMaterial({
                                color: 0x2a1f33, emissive: 0x4422aa, emissiveIntensity: 0.35, roughness: 0.4
                            });
                            this.sharedAssets.add(this.anomalyPanelMat.uuid);
                        }
                        const panel = new THREE.Mesh(this._boxGeo(1.6, 2.6, 0.12), this.anomalyPanelMat);
                        panel.position.set(cx, 1.4, cz);
                        panel.rotation.y = (random() - 0.5) * 0.6;
                        panel.rotation.z = (random() - 0.5) * 0.15;
                        panel.scale.set(1.0, 1.0 + random() * 0.3, 1.0);
                        addGeometry(panel);
                    } else if (flavor === 3) {
                        // The Inverted Dinette: a table set for dinner, bolted to the ceiling.
                        const table = buildTable(cx, 0, cz);
                        table.rotation.x = Math.PI;
                        table.position.y = 2.95;
                        addFurniture(table);
                        for (let s = -1; s <= 1; s += 2) {
                            const chair = buildChair(cx + s * 0.95, 0, cz + (random() - 0.5) * 0.4, s > 0 ? -Math.PI / 2 : Math.PI / 2);
                            chair.rotation.x = Math.PI;
                            chair.position.y = 2.95;
                            addFurniture(chair);
                        }
                    } else if (flavor === 4) {
                        // The Sunken Fixture: a working light panel embedded in the floor,
                        // glowing upward, wired into the LumenGrid like any honest ceiling light.
                        const activeMat = ctx.getLightMaterial(0xfff2cc, 0xffe9b0, false);
                        const panel = new THREE.Mesh(this.sharedPanelGeo,
                            [this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat, this.baseHousingMat]);
                        panel.position.set(cx, 0.055, cz);
                        panel.rotation.y = random() > 0.5 ? Math.PI / 2 : 0;
                        chunkGroup.add(panel);
                        this.walls.push(panel);
                        this.fixtureData.push({
                            chunkHash: hash,
                            position: new THREE.Vector3(cx, 0.4, cz),
                            flickerOffset: random() * 10.0,
                            material: activeMat,
                            isFaulty: random() > 0.6,
                            baseIntensity: 0.85,
                            targetIntensity: 0.85,
                            currentIntensity: 0.85
                        });
                    } else {
                        // The Congregation: chairs in a perfect ring, all facing inward at nothing.
                        const seats = 5 + Math.floor(random() * 3);
                        const ringR = 1.25 + random() * 0.3;
                        for (let s = 0; s < seats; s++) {
                            const ang = (s / seats) * Math.PI * 2;
                            const chair = buildChair(
                                cx + Math.cos(ang) * ringR, 0, cz + Math.sin(ang) * ringR,
                                -(ang + Math.PI / 2)
                            );
                            addFurniture(chair);
                        }
                    }
                    this.pointsOfInterest.push({x: cx, z: cz, active: false, chunkHash: hash});
                }
            },
            {
                prob: 0.0215, build: (x, z) => {
                    const cx = x * this.cellSize;
                    const cz = z * this.cellSize;
                    for (let i = 0; i < 3; i++) {
                        const t = buildTable(cx + (random() * 0.4 - 0.2), i * 0.8, cz + (random() * 0.4 - 0.2));
                        t.rotation.set(random() * 0.2, random() * Math.PI, random() * 0.2);
                        addFurniture(t);
                    }
                    for (let i = 0; i < 6; i++) {
                        const c = buildChair(cx + (random() * 1.2 - 0.6), i * 0.4, cz + (random() * 1.2 - 0.6), random() * Math.PI * 2);
                        c.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
                        addFurniture(c);
                    }
                    const batGroup = new THREE.Group();
                    const batMesh = this.batteryPrefab.clone();
                    batGroup.add(batMesh);
                    const bGlow = new THREE.Mesh(this.glowGeo, this.glowMat);
                    bGlow.scale.set(0.20, 0.20, 0.20);
                    bGlow.position.y = 0.01;
                    batGroup.add(bGlow);
                    batGroup.position.set(cx, 0.1, cz);
                    batGroup.rotation.y = random() * Math.PI;
                    batGroup.userData = {type: 'battery', chunkHash: hash, active: true};
                    chunkGroup.add(batGroup);
                    if (!this.interactables) this.interactables = [];
                    this.interactables.push(batGroup);
                }
            },
            {
                prob: 0.01, build: (x, z) => {
                    const cx = x * this.cellSize;
                    const cz = z * this.cellSize;
                    if (ctx.markOccupied) ctx.markOccupied(x, z);
                    const dir = Math.floor(random() * 4);
                    const thick = 0.4;
                    const off = (this.cellSize / 2) - (thick / 2);
                    for (let i = 0; i < 4; i++) {
                        const isZ = (i === 0 || i === 2);
                        const sign = (i === 1 || i === 2) ? 1 : -1;
                        if (i === dir) {
                            const pW = 1.2;
                            const pOff = (this.cellSize / 2) - (pW / 2);
                            const gap = this.cellSize - (pW * 2);
                            const p1 = buildWall(isZ ? pW : thick, isZ ? thick : pW, this.sharedWallMat);
                            p1.position.set(cx + (isZ ? -pOff : sign * off), 1.5, cz + (isZ ? sign * off : -pOff));
                            addGeometry(p1);
                            const p2 = buildWall(isZ ? pW : thick, isZ ? thick : pW, this.sharedWallMat);
                            p2.position.set(cx + (isZ ? pOff : sign * off), 1.5, cz + (isZ ? sign * off : pOff));
                            addGeometry(p2);
                            const head = buildWall(isZ ? gap : thick, isZ ? thick : gap, this.sharedWallMat, 0.4, 2.6);
                            head.position.set(cx + (isZ ? 0 : sign * off), 2.8, cz + (isZ ? sign * off : 0));
                            addGeometry(head);
                        } else {
                            const w = buildWall(isZ ? this.cellSize : thick, isZ ? thick : this.cellSize, this.sharedWallMat);
                            w.position.set(cx + (isZ ? 0 : sign * off), 1.5, cz + (isZ ? sign * off : 0));
                            addGeometry(w);
                        }
                    }
                    const blockBox = new AABB(
                        new Vec3(cx - this.cellSize / 2, 0, cz - this.cellSize / 2),
                        new Vec3(cx + this.cellSize / 2, 3.0, cz + this.cellSize / 2)
                    );
                    blockBox.isEntityBlocker = true;
                    blockBox.isInvisibleBlocker = true;
                    blockBox.chunkHash = hash;
                    this.spatialGrid.insert(blockBox);
                    const floor = new THREE.Mesh(this._planeGeo(this.cellSize - thick, this.cellSize - thick), this.tileMat);
                    floor.rotation.x = -Math.PI / 2;
                    floor.position.set(cx, 0.02, cz);
                    addGeometry(floor);
                    const roof = buildWall(this.cellSize, this.cellSize, this.structMat, 0.2);
                    roof.position.set(cx, 2.9, cz);
                    addGeometry(roof);
                    const cotX = (dir === 1) ? -0.8 : (dir === 3 ? 0.8 : 0);
                    const cotZ = (dir === 0) ? 0.8 : (dir === 2 ? -0.8 : 0);
                    const cotRot = (dir === 0 || dir === 2) ? Math.PI / 2 : 0;
                    const cotFrame = new THREE.Mesh(this._boxGeo(1.0, 0.5, 2.0), this.structMat);
                    cotFrame.position.set(cx + cotX, 0.25, cz + cotZ);
                    cotFrame.rotation.y = cotRot;
                    addGeometry(cotFrame);
                    const almondGroup = new THREE.Group();
                    const almondMesh = this.almondPrefab.clone();
                    almondGroup.add(almondMesh);
                    const aGlow = new THREE.Mesh(this.glowGeo, this.glowMat);
                    aGlow.scale.set(0.15, 0.15, 0.15);
                    aGlow.position.y = 0.01;
                    almondGroup.add(aGlow);
                    almondGroup.position.set(cx + cotX, 0.5, cz + cotZ);
                    almondGroup.rotation.y = random() * Math.PI;
                    almondGroup.userData = {type: 'almond', chunkHash: hash, active: true};
                    chunkGroup.add(almondGroup);
                    if (!this.interactables) this.interactables = [];
                    this.interactables.push(almondGroup);
                    const activeMat = ctx.getLightMaterial(0xe8f4f8, 0xb0d8e8, false);
                    const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                    panel.position.set(cx, 2.75, cz);
                    chunkGroup.add(panel);
                    this.walls.push(panel);
                    this.fixtureData.push({
                        chunkHash: hash,
                        position: new THREE.Vector3(cx, 2.5, cz),
                        flickerOffset: 0,
                        material: activeMat,
                        isFaulty: false,
                        baseIntensity: 0.9,
                        targetIntensity: 0.9,
                        currentIntensity: 0.9
                    });
                }
            },
            {
                prob: 0.00, build: (x, z) => {
                    if (ctx.claimOasis && ctx.claimOasis()) {
                        const cx = x * this.cellSize;
                        const cz = z * this.cellSize;
                        const half = this.cellSize / 2;
                        const floorGeo = this._planeGeo(this.cellSize, this.cellSize);
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
                        const activeMat = ctx.getLightMaterial(0xffeedd, 0xffaa55, false);
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
                id: "EXIT",
                foundationMat: this.tileMat,
                ceilingMat: this.structMat,
                build: (x, z, localX, localZ, maze, inDir, outDir) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, inDir, outDir, this.structMat, "EXIT")) return;
                    const isPathX = localZ === 7;
                    const isPathZ = localX === 7;
                    if (localX >= 5 && localX <= 9 && localZ >= 5 && localZ <= 9) {
                        if (localX === 5 || localX === 9 || localZ === 5 || localZ === 9) {
                            if ((localX === 7 && isPathZ) || (localZ === 7 && isPathX)) {
                            } else {
                                const wall = buildWall(this.cellSize, this.cellSize, this.metalMat);
                                wall.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                                wall.userData.isEntityBlocker = true;
                                addGeometry(wall);
                            }
                        } else if (localX === 7 && localZ === 7) {
                            const elevator = new THREE.Mesh(this._boxGeo(this.cellSize * 0.8, 3.0, this.cellSize * 0.8), this.rustMat);
                            elevator.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                            elevator.userData = {type: 'exit', chunkHash: hash, active: true};
                            chunkGroup.add(elevator);
                            if (!this.interactables) this.interactables = [];
                            this.interactables.push(elevator);
                            const pad = new THREE.Mesh(this._boxGeo(this.cellSize * 0.85, 0.8, this.cellSize * 0.85), this.metalMat);
                            pad.position.set(0, -0.2, 0);
                            elevator.add(pad);
                            const light = new THREE.Mesh(this._boxGeo(this.cellSize * 0.9, 0.4, this.cellSize * 0.9), this.hazardMat);
                            light.material = new THREE.MeshBasicMaterial({color: 0x55ff55});
                            pad.add(light);
                            const eBox = new THREE.Box3().setFromObject(elevator);
                            eBox.chunkHash = hash;
                            eBox.isEntityBlocker = true;
                            this.spatialGrid.insert(eBox);
                        }
                    } else if (isPathX || isPathZ) {
                    } else {
                        const block = buildWall(this.cellSize, this.cellSize, this.structMat);
                        block.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        block.userData.isEntityBlocker = true;
                        addGeometry(block);
                    }
                }
            },
            {
                id: "IMPOUND",
                foundationMat: this.structMat,
                ceilingMat: this.impoundCeilingMat || this.clinicMat,
                build: (x, z, localX, localZ, maze, inDir, outDir) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, inDir, outDir, this.impoundWallMat || this.sharedWallMat, "IMPOUND")) return;
                    const px = x * this.cellSize, pz = z * this.cellSize;
                    const isWall = maze && maze[localX][localZ];
                    if (isWall) {
                        if (!this.fenceGeoX) {
                            this.fenceGeoX = new THREE.BoxGeometry(this.cellSize, 3.0, 0.05);
                            this.geoCache.set(this.fenceGeoX.uuid, true);
                            this.fenceGeoZ = new THREE.BoxGeometry(0.05, 3.0, this.cellSize);
                            this.geoCache.set(this.fenceGeoZ.uuid, true);
                        }
                        const cPillar = new THREE.Mesh(this.vPipeGeo, this.rustMat);
                        cPillar.position.set(px + (this.cellSize / 2), 1.5, pz + (this.cellSize / 2));
                        addGeometry(cPillar);
                        const buildFenceRun = (alongX) => {
                            const fx = px + (alongX ? 0 : this.cellSize / 2);
                            const fz = pz + (alongX ? this.cellSize / 2 : 0);
                            if (random() > 0.85) {
                                for (let s = -1; s <= 1; s += 2) {
                                    const stub = new THREE.Mesh(this._boxGeo(alongX ? 1.3 : 0.05, 3.0, alongX ? 0.05 : 1.3), this.waterMat);
                                    stub.position.set(fx + (alongX ? s * 1.35 : 0), 1.5, fz + (alongX ? 0 : s * 1.35));
                                    addGeometry(stub);
                                    const gatePost = new THREE.Mesh(this.vPipeGeo, this.metalMat);
                                    gatePost.scale.set(0.7, 0.75, 0.7);
                                    gatePost.position.set(fx + (alongX ? s * 0.7 : 0), 1.12, fz + (alongX ? 0 : s * 0.7));
                                    addGeometry(gatePost);
                                }
                                const gateGeo = this._cacheGeo(`impGate:${alongX ? 'X' : 'Z'}`, () => {
                                    const g = new THREE.BoxGeometry(alongX ? 1.4 : 0.05, 2.2, alongX ? 0.05 : 1.4);
                                    g.translate(alongX ? 0.7 : 0, 0, alongX ? 0 : 0.7);
                                    return g;
                                });
                                const gate = new THREE.Mesh(gateGeo, this.waterMat);
                                gate.position.set(fx - (alongX ? 0.7 : 0), 1.15, fz - (alongX ? 0 : 0.7));
                                gate.rotation.y = (random() > 0.5 ? 1 : -1) * (0.3 + random() * 1.0);
                                gate.userData.chunkHash = hash;
                                gate.updateMatrixWorld(true);
                                stagingMeshes.push(gate);
                            } else {
                                const fence = new THREE.Mesh(alongX ? this.fenceGeoX : this.fenceGeoZ, this.waterMat);
                                fence.position.set(fx, 1.5, fz);
                                if (random() > (alongX ? 0.1 : 0.2)) fence.userData.isEntityBlocker = true;
                                addGeometry(fence);
                                const rail = new THREE.Mesh(this._boxGeo(alongX ? this.cellSize : 0.07, 0.07, alongX ? 0.07 : this.cellSize), this.rustMat);
                                rail.position.set(fx, 2.96, fz);
                                addGeometry(rail);
                            }
                        };
                        buildFenceRun(true);
                        buildFenceRun(false);
                    } else {
                        const mw = (dx, dz) => {
                            const nx = localX + dx, nz = localZ + dz;
                            return nx >= 0 && nx < this.chunkSize && nz >= 0 && nz < this.chunkSize && maze && maze[nx][nz];
                        };
                        const pocketWalls = (mw(1, 0) ? 1 : 0) + (mw(-1, 0) ? 1 : 0) + (mw(0, 1) ? 1 : 0) + (mw(0, -1) ? 1 : 0);
                        if (pocketWalls >= 2 && random() > 0.7) {
                            const hoard = random();
                            if (hoard < 0.5 && this.cartonGeo) {
                                const cartonPool = this.cartonMats || [this.fileBoxMat];
                                const hbx = px + (random() - 0.5) * 1.2;
                                const hbz = pz + (random() - 0.5) * 1.2;
                                const hYaw = random() * Math.PI;
                                const hN = 1 + Math.floor(random() * 3);
                                for (let ci = 0; ci < hN; ci++) {
                                    const fb = new THREE.Mesh(this.cartonGeo, cartonPool[Math.floor(random() * cartonPool.length)]);
                                    fb.position.set(hbx + (random() - 0.5) * 0.08, 0.25 + ci * 0.5, hbz + (random() - 0.5) * 0.08);
                                    fb.rotation.y = hYaw + (random() - 0.5) * 0.3;
                                    addGeometry(fb);
                                }
                                if (random() > 0.5) {
                                    const tag = new THREE.Mesh(this.documentGeo, this.documentMat);
                                    tag.position.set(hbx, hN * 0.5 + 0.01, hbz);
                                    tag.rotation.y = random() * Math.PI;
                                    tag.userData = {
                                        type: 'document',
                                        chunkHash: hash,
                                        active: true,
                                        zone: 'IMPOUND',
                                        docId: 'TAG_' + Math.floor(random() * 9999)
                                    };
                                    chunkGroup.add(tag);
                                    if (!this.interactables) this.interactables = [];
                                    this.interactables.push(tag);
                                    const tBox = new THREE.Box3().setFromObject(tag);
                                    tBox.chunkHash = hash;
                                    tag.userData.box = tBox;
                                    this.spatialGrid.insert(tBox);
                                }
                            } else if (hoard < 0.75) {
                                addFurniture(buildTable(px, 0, pz));
                            } else {
                                addFurniture(buildChair(px + 0.4, 0, pz, random() * Math.PI * 2));
                                addFurniture(buildChair(px - 0.5, 0, pz + 0.3, random() * Math.PI * 2));
                            }
                        }
                        if (localX % 3 === 0 && localZ % 3 === 0 && random() > 0.5) {
                            const activeMat = ctx.getLightMaterial(0xffaa55, 0xffaa55, false);
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
                id: "CLINIC",
                foundationMat: this.clinicMat,
                ceilingMat: this.clinicMat,
                build: (x, z, localX, localZ, maze, inDir, outDir) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, inDir, outDir, this.sharedWallMat, "CLINIC")) return;
                    const isMainPath = localX === 7 || localZ === 7;
                    if (localX % 2 === 1 && localZ % 2 === 1) {
                        if (!isMainPath) {
                            const curtain = new THREE.Mesh(this._boxGeo(this.cellSize * 0.9, 2.2, 0.05), this.fabricMat);
                            curtain.position.set(x * this.cellSize, 1.1, z * this.cellSize - 1.8);
                            addGeometry(curtain);
                            const cotFrame = new THREE.Mesh(this._boxGeo(1.0, 0.5, 2.0), this.structMat);
                            cotFrame.position.set(x * this.cellSize, 0.25, z * this.cellSize);
                            addGeometry(cotFrame);
                            const mattress = new THREE.Mesh(this._boxGeo(0.9, 0.15, 1.9), this.fabricMat);
                            mattress.position.set(x * this.cellSize, 0.575, z * this.cellSize);
                            addGeometry(mattress);
                            const pole = new THREE.Mesh(this._boxGeo(0.08, 2.0, 0.08), this.rustMat);
                            pole.position.set(x * this.cellSize + 0.8, 1.0, z * this.cellSize + 0.8);
                            addGeometry(pole);
                            if (random() > 0.3) {
                                const chair = buildChair(x * this.cellSize - 0.8, 0, z * this.cellSize + 0.5, random() * Math.PI);
                                addFurniture(chair);
                            }
                        }
                        const activeMat = ctx.getLightMaterial(0xd0e8ff, 0xa0d0ff, false);
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
                    } else if (!isMainPath) {
                        const clutterRoll = random();
                        if (clutterRoll > 0.65) {
                            const isRotated = random() > 0.5;
                            const screenW = isRotated ? 0.1 : this.cellSize * 0.8;
                            const screenD = isRotated ? this.cellSize * 0.8 : 0.1;
                            const screen = new THREE.Mesh(this._boxGeo(screenW, 2.4, screenD), this.fabricMat);
                            screen.position.set(x * this.cellSize, 1.2, z * this.cellSize);
                            addGeometry(screen);
                        } else if (clutterRoll > 0.50) {
                            if (!this.cartonGeo) {
                                this.cartonGeo = new THREE.BoxGeometry(0.6, 0.5, 0.6);
                                this.geoCache.set(this.cartonGeo.uuid, true);
                            }
                            const boxCount = Math.floor(random() * 3) + 1;
                            const cartonPool = this.cartonMats || [this.fileBoxMat];
                            const baseX = x * this.cellSize + (random() * 0.4 - 0.2);
                            const baseZ = z * this.cellSize + (random() * 0.4 - 0.2);
                            const baseYaw = random() * Math.PI;
                            let stackTop = 0;
                            let driftX = 0, driftZ = 0;
                            for (let i = 0; i < boxCount; i++) {
                                const isTop = i === boxCount - 1;
                                const tipped = isTop && random() > 0.8;
                                const mBox = new THREE.Mesh(this.cartonGeo, cartonPool[Math.floor(random() * cartonPool.length)]);
                                driftX = Math.max(-0.09, Math.min(0.09, driftX + (random() - 0.5) * 0.1));
                                driftZ = Math.max(-0.09, Math.min(0.09, driftZ + (random() - 0.5) * 0.1));
                                if (tipped) {
                                    mBox.rotation.order = 'YXZ';
                                    mBox.rotation.x = Math.PI / 2;
                                    mBox.rotation.y = random() * Math.PI;
                                    mBox.position.set(baseX + driftX, stackTop + 0.3, baseZ + driftZ);
                                } else {
                                    mBox.rotation.y = baseYaw + (random() - 0.5) * 0.3;
                                    mBox.position.set(baseX + driftX, stackTop + 0.25, baseZ + driftZ);
                                    stackTop += 0.5;
                                }
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
                id: "BOARDROOM",
                foundationMat: this.boardTileMat || this.tileMat,
                ceilingMat: this.clinicMat,
                build: (x, z, localX, localZ, maze, inDir, outDir) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, inDir, outDir, this.sharedWallMat, "BOARDROOM")) return;
                    const bx = x * this.cellSize, bz = z * this.cellSize;
                    const glass = this.glassMat || this.fabricMat;
                    const onLineX = (localX === 3 || localX === 6 || localX === 9 || localX === 12);
                    const onLineZ = (localZ === 3 || localZ === 6 || localZ === 9 || localZ === 12);
                    const buildPane = (alongZ) => {
                        const rail = buildWall(alongZ ? 0.12 : this.cellSize, alongZ ? this.cellSize : 0.12, this.metalMat, 0.1);
                        rail.position.set(bx, 0.05, bz);
                        addGeometry(rail);
                        const head = buildWall(alongZ ? 0.12 : this.cellSize, alongZ ? this.cellSize : 0.12, this.metalMat, 0.1);
                        head.position.set(bx, 2.95, bz);
                        addGeometry(head);
                        const post = buildWall(0.12, 0.12, this.metalMat, 3.0);
                        post.position.set(bx + (alongZ ? 0 : -2), 1.5, bz + (alongZ ? -2 : 0));
                        addGeometry(post);
                        const pane = buildWall(alongZ ? 0.06 : this.cellSize, alongZ ? this.cellSize : 0.06, glass, 2.8);
                        pane.position.set(bx, 1.5, bz);
                        addGeometry(pane);
                    };
                    if (onLineX && onLineZ) {
                        buildPane(true);
                        buildPane(false);
                        const post = buildWall(0.16, 0.16, this.metalMat, 3.0);
                        post.position.set(bx, 1.5, bz);
                        addGeometry(post);
                        return;
                    }
                    if (onLineX) {
                        if (localZ % 3 !== 1) buildPane(true);
                        return;
                    }
                    if (onLineZ) {
                        if (localX % 3 !== 1) buildPane(false);
                        return;
                    }
                    const isAnchor = (v) => (v === 1 || v === 4 || v === 10 || v === 13);
                    if (isAnchor(localX) && isAnchor(localZ)) {
                        const pcx = bx + 2, pcz = bz + 2;
                        if (random() > 0.30) {
                            const longX = random() > 0.5;
                            const confTable = new THREE.Group();
                            const top = new THREE.Mesh(this._boxGeo(longX ? 3.2 : 1.4, 0.08, longX ? 1.4 : 3.2), this.woodMat);
                            top.position.y = 0.82;
                            confTable.add(top);
                            for (let e = -1; e <= 1; e += 2) {
                                const ped = new THREE.Mesh(this.tableBaseGeo, this.structMat);
                                ped.position.set(longX ? e * 1.1 : 0, 0.4, longX ? 0 : e * 1.1);
                                confTable.add(ped);
                            }
                            confTable.position.set(pcx, 0, pcz);
                            addFurniture(confTable);
                            const sideOff = 1.15, endOff = 2.05;
                            for (let sc = -1; sc <= 1; sc += 2) {
                                for (let sp = -1; sp <= 1; sp += 2) {
                                    if (random() > 0.25) {
                                        const cxp = pcx + (longX ? sp * 0.9 : sc * sideOff);
                                        const czp = pcz + (longX ? sc * sideOff : sp * 0.9);
                                        const face = longX
                                            ? (sc > 0 ? Math.PI : 0)
                                            : (sc > 0 ? -Math.PI / 2 : Math.PI / 2);
                                        addFurniture(buildChair(cxp, 0, czp, face));
                                    }
                                }
                            }
                            if (random() > 0.5) {
                                const hx = pcx + (longX ? endOff : 0);
                                const hz = pcz + (longX ? 0 : endOff);
                                addFurniture(buildChair(hx, 0, hz, longX ? -Math.PI / 2 : Math.PI));
                            }
                            if (random() > 0.55) {
                                const crtGroup = new THREE.Group();
                                const body = new THREE.Mesh(this.terminalBodyGeo, this.baseHousingMat);
                                body.position.set(0, 0.2, 0);
                                const screen = new THREE.Mesh(this._boxGeo(0.45, 0.35, 0.05), this.crtScreenMat);
                                screen.position.set(0, 0.2, 0.26);
                                crtGroup.add(body, screen);
                                crtGroup.position.set(pcx, 0.825, pcz);
                                crtGroup.rotation.y = random() * Math.PI * 2;
                                chunkGroup.add(crtGroup);
                                crtGroup.updateMatrixWorld(true);
                                body.userData.chunkHash = hash;
                                screen.userData.chunkHash = hash;
                                stagingMeshes.push(body, screen);
                            }
                        }
                    }
                    if ((localX + localZ) % 3 === 0 && random() > 0.4) {
                        const activeMat = ctx.getLightMaterial(0xe8f2ff, 0xd8e8ff, false);
                        const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                        panel.position.set(bx, 2.98, bz);
                        chunkGroup.add(panel);
                        this.walls.push(panel);
                        this.fixtureData.push({
                            chunkHash: hash,
                            position: new THREE.Vector3(bx, 2.8, bz),
                            flickerOffset: random() * 500,
                            material: activeMat,
                            isFaulty: random() > 0.9,
                            baseIntensity: 0.65,
                            targetIntensity: 0.65,
                            currentIntensity: 0.65
                        });
                    }
                }
            },
            {
                id: "ARCHIVE",
                foundationMat: this.structMat,
                ceilingMat: this.structMat,
                build: (x, z, localX, localZ, maze, inDir, outDir) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, inDir, outDir, this.structMat, "ARCHIVE")) return;
                    const isWall = maze && maze[localX][localZ];
                    const acx = x * this.cellSize, acz = z * this.cellSize;
                    if (!this.bookRowGeo) {
                        this.bookRowGeo = new THREE.BoxGeometry(3.5, 0.6, 0.36);
                        this.geoCache.set(this.bookRowGeo.uuid, true);
                        this.fileBoxGeo = new THREE.BoxGeometry(0.42, 0.3, 0.32);
                        this.geoCache.set(this.fileBoxGeo.uuid, true);
                    }
                    if (isWall) {
                        const inMaze = (nx, nz) => nx >= 0 && nx < this.chunkSize && nz >= 0 && nz < this.chunkSize && maze[nx][nz];
                        const zRun = inMaze(localX, localZ - 1) || inMaze(localX, localZ + 1);
                        const xRun = inMaze(localX - 1, localZ) || inMaze(localX + 1, localZ);
                        const alongZ = zRun && !xRun ? true : (xRun && !zRun ? false : ((localX + localZ) % 2 === 0));
                        for (let e = -1; e <= 1; e += 2) {
                            const upright = buildWall(alongZ ? 1.0 : 0.12, alongZ ? 0.12 : 1.0, this.metalMat, 3.0);
                            upright.position.set(acx + (alongZ ? 0 : e * 1.92), 1.5, acz + (alongZ ? e * 1.92 : 0));
                            addGeometry(upright);
                        }
                        const spine = buildWall(alongZ ? 0.08 : 3.9, alongZ ? 3.9 : 0.08, this.metalMat, 3.0);
                        spine.position.set(acx, 1.5, acz);
                        spine.userData.isEntityBlocker = true;
                        addGeometry(spine);
                        const levels = [0.14, 0.88, 1.62, 2.36];
                        for (let li = 0; li < levels.length; li++) {
                            const shelfY = levels[li];
                            const board = buildWall(alongZ ? 0.96 : 3.9, alongZ ? 3.9 : 0.96, this.woodMat, 0.06);
                            board.position.set(acx, shelfY, acz);
                            addGeometry(board);
                            for (let face = -1; face <= 1; face += 2) {
                                const roll = random();
                                if (roll > 0.22) {
                                    const row = new THREE.Mesh(this.bookRowGeo, this.bookRowMat);
                                    const wScale = 0.45 + random() * 0.55;
                                    const slide = (random() - 0.5) * 3.5 * (1 - wScale);
                                    row.position.set(
                                        acx + (alongZ ? face * 0.24 : slide),
                                        shelfY + 0.34,
                                        acz + (alongZ ? slide : face * 0.24)
                                    );
                                    if (alongZ) row.rotation.y = Math.PI / 2;
                                    row.scale.set(wScale, 1, 1);
                                    addGeometry(row);
                                }
                                if (roll < 0.4) {
                                    const boxCount = 1 + Math.floor(random() * 2);
                                    for (let bi = 0; bi < boxCount; bi++) {
                                        const fb = new THREE.Mesh(this.fileBoxGeo, this.fileBoxMat);
                                        const bSlide = (random() - 0.5) * 3.0;
                                        fb.position.set(
                                            acx + (alongZ ? face * 0.26 : bSlide),
                                            shelfY + 0.19,
                                            acz + (alongZ ? bSlide : face * 0.26)
                                        );
                                        fb.rotation.y = (alongZ ? Math.PI / 2 : 0) + (random() - 0.5) * 0.25;
                                        addGeometry(fb);
                                    }
                                }
                            }
                        }
                        const cap = buildWall(alongZ ? 0.96 : 3.9, alongZ ? 3.9 : 0.96, this.metalMat, 0.06);
                        cap.position.set(acx, 2.92, acz);
                        addGeometry(cap);
                    } else {
                        if (random() > 0.72) {
                            const sheets = 1 + Math.floor(random() * 2);
                            for (let i = 0; i < sheets; i++) {
                                const sheet = new THREE.Mesh(this.documentGeo, this.documentMat);
                                sheet.position.set(acx + (random() - 0.5) * 2.6, 0.015, acz + (random() - 0.5) * 2.6);
                                sheet.rotation.y = random() * Math.PI * 2;
                                if (random() > 0.7) {
                                    sheet.userData = {
                                        type: 'document',
                                        chunkHash: hash,
                                        active: true,
                                        zone: 'ARCHIVE',
                                        docId: 'REC_' + Math.floor(random() * 9999)
                                    };
                                    chunkGroup.add(sheet);
                                    if (!this.interactables) this.interactables = [];
                                    this.interactables.push(sheet);
                                    const sBox = new THREE.Box3().setFromObject(sheet);
                                    sBox.chunkHash = hash;
                                    sheet.userData.box = sBox;
                                    this.spatialGrid.insert(sBox);
                                } else {
                                    addGeometry(sheet);
                                }
                            }
                        }
                        if (random() > 0.88) {
                            const stackH = 1 + Math.floor(random() * 3);
                            const sx = acx + (random() - 0.5) * 1.8;
                            const sz = acz + (random() - 0.5) * 1.8;
                            const cartonPool = this.cartonMats || [this.fileBoxMat];
                            for (let i = 0; i < stackH; i++) {
                                const fb = new THREE.Mesh(this.fileBoxGeo, cartonPool[Math.floor(random() * cartonPool.length)]);
                                fb.position.set(sx + (random() - 0.5) * 0.08, 0.15 + i * 0.3, sz + (random() - 0.5) * 0.08);
                                fb.rotation.y = random() * Math.PI * 2;
                                addGeometry(fb);
                            }
                        }
                        if (random() > 0.85) {
                            const activeMat = ctx.getLightMaterial(0xffaa55, 0xffaa55, true);
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
                id: "SERVER",
                foundationMat: this.serverFloorMat,
                ceilingMat: this.serverFloorMat,
                build: (x, z, localX, localZ, maze, inDir, outDir) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, inDir, outDir, this.sharedWallMat, "SERVER")) return;
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
                            const activeMat = ctx.getLightMaterial(0xff3333, 0xff0000, false);
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
                id: "MAINTENANCE",
                foundationMat: this.serverFloorMat,
                ceilingMat: this.structMat,
                build: (x, z, localX, localZ, maze, inDir, outDir) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, inDir, outDir, this.structMat, "MAINTENANCE")) return;
                    const isWall = maze && maze[localX][localZ];
                    if (isWall) {
                        const block = buildWall(this.cellSize, this.cellSize, this.structMat);
                        block.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        block.userData.isEntityBlocker = true;
                        addGeometry(block);
                    } else {
                        const isW = (lx, lz) => {
                            if (lx < 0 || lx >= this.chunkSize || lz < 0 || lz >= this.chunkSize) {
                                return !((lx === 7 && (lz === -1 || lz === this.chunkSize)) || (lz === 7 && (lx === -1 || lx === this.chunkSize)));
                            }
                            return maze[lx][lz];
                        };
                        const wN = isW(localX, localZ - 1);
                        const wS = isW(localX, localZ + 1);
                        const wE = isW(localX + 1, localZ);
                        const wW = isW(localX - 1, localZ);
                        const tOff = (this.cellSize / 2) - 0.2;
                        if (wN) {
                            const extW = !isW(localX - 1, localZ - 1);
                            const extE = !isW(localX + 1, localZ - 1);
                            const len = this.cellSize + (extW ? 0.4 : 0) + (extE ? 0.4 : 0);
                            const cx = (extE ? 0.2 : 0) - (extW ? 0.2 : 0);
                            const trim = new THREE.Mesh(this._boxGeo(len, 0.1, 0.4), this.hazardMat);
                            trim.position.set(x * this.cellSize + cx, 0.050, z * this.cellSize - tOff);
                            addGeometry(trim);
                        }
                        if (wS) {
                            const extW = !isW(localX - 1, localZ + 1);
                            const extE = !isW(localX + 1, localZ + 1);
                            const len = this.cellSize + (extW ? 0.4 : 0) + (extE ? 0.4 : 0);
                            const cx = (extE ? 0.2 : 0) - (extW ? 0.2 : 0);
                            const trim = new THREE.Mesh(this._boxGeo(len, 0.1, 0.4), this.hazardMat);
                            trim.position.set(x * this.cellSize + cx, 0.050, z * this.cellSize + tOff);
                            addGeometry(trim);
                        }
                        if (wE) {
                            const extN = !isW(localX + 1, localZ - 1);
                            const extS = !isW(localX + 1, localZ + 1);
                            const len = this.cellSize + (extN ? 0.4 : 0) + (extS ? 0.4 : 0);
                            const cz = (extS ? 0.2 : 0) - (extN ? 0.2 : 0);
                            const trim = new THREE.Mesh(this._boxGeo(0.4, 0.1, len), this.hazardMat);
                            trim.position.set(x * this.cellSize + tOff, 0.051, z * this.cellSize + cz);
                            addGeometry(trim);
                        }
                        if (wW) {
                            const extN = !isW(localX - 1, localZ - 1);
                            const extS = !isW(localX - 1, localZ + 1);
                            const len = this.cellSize + (extN ? 0.4 : 0) + (extS ? 0.4 : 0);
                            const cz = (extS ? 0.2 : 0) - (extN ? 0.2 : 0);
                            const trim = new THREE.Mesh(this._boxGeo(0.4, 0.1, len), this.hazardMat);
                            trim.position.set(x * this.cellSize - tOff, 0.051, z * this.cellSize + cz);
                            addGeometry(trim);
                        }
                        const openE = !wE;
                        const openS = !wS;
                        const openN = !wN;
                        const openW = !wW;
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
                            const activeMat = ctx.getLightMaterial(0xffaa00, 0xaa5500, false);
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
                id: "CHASM",
                foundationMat: null,
                build: (x, z, localX, localZ, maze, inDir, outDir) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, inDir, outDir, this.sharedWallMat, "CHASM")) return;
                    const isVoid = !maze || maze[localX][localZ];
                    const gx = x * this.cellSize, gz = z * this.cellSize;
                    if (!isVoid) {
                        const bFloor = buildWall(this.cellSize, this.cellSize, this.diamondPlateMat || this.structMat, 0.2);
                        bFloor.position.set(gx, -0.1, gz);
                        addGeometry(bFloor);
                        const checkVoid = (nx, nz) => {
                            if (nx < 0 || nx >= this.chunkSize || nz < 0 || nz >= this.chunkSize) return false;
                            return !maze || maze[nx][nz];
                        };
                        if (checkVoid(localX - 1, localZ)) {
                            const railing = buildWall(0.15, this.cellSize + 0.4, this.rustMat, 1.2);
                            railing.position.set(gx - 1.8, 0.6, gz);
                            addGeometry(railing);
                        }
                        if (checkVoid(localX + 1, localZ)) {
                            const railing = buildWall(0.15, this.cellSize + 0.4, this.rustMat, 1.2);
                            railing.position.set(gx + 1.8, 0.6, gz);
                            addGeometry(railing);
                        }
                        if (checkVoid(localX, localZ - 1)) {
                            const railing = buildWall(this.cellSize + 0.4, 0.15, this.rustMat, 1.2);
                            railing.position.set(gx, 0.6, gz - 1.8);
                            addGeometry(railing);
                        }
                        if (checkVoid(localX, localZ + 1)) {
                            const railing = buildWall(this.cellSize + 0.4, 0.15, this.rustMat, 1.2);
                            railing.position.set(gx, 0.6, gz + 1.8);
                            addGeometry(railing);
                        }
                        if (random() > 0.85) {
                            const lampMat = this.baseLightMat.clone();
                            lampMat.color.setHex(0xff2200);
                            lampMat.emissive.setHex(0xff0000);
                            const lamp = buildWall(0.3, 0.3, lampMat, 0.4);
                            lamp.position.set(gx, 4.0, gz);
                            lamp.userData.chunkHash = hash;
                            chunkGroup.add(lamp);
                            lamp.updateMatrixWorld(true);
                            this.walls.push(lamp);
                            const wire = buildWall(0.04, 0.04, this.metalMat, 10.0);
                            wire.position.set(gx, 9.0, gz);
                            addGeometry(wire);
                            this.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(gx, 3.8, gz),
                                flickerOffset: random() * 500,
                                material: lampMat,
                                isFaulty: random() > 0.5,
                                baseIntensity: 0.8,
                                targetIntensity: 0.8,
                                currentIntensity: 0.8
                            });
                        }
                    } else {
                        const voidBox = new AABB();
                        voidBox.min.set(gx - 2, -100, gz - 2);
                        voidBox.max.set(gx + 2, 3, gz + 2);
                        voidBox.isVoid = true;
                        voidBox.chunkHash = hash;
                        this.spatialGrid.insert(voidBox);
                        if (random() > 0.95 && localX > 2 && localX < 12 && localZ > 2 && localZ < 12) {
                            const pillar = buildWall(1.8 + random() * 1.5, 1.8 + random() * 1.5, this.rustMat, 80.0);
                            pillar.position.set(gx, -30.0, gz);
                            addGeometry(pillar);
                        }
                    }
                }
            },
            {
                id: "INCINERATOR",
                foundationMat: this.diamondPlateMat || this.rustMat,
                ceilingMat: this.incinCeilingMat || null,
                build: (x, z, localX, localZ, maze, inDir, outDir) => {
                    const edge = this.chunkSize - 1;
                    const isDoorwayNS = localX === 7 && (localZ === 0 || localZ === edge);
                    const isDoorwayEW = localZ === 7 && (localX === 0 || localX === edge);
                    const isDoorway = isDoorwayNS || isDoorwayEW;
                    if (ctx.buildPerimeter(x, z, localX, localZ, inDir, outDir, this.sharedWallMat, "INCINERATOR")) {
                        if (!isDoorway) {
                            const lEdge = this.chunkSize - 1;
                            const liners = [];
                            if (localX === 0) liners.push([1, 0]);
                            if (localX === lEdge) liners.push([-1, 0]);
                            if (localZ === 0) liners.push([0, 1]);
                            if (localZ === lEdge) liners.push([0, -1]);
                            const isCorner = (localX === 0 || localX === lEdge) && (localZ === 0 || localZ === lEdge);
                            if (isCorner) {
                                const sxp = localX === 0 ? 1 : -1;
                                const szp = localZ === 0 ? 1 : -1;
                                const post = buildWall(0.4, 0.4, this.rustMat, 3.0);
                                post.position.set(x * this.cellSize + sxp * 2.2, 1.5, z * this.cellSize + szp * 2.2);
                                addGeometry(post);
                            } else {
                                for (let li = 0; li < liners.length; li++) {
                                    const ldx = liners[li][0], ldz = liners[li][1];
                                    const liner = buildWall(ldx !== 0 ? 0.4 : this.cellSize, ldz !== 0 ? 0.4 : this.cellSize, this.rustMat, 3.0);
                                    liner.position.set(x * this.cellSize + ldx * 2.2, 1.5, z * this.cellSize + ldz * 2.2);
                                    addGeometry(liner);
                                }
                            }
                        } else {
                            const spansX = isDoorwayNS;
                            const dcx = x * this.cellSize;
                            const dcz = z * this.cellSize;
                            const outSign = (localZ === 0 || localX === 0) ? -1 : 1;
                            const lampMat = this.baseLightMat.clone();
                            lampMat.color.setHex(0xff3300);
                            lampMat.emissive.setHex(0xff1100);
                            const lamp = new THREE.Mesh(this._boxGeo(0.3, 0.12, 0.18), lampMat);
                            if (spansX) lamp.position.set(dcx, 2.5, dcz + outSign * 0.5);
                            else lamp.position.set(dcx + outSign * 0.5, 2.5, dcz);
                            const lampLight = new THREE.PointLight(0xff2200, 1.2, 6.0, 2.0);
                            lampLight.position.set(0, -0.2, 0);
                            lamp.add(lampLight);
                            lamp.userData.chunkHash = hash;
                            chunkGroup.add(lamp);
                            this.walls.push(lamp);
                            this.fixtureData.push({
                                chunkHash: hash,
                                position: lamp.position.clone(),
                                flickerOffset: random() * 500,
                                material: lampMat,
                                lightObj: lampLight,
                                isFaulty: true,
                                baseIntensity: 1.0,
                                targetIntensity: 1.0,
                                currentIntensity: 1.0
                            });
                        }
                        return;
                    }
                    const isMainPath = localX === 7 || localZ === 7;
                    if (localX >= 4 && localX <= 11 && localZ >= 4 && localZ <= 11 && !isMainPath) {
                        const block = buildWall(this.cellSize, this.cellSize, this.rustMat, 3.0);
                        block.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        block.userData.isEntityBlocker = true;
                        addGeometry(block);
                        const buildSconce = (nx, nz) => {
                            const fx = x * this.cellSize + nx * 2.0;
                            const fz = z * this.cellSize + nz * 2.0;
                            const activeMat = ctx.getLightMaterial(0xff5522, 0xff2200, false);
                            const housing = buildWall(nx !== 0 ? 0.16 : 0.8, nz !== 0 ? 0.16 : 0.8, this.rustMat, 0.5);
                            housing.position.set(fx + nx * 0.08, 1.5, fz + nz * 0.08);
                            addGeometry(housing);
                            const plate = buildWall(nx !== 0 ? 0.1 : 0.55, nz !== 0 ? 0.1 : 0.55, activeMat, 0.32);
                            plate.position.set(fx + nx * 0.21, 1.5, fz + nz * 0.21);
                            plate.userData.chunkHash = hash;
                            const pLight = new THREE.PointLight(0xff2200, 1.5, 8.0, 2.0);
                            pLight.position.set(nx * 0.4, 0, nz * 0.4);
                            plate.add(pLight);
                            chunkGroup.add(plate);
                            plate.updateMatrixWorld(true);
                            this.walls.push(plate);
                            this.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(fx + nx * 0.4, 1.5, fz + nz * 0.4),
                                flickerOffset: random() * 500,
                                material: activeMat,
                                lightObj: pLight,
                                isFaulty: random() > 0.8,
                                baseIntensity: 1.2,
                                targetIntensity: 1.2,
                                currentIntensity: 1.2
                            });
                        };
                        if (localX === 4 && localZ % 2 === 0) buildSconce(-1, 0);
                        if (localX === 11 && localZ % 2 === 0) buildSconce(1, 0);
                        if (localZ === 4 && localX % 2 === 1) buildSconce(0, -1);
                        if (localZ === 11 && localX % 2 === 1) buildSconce(0, 1);
                    } else {
                        const ductMat = this.ventMat || this.metalMat || this.rustMat;
                        if (!this.emberGrilleMat) {
                            this.emberGrilleMat = new THREE.MeshStandardMaterial({
                                color: 0x2a1005, emissive: 0xff5500, emissiveIntensity: 1.2, roughness: 0.9
                            });
                            this.sharedAssets.add(this.emberGrilleMat.uuid);
                        }
                        if (!this.valveGeo) {
                            this.valveGeo = new THREE.TorusGeometry(0.17, 0.03, 6, 12);
                            this.geoCache.set(this.valveGeo.uuid, true);
                        }
                        const cxw = x * this.cellSize, czw = z * this.cellSize;
                        const isCorridorNS = localX === 7 && (localZ <= 3 || localZ >= 12);
                        const isCorridorEW = localZ === 7 && (localX <= 3 || localX >= 12);
                        if (isCorridorNS || isCorridorEW) {
                            const spine = buildWall(isCorridorNS ? 1.1 : this.cellSize, isCorridorNS ? this.cellSize : 1.1, ductMat, 0.4);
                            spine.position.set(cxw, 2.78, czw);
                            addGeometry(spine);
                            if ((localX + localZ) % 2 === 0) {
                                const grille = buildWall(0.5, 0.5, this.emberGrilleMat, 0.06);
                                grille.position.set(cxw, 2.57, czw);
                                addGeometry(grille);
                            }
                            const crossX = isCorridorNS && (localZ === 2 || localZ === 13);
                            const crossZ = isCorridorEW && (localX === 2 || localX === 13);
                            if (crossX || crossZ) {
                                for (let as = -1; as <= 1; as += 2) {
                                    const riser = buildWall(0.7, 0.7, ductMat, 1.15);
                                    riser.position.set(cxw + (crossX ? as * 1.65 : 0), 2.0, czw + (crossX ? 0 : as * 1.65));
                                    addGeometry(riser);
                                }
                                const bridge = buildWall(crossX ? this.cellSize : 0.7, crossX ? 0.7 : this.cellSize, ductMat, 0.4);
                                bridge.position.set(cxw, 2.75, czw);
                                addGeometry(bridge);
                            }
                            return;
                        }
                        const midX = (localX === 2 || localX === 13);
                        const midZ = (localZ === 2 || localZ === 13);
                        const buildDuctRun = (alongZ) => {
                            const gapCell = alongZ ? (localZ % 4 === 0) : (localX % 4 === 0);
                            if (gapCell) {
                                for (let as = -1; as <= 1; as += 2) {
                                    const riser = buildWall(0.7, 0.7, ductMat, 1.15);
                                    riser.position.set(cxw + (alongZ ? 0 : as * 1.65), 2.0, czw + (alongZ ? as * 1.65 : 0));
                                    addGeometry(riser);
                                }
                                const bridge = buildWall(alongZ ? 0.7 : this.cellSize, alongZ ? this.cellSize : 0.7, ductMat, 0.4);
                                bridge.position.set(cxw, 2.75, czw);
                                addGeometry(bridge);
                            } else {
                                const duct = buildWall(alongZ ? 0.7 : this.cellSize, alongZ ? this.cellSize : 0.7, ductMat, 0.7);
                                duct.position.set(cxw, 1.15, czw);
                                addGeometry(duct);
                                if (random() > 0.65) {
                                    const gs = random() > 0.5 ? 1 : -1;
                                    const g = buildWall(alongZ ? 0.06 : 0.6, alongZ ? 0.6 : 0.06, this.emberGrilleMat, 0.3);
                                    g.position.set(cxw + (alongZ ? gs * 0.38 : 0), 1.15, czw + (alongZ ? 0 : gs * 0.38));
                                    addGeometry(g);
                                }
                            }
                        };
                        if (midX) buildDuctRun(true);
                        if (midZ) buildDuctRun(false);
                        if (!midX && !midZ && ((localX * 7 + localZ * 13) % 5 === 0) && random() > 0.35) {
                            const count = 1 + Math.floor(random() * 3);
                            for (let pi = 0; pi < count; pi++) {
                                const pox = (random() - 0.5) * 1.6, poz = (random() - 0.5) * 1.6;
                                const ps = 0.8 + random() * 1.6;
                                const pipe = new THREE.Mesh(this.vPipeGeo, this.rustMat);
                                pipe.position.set(cxw + pox, 1.5, czw + poz);
                                pipe.scale.set(ps, 1.0, ps);
                                addGeometry(pipe);
                                if (random() > 0.6) {
                                    const valve = new THREE.Mesh(this.valveGeo, this.metalMat);
                                    valve.rotation.x = Math.PI / 2;
                                    valve.position.set(cxw + pox, 1.0 + random() * 1.0, czw + poz);
                                    addGeometry(valve);
                                }
                            }
                        }
                        if (localZ % 2 === 1) {
                            const hPipe = new THREE.Mesh(this.pipeGeo, this.rustMat);
                            hPipe.position.set(cxw, 2.72, czw + 1.2);
                            addGeometry(hPipe);
                        }
                        if (localX % 2 === 1) {
                            const hPipe2 = new THREE.Mesh(this.pipeGeo, this.rustMat);
                            hPipe2.rotation.y = Math.PI / 2;
                            hPipe2.position.set(cxw + 1.2, 2.85, czw);
                            addGeometry(hPipe2);
                        }
                        if (localZ % 2 === 1 && localX % 2 === 1) {
                            const joint = new THREE.Mesh(this.pipeJointGeo, this.metalMat);
                            joint.position.set(cxw + 1.2, 2.785, czw + 1.2);
                            addGeometry(joint);
                        }
                        if (localZ % 2 === 1 && localX % 2 === 0) {
                            const mnt = new THREE.Mesh(this.pipeMountGeo, this.rustMat);
                            mnt.position.set(cxw, 2.88, czw + 1.2);
                            addGeometry(mnt);
                        }
                        if (localX % 2 === 1 && localZ % 2 === 0) {
                            const mnt2 = new THREE.Mesh(this.pipeMountGeo, this.rustMat);
                            mnt2.position.set(cxw + 1.2, 2.94, czw);
                            addGeometry(mnt2);
                        }
                        if (localZ >= 4 && localZ <= 11 && (localX === 3 || localX === 12) && localZ % 3 === 2 && localZ % 4 !== 0) {
                            const dirf = localX === 3 ? 1 : -1;
                            const feed = buildWall(6.0, 0.6, ductMat, 0.4);
                            feed.position.set(cxw - dirf * 1.0, 2.78, czw);
                            addGeometry(feed);
                            const climb = buildWall(0.6, 0.6, ductMat, 1.1);
                            climb.position.set(cxw - dirf * 4.0, 2.03, czw);
                            addGeometry(climb);
                        }
                        if (localX >= 4 && localX <= 11 && (localZ === 3 || localZ === 12) && localX % 3 === 2 && localX % 4 !== 0) {
                            const dirf = localZ === 3 ? 1 : -1;
                            const feed = buildWall(0.6, 6.0, ductMat, 0.4);
                            feed.position.set(cxw, 2.78, czw - dirf * 1.0);
                            addGeometry(feed);
                            const climb = buildWall(0.6, 0.6, ductMat, 1.1);
                            climb.position.set(cxw, 2.03, czw - dirf * 4.0);
                            addGeometry(climb);
                        }
                    }
                }
            },
            {
                id: "ANNEX",
                foundationMat: this.clinicMat,
                ceilingMat: this.clinicMat,
                build: (x, z, localX, localZ, maze, inDir, outDir) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, inDir, outDir, this.sharedWallMat, "ANNEX")) return;
                    const ox = x * this.cellSize, oz = z * this.cellSize;
                    const isCorr = (lx, lz) => lx > 0 && lx < this.chunkSize - 1 && lz > 0 && lz < this.chunkSize - 1 &&
                        (lx === 7 || lz === 3 || lz === 7 || lz === 11);
                    if (isCorr(localX, localZ)) {
                        if ((localX + localZ) % 2 === 0 && random() > 0.45) {
                            const activeMat = ctx.getLightMaterial(0xffaa55, 0xffaa55, false);
                            const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                            panel.position.set(ox, 2.98, oz);
                            chunkGroup.add(panel);
                            this.walls.push(panel);
                            this.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(ox, 2.8, oz),
                                flickerOffset: random() * 500,
                                material: activeMat,
                                isFaulty: random() > 0.8,
                                baseIntensity: 0.5,
                                targetIntensity: 0.5,
                                currentIntensity: 0.5
                            });
                        }
                        return;
                    }
                    const corrEdges = [];
                    if (isCorr(localX, localZ - 1)) corrEdges.push([0, -1]);
                    if (isCorr(localX, localZ + 1)) corrEdges.push([0, 1]);
                    if (isCorr(localX - 1, localZ)) corrEdges.push([-1, 0]);
                    if (isCorr(localX + 1, localZ)) corrEdges.push([1, 0]);
                    if (corrEdges.length === 0) {
                        const block = buildWall(this.cellSize, this.cellSize, this.sharedWallMat);
                        block.position.set(ox, 1.5, oz);
                        block.userData.isEntityBlocker = true;
                        addGeometry(block);
                        return;
                    }
                    const dd = corrEdges[Math.floor(random() * corrEdges.length)];
                    const isOffice = (lx, lz) => !isCorr(lx, lz) && lx > 0 && lx < this.chunkSize - 1 && lz > 0 && lz < this.chunkSize - 1 &&
                        (isCorr(lx, lz - 1) || isCorr(lx, lz + 1) || isCorr(lx - 1, lz) || isCorr(lx + 1, lz));
                    const edges = [[0, -1], [0, 1], [-1, 0], [1, 0]];
                    for (let ei = 0; ei < edges.length; ei++) {
                        const ex = edges[ei][0], ez = edges[ei][1];
                        if (ex === dd[0] && ez === dd[1]) continue;
                        const nx = localX + ex, nz = localZ + ez;
                        let buildIt;
                        if (isCorr(nx, nz)) buildIt = true;
                        else if (isOffice(nx, nz)) buildIt = (ez === -1 || ex === -1);
                        else buildIt = false;
                        if (buildIt) {
                            const wallSeg = buildWall(ex === 0 ? this.cellSize : 0.25, ex === 0 ? 0.25 : this.cellSize, this.sharedWallMat);
                            wallSeg.position.set(ox + ex * 2, 1.5, oz + ez * 2);
                            wallSeg.userData.isEntityBlocker = true;
                            addGeometry(wallSeg);
                        }
                    }
                    const spansX = dd[1] !== 0;
                    const wx = ox + dd[0] * 2, wz = oz + dd[1] * 2;
                    const isOpenable = random() < 0.35;
                    if (!this._annexKeypadChunks) this._annexKeypadChunks = new Set();
                    const isKeypad = !isOpenable && !this._annexKeypadChunks.has(hash) && random() < 0.35;
                    if (isKeypad) this._annexKeypadChunks.add(hash);
                    if (!this.laptopScreenMat) {
                        this.laptopScreenMat = new THREE.MeshBasicMaterial({color: 0xa8ffd0});
                        this.sharedAssets.add(this.laptopScreenMat.uuid);
                    }
                    for (let s = -1; s <= 1; s += 2) {
                        const stub = buildWall(spansX ? 1.2 : 0.25, spansX ? 0.25 : 1.2, this.sharedWallMat);
                        stub.position.set(wx + (spansX ? s * 1.4 : 0), 1.5, wz + (spansX ? 0 : s * 1.4));
                        stub.userData.isEntityBlocker = true;
                        addGeometry(stub);
                    }
                    const header = buildWall(spansX ? 1.6 : 0.25, spansX ? 0.25 : 1.6, this.annexFrameMat || this.metalMat, 0.35);
                    header.position.set(wx, 2.825, wz);
                    addGeometry(header);
                    for (let s = -1; s <= 1; s += 2) {
                        const jamb = new THREE.Mesh(this._boxGeo(spansX ? 0.1 : 0.3, 2.65, spansX ? 0.3 : 0.1), this.annexFrameMat || this.metalMat);
                        jamb.position.set(wx + (spansX ? s * 0.75 : 0), 1.325, wz + (spansX ? 0 : s * 0.75));
                        addGeometry(jamb);
                    }
                    const doorW = 1.4, doorT = 0.1;
                    let doorGeo, doorMesh;
                    const annexDoorMat = this.annexDoorMat || this.doorMat;
                    if (spansX) {
                        doorGeo = this._cacheGeo('hingedDoor:X', () => {
                            const g = new THREE.BoxGeometry(doorW, 2.65, doorT);
                            g.translate(doorW / 2, 0, doorT / 2);
                            return g;
                        });
                        doorMesh = new THREE.Mesh(doorGeo, annexDoorMat);
                        doorMesh.position.set(wx - doorW / 2, 1.325, wz);
                        doorMesh.userData = (isOpenable || isKeypad) ? {chunkHash: hash, closedRot: 0, currentRot: 0} : {chunkHash: hash};
                    } else {
                        doorGeo = this._cacheGeo('hingedDoor:Z', () => {
                            const g = new THREE.BoxGeometry(doorT, 2.65, doorW);
                            g.translate(doorT / 2, 0, doorW / 2);
                            return g;
                        });
                        doorMesh = new THREE.Mesh(doorGeo, annexDoorMat);
                        doorMesh.position.set(wx, 1.325, wz - doorW / 2);
                        doorMesh.userData = (isOpenable || isKeypad) ? {chunkHash: hash, closedRot: -Math.PI / 2, currentRot: -Math.PI / 2} : {chunkHash: hash};
                    }
                    if (isKeypad) doorMesh.userData.codeLocked = true;
                    doorMesh.castShadow = doorMesh.receiveShadow = true;
                    chunkGroup.add(doorMesh);
                    if (isOpenable || isKeypad) this.interactiveDoors.push(doorMesh);
                    this.walls.push(doorMesh);
                    doorMesh.updateMatrixWorld();
                    const dBox = new THREE.Box3().setFromObject(doorMesh);
                    dBox.chunkHash = hash;
                    if (isOpenable || isKeypad) doorMesh.userData.box = dBox;
                    this.spatialGrid.insert(dBox);
                    if (isKeypad) {
                        const pad = new THREE.Group();
                        const padBody = new THREE.Mesh(this._boxGeo(0.16, 0.22, 0.05), this.baseHousingMat);
                        pad.add(padBody);
                        const padGlow = new THREE.Mesh(this._planeGeo(0.1, 0.14), this.laptopScreenMat);
                        padGlow.position.z = 0.026;
                        pad.add(padGlow);
                        pad.position.set(
                            wx + (spansX ? 1.0 : dd[0] * 0.18),
                            1.35,
                            wz + (spansX ? dd[1] * 0.18 : 1.0)
                        );
                        pad.rotation.y = spansX ? (dd[1] > 0 ? 0 : Math.PI) : (dd[0] > 0 ? Math.PI / 2 : -Math.PI / 2);
                        pad.traverse((ch) => { ch.userData.chunkHash = hash; });
                        chunkGroup.add(pad);
                        pad.updateMatrixWorld(true);
                        const sX = ox - dd[0] * 0.9, sZ = oz - dd[1] * 0.9;
                        if (!this.interactables) this.interactables = [];
                        const batGroup = new THREE.Group();
                        batGroup.add(this.batteryPrefab.clone());
                        const bGlow = new THREE.Mesh(this.glowGeo, this.glowMat);
                        bGlow.scale.set(0.15, 0.15, 0.15);
                        bGlow.position.y = 0.01;
                        batGroup.add(bGlow);
                        batGroup.position.set(sX, 0.1, sZ);
                        batGroup.userData = {type: 'battery', chunkHash: hash, active: true};
                        chunkGroup.add(batGroup);
                        this.interactables.push(batGroup);
                        const aGroup = new THREE.Group();
                        aGroup.add(this.almondPrefab.clone());
                        const aGlow = new THREE.Mesh(this.glowGeo, this.glowMat);
                        aGlow.scale.set(0.15, 0.15, 0.15);
                        aGlow.position.y = 0.01;
                        aGroup.add(aGlow);
                        aGroup.position.set(ox + (dd[1] !== 0 ? 0.9 : 0), 0.1, oz + (dd[0] !== 0 ? 0.9 : 0));
                        aGroup.userData = {type: 'almond', chunkHash: hash, active: true};
                        chunkGroup.add(aGroup);
                        this.interactables.push(aGroup);
                        const fin = new THREE.Mesh(this.documentGeo, this.documentMat);
                        fin.position.set(ox, 0.015, oz);
                        fin.rotation.y = random() * Math.PI;
                        fin.userData = {
                            type: 'document',
                            chunkHash: hash,
                            active: true,
                            zone: 'ANNEX',
                            docId: 'FINALE_' + Math.floor(random() * 999)
                        };
                        chunkGroup.add(fin);
                        this.interactables.push(fin);
                        const finBox = new THREE.Box3().setFromObject(fin);
                        finBox.chunkHash = hash;
                        fin.userData.box = finBox;
                        this.spatialGrid.insert(finBox);
                        return;
                    }
                    if (!isOpenable) return;
                    const contentRoll = random();
                    if (contentRoll < 0.5) {
                        const deskX = ox - dd[0] * 1.0, deskZ = oz - dd[1] * 1.0;
                        addFurniture(buildTable(deskX, 0, deskZ));
                        const spawnRoll = random();
                        if (spawnRoll < 0.5) {
                            const lap = new THREE.Group();
                            const lapBase = new THREE.Mesh(this._boxGeo(0.36, 0.025, 0.26), this.baseHousingMat);
                            lap.add(lapBase);
                            const lapScreen = new THREE.Mesh(this._cacheGeo('lapScreen', () => {
                                const g = new THREE.BoxGeometry(0.36, 0.24, 0.02);
                                g.translate(0, 0.12, 0);
                                return g;
                            }), this.baseHousingMat);
                            lapScreen.position.set(0, 0.01, -0.12);
                            lapScreen.rotation.x = -0.35;
                            const glow = new THREE.Mesh(this._planeGeo(0.3, 0.18), this.laptopScreenMat);
                            glow.position.set(0, 0.13, 0.012);
                            lapScreen.add(glow);
                            lap.add(lapScreen);
                            lap.position.set(deskX, 0.845, deskZ);
                            lap.rotation.y = Math.atan2(dd[0], dd[1]);
                            lap.userData = {
                                type: 'document',
                                chunkHash: hash,
                                active: true,
                                zone: 'ANNEX',
                                docId: 'PC_' + Math.floor(random() * 9999)
                            };
                            chunkGroup.add(lap);
                            lap.updateMatrixWorld(true);
                            if (!this.interactables) this.interactables = [];
                            this.interactables.push(lap);
                            const lBox = new THREE.Box3().setFromObject(lap);
                            lBox.chunkHash = hash;
                            lap.userData.box = lBox;
                            this.spatialGrid.insert(lBox);
                        } else if (spawnRoll < 0.75) {
                            const tapeGroup = new THREE.Group();
                            if (!this.tapeGeo) {
                                this.tapeGeo = new THREE.BoxGeometry(0.18, 0.04, 0.12);
                                this.geoCache.set(this.tapeGeo.uuid, true);
                            }
                            const tapeBody = new THREE.Mesh(this.tapeGeo, this.baseHousingMat);
                            tapeBody.position.set(0, 0.02, 0);
                            tapeGroup.add(tapeBody);
                            const recLight = new THREE.Mesh(this._boxGeo(0.02, 0.02, 0.02), this.hazardMat);
                            recLight.material = new THREE.MeshBasicMaterial({color: 0xff0000});
                            recLight.position.set(0.06, 0.04, -0.04);
                            tapeGroup.add(recLight);
                            tapeGroup.position.set(deskX, 0.82, deskZ);
                            tapeGroup.rotation.y = random() * Math.PI;
                            tapeGroup.userData = {
                                type: 'document',
                                chunkHash: hash,
                                active: true,
                                zone: 'AUDIO',
                                docId: 'TAPE_' + Math.floor(random() * 9999)
                            };
                            chunkGroup.add(tapeGroup);
                            if (!this.interactables) this.interactables = [];
                            this.interactables.push(tapeGroup);
                            const tBox = new THREE.Box3().setFromObject(tapeGroup);
                            tBox.chunkHash = hash;
                            tapeGroup.userData.box = tBox;
                            this.spatialGrid.insert(tBox);
                        }
                    } else if (contentRoll < 0.75) {
                        const doc = new THREE.Mesh(this.documentGeo, this.documentMat);
                        doc.position.set(ox + (random() - 0.5) * 1.6, 0.015, oz + (random() - 0.5) * 1.6);
                        doc.rotation.y = random() * Math.PI;
                        doc.userData = {
                            type: 'document',
                            chunkHash: hash,
                            active: true,
                            zone: 'ANNEX',
                            docId: 'LOG_' + Math.floor(random() * 9999)
                        };
                        chunkGroup.add(doc);
                        if (!this.interactables) this.interactables = [];
                        this.interactables.push(doc);
                        const nBox = new THREE.Box3().setFromObject(doc);
                        nBox.chunkHash = hash;
                        doc.userData.box = nBox;
                        this.spatialGrid.insert(nBox);
                    } else if (contentRoll < 0.9 && this.cartonGeo) {
                        const cartonPool = this.cartonMats || [this.fileBoxMat];
                        const cbx = ox + (random() - 0.5) * 1.4;
                        const cbz = oz + (random() - 0.5) * 1.4;
                        const cbYaw = random() * Math.PI;
                        for (let ci = 0; ci < 1 + Math.floor(random() * 2); ci++) {
                            const fb = new THREE.Mesh(this.cartonGeo, cartonPool[Math.floor(random() * cartonPool.length)]);
                            fb.position.set(cbx + (random() - 0.5) * 0.08, 0.25 + ci * 0.5, cbz + (random() - 0.5) * 0.08);
                            fb.rotation.y = cbYaw + (random() - 0.5) * 0.3;
                            addGeometry(fb);
                        }
                    }
                }
            },
            {
                id: "ATRIUM",
                foundationMat: this.dirtMat,
                build: (x, z, localX, localZ, maze, inDir, outDir) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, inDir, outDir, this.sharedWallMat, "ATRIUM")) {
                        if (this.farVoidMat) {
                            if (!this.fieldPlaneGeo) {
                                this.fieldPlaneGeo = new THREE.PlaneGeometry(this.cellSize + 0.02, 3.0);
                                this.geoCache.set(this.fieldPlaneGeo.uuid, true);
                            }
                            const lEdge = this.chunkSize - 1;
                            const faces = [];
                            if (localX === 0) faces.push([1, 0, Math.PI / 2]);
                            if (localX === lEdge) faces.push([-1, 0, -Math.PI / 2]);
                            if (localZ === 0) faces.push([0, 1, 0]);
                            if (localZ === lEdge) faces.push([0, -1, Math.PI]);
                            for (let fi = 0; fi < faces.length; fi++) {
                                const pane = new THREE.Mesh(this.fieldPlaneGeo, this.farVoidMat);
                                pane.position.set(x * this.cellSize + faces[fi][0] * 2.05, 1.5, z * this.cellSize + faces[fi][1] * 2.05);
                                pane.rotation.y = faces[fi][2];
                                pane.userData.chunkHash = hash;
                                ctx.chunkGroup.add(pane);
                                pane.updateMatrixWorld(true);
                            }
                        }
                        return;
                    }
                    const gx = x * this.cellSize, gz = z * this.cellSize;
                    if (localX === 7 && localZ === 7) {
                        const innerSpan = (this.chunkSize - 2) * this.cellSize;
                        const skyGeo = this._planeGeo(innerSpan, innerSpan);
                        const sky = new THREE.Mesh(skyGeo, this.nightSkyMat);
                        sky.rotation.x = Math.PI / 2;
                        // Sit close over the corn (stalks top out at 4.0, the odd leaning
                        // pole prop at ~4.3) instead of floating a full 2 units above it -
                        // that gap was the visible seam under the "night sky".
                        sky.position.set(gx + 2, 4.6, gz + 2);
                        ctx.chunkGroup.add(sky);
                        const fullSpan = this.chunkSize * this.cellSize;
                        const capNS = this._boxGeo(fullSpan, 0.06, this.cellSize);
                        const capEW = this._boxGeo(this.cellSize, 0.06, innerSpan);
                        for (let s = -1; s <= 1; s += 2) {
                            const capA = new THREE.Mesh(capNS, this.metalMat);
                            capA.position.set(gx + 2, 2.99, gz + 2 + s * (fullSpan / 2 - this.cellSize / 2));
                            addGeometry(capA);
                            const capB = new THREE.Mesh(capEW, this.metalMat);
                            capB.position.set(gx + 2 + s * (fullSpan / 2 - this.cellSize / 2), 2.99, gz + 2);
                            addGeometry(capB);
                        }
                    }
                    const isWall = maze && maze[localX][localZ];
                    if (isWall) {
                        const cornBlock = buildWall(this.cellSize, this.cellSize, this.cornMat, 4.0);
                        cornBlock.position.set(gx, 2.0, gz);
                        cornBlock.userData.isEntityBlocker = true;
                        cornBlock.castShadow = true;
                        cornBlock.receiveShadow = true;
                        addGeometry(cornBlock);
                        if (random() > 0.8) {
                            const pole = new THREE.Mesh(this.vPipeGeo, this.woodMat);
                            pole.scale.set(1.5, 1.2, 1.5);
                            const leanDir = random() * Math.PI * 2;
                            pole.rotation.set(Math.cos(leanDir) * 0.15, 0, Math.sin(leanDir) * 0.15);
                            pole.position.set(gx + (random() - 0.5) * 1.5, 2.5, gz + (random() - 0.5) * 1.5);
                            addGeometry(pole);
                        }
                        return;
                    }
                }
            },
            {
                id: "CHECKPOINT",
                foundationMat: this.tileMat,
                ceilingMat: this.structMat,
                build: (x, z, localX, localZ, maze, inDir, outDir) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, inDir, outDir, this.structMat, "CHECKPOINT")) return;
                    const isPathN = localX === 7 && localZ <= 7;
                    const isPathS = localX === 7 && localZ >= 7;
                    const isPathW = localZ === 7 && localX <= 7;
                    const isPathE = localZ === 7 && localX >= 7;
                    const isPath = isPathN || isPathS || isPathW || isPathE;
                    if (!isPath) {
                        const block = buildWall(this.cellSize, this.cellSize, this.structMat);
                        block.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        block.userData.isEntityBlocker = true;
                        addGeometry(block);
                        return;
                    }
                    if (localX === 7 && localZ === 7) {
                        const spansX = random() > 0.5;
                        const chokeType = Math.floor(random() * 4);
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
                            const frame1 = new THREE.Mesh(this._boxGeo(spansX ? 0.05 : wallThick + 0.02, 3.0, spansX ? wallThick + 0.02 : 0.05), this.woodMat);
                            frame1.position.set(x * this.cellSize + (spansX ? -gapW / 2 - 0.025 : 0), 1.5, z * this.cellSize + (spansX ? 0 : -gapW / 2 - 0.025));
                            addGeometry(frame1);
                            const frame2 = new THREE.Mesh(this._boxGeo(spansX ? 0.05 : wallThick + 0.02, 3.0, spansX ? wallThick + 0.02 : 0.05), this.woodMat);
                            frame2.position.set(x * this.cellSize + (spansX ? gapW / 2 + 0.025 : 0), 1.5, z * this.cellSize + (spansX ? 0 : gapW / 2 + 0.025));
                            addGeometry(frame2);
                        } else if (chokeType === 1 || chokeType === 2) {
                            const gapH = chokeType === 1 ? 0.6 : 1.2;
                            const topH = 3.0 - gapH;
                            const top = buildWall(spansX ? gapW : wallThick, spansX ? wallThick : gapW, this.sharedWallMat, topH, gapH);
                            top.position.set(x * this.cellSize, gapH + (topH / 2), z * this.cellSize);
                            top.userData.isEntityBlocker = true;
                            addGeometry(top);
                            const frameTop = new THREE.Mesh(this._boxGeo(spansX ? gapW : wallThick + 0.02, 0.05, spansX ? wallThick + 0.02 : gapW), this.woodMat);
                            frameTop.position.set(x * this.cellSize, gapH + 0.025, z * this.cellSize);
                            addGeometry(frameTop);
                            const blockBox = new AABB(
                                new Vec3(x * this.cellSize - (spansX ? gapW / 2 : wallThick / 2), 0, z * this.cellSize - (spansX ? wallThick / 2 : gapW / 2)),
                                new Vec3(x * this.cellSize + (spansX ? gapW / 2 : wallThick / 2), 3.0, z * this.cellSize + (spansX ? wallThick / 2 : gapW / 2))
                            );
                            blockBox.isEntityBlocker = true;
                            blockBox.isInvisibleBlocker = true;
                            blockBox.chunkHash = hash;
                            this.spatialGrid.insert(blockBox);
                        } else if (chokeType === 3) {
                            const top = buildWall(spansX ? gapW : wallThick, spansX ? wallThick : gapW, this.structMat, 0.35, 2.65);
                            top.position.set(x * this.cellSize, 2.825, z * this.cellSize);
                            addGeometry(top);
                            const jambL = new THREE.Mesh(this._boxGeo(spansX ? 0.1 : wallThick + 0.05, 2.65, spansX ? wallThick + 0.05 : 0.1), this.woodMat);
                            jambL.position.set(x * this.cellSize + (spansX ? -0.75 : 0), 1.325, z * this.cellSize + (spansX ? 0 : -0.75));
                            addGeometry(jambL);
                            const jambR = new THREE.Mesh(this._boxGeo(spansX ? 0.1 : wallThick + 0.05, 2.65, spansX ? wallThick + 0.05 : 0.1), this.woodMat);
                            jambR.position.set(x * this.cellSize + (spansX ? 0.75 : 0), 1.325, z * this.cellSize + (spansX ? 0 : 0.75));
                            addGeometry(jambR);
                            const jambT = new THREE.Mesh(this._boxGeo(spansX ? 1.6 : wallThick + 0.05, 0.1, spansX ? wallThick + 0.05 : 1.6), this.woodMat);
                            jambT.position.set(x * this.cellSize, 2.70, z * this.cellSize);
                            addGeometry(jambT);
                            const doorW = 1.4;
                            const doorT = 0.1;
                            let doorGeo;
                            let doorMesh;
                            if (spansX) {
                                doorGeo = this._cacheGeo('hingedDoor:X', () => {
                                    const g = new THREE.BoxGeometry(doorW, 2.65, doorT);
                                    g.translate(doorW / 2, 0, doorT / 2);
                                    return g;
                                });
                                doorMesh = new THREE.Mesh(doorGeo, this.doorMat);
                                doorMesh.position.set(x * this.cellSize - doorW / 2, 1.325, z * this.cellSize);
                                doorMesh.userData = {chunkHash: hash, closedRot: 0, currentRot: 0};
                            } else {
                                doorGeo = this._cacheGeo('hingedDoor:Z', () => {
                                    const g = new THREE.BoxGeometry(doorT, 2.65, doorW);
                                    g.translate(doorT / 2, 0, doorW / 2);
                                    return g;
                                });
                                doorMesh = new THREE.Mesh(doorGeo, this.doorMat);
                                doorMesh.position.set(x * this.cellSize, 1.325, z * this.cellSize - doorW / 2);
                                doorMesh.userData = {
                                    chunkHash: hash,
                                    closedRot: -Math.PI / 2,
                                    currentRot: -Math.PI / 2
                                };
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