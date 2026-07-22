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
                        const fCx = Math.sin(this.baseSeed) * 0.8;
                        const fCy = Math.cos(this.baseSeed * 0.5) * 0.8;
                        const probablyOpen = (nx, nz) => {
                            let fzx = nx * 0.15, fzy = nz * 0.15, fiter = 0;
                            let fzx2 = fzx * fzx, fzy2 = fzy * fzy;
                            while (fzx2 + fzy2 < 4 && fiter < 15) {
                                fzy = 2 * fzx * fzy + fCy;
                                fzx = fzx2 - fzy2 + fCx;
                                fzx2 = fzx * fzx;
                                fzy2 = fzy * fzy;
                                fiter++;
                            }
                            return fiter <= 6;
                        };
                        const openFaces = [];
                        if (probablyOpen(x, z + 1)) openFaces.push(0);
                        if (probablyOpen(x, z - 1)) openFaces.push(1);
                        if (probablyOpen(x + 1, z)) openFaces.push(2);
                        if (probablyOpen(x - 1, z)) openFaces.push(3);
                        const ventFace = openFaces.length > 0
                            ? openFaces[Math.floor(random() * openFaces.length)]
                            : face;
                        const ventGeo = this._boxGeo(1.2, 0.6, 0.05);
                        const vent = new THREE.Mesh(ventGeo, this.wallVentMat);
                        const finalOffset = (this.cellSize / 2) + 0.06;
                        if (ventFace === 0) {
                            vent.position.set(x * this.cellSize, 2.6, z * this.cellSize + finalOffset);
                        } else if (ventFace === 1) {
                            vent.position.set(x * this.cellSize, 2.6, z * this.cellSize - finalOffset);
                        } else if (ventFace === 2) {
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
                prob: 0.0235, build: (x, z) => {
                    const cx = x * this.cellSize;
                    const cz = z * this.cellSize;
                    if (!this._globalSwitches) this._globalSwitches = [];
                    if (!this.pointsOfInterest) this.pointsOfInterest = [];
                    let tooClose = false;
                    for (let i = 0; i < this._globalSwitches.length; i++) {
                        const s = this._globalSwitches[i];
                        const distSq = (cx - s.x) * (cx - s.x) + (cz - s.z) * (cz - s.z);
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
                    let poiSeed = (Math.imul(cx | 0, 73856093) ^ Math.imul(cz | 0, 19349663) ^ ctx.runSalt32) >>> 0;
                    const poiRandom = () => {
                        poiSeed = (poiSeed * 1664525 + 1013904223) >>> 0;
                        return poiSeed / 4294967296.0;
                    };
                    if (poiRandom() > 0.7) {
                        const wall = buildWall(this.cellSize, this.cellSize, this.sharedWallMat);
                        wall.position.set(cx, 1.5, cz);
                        wall.userData.isEntityBlocker = true;
                        addGeometry(wall);
                        return;
                    }
                    this._globalSwitches.push({x: cx, z: cz, poi: true});
                    if (ctx.markOccupied) ctx.markOccupied(x, z);
                    const flavor = Math.floor(poiRandom() * 6);
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
                        const tileCount = 4 + Math.floor(poiRandom() * 4);
                        for (let i = 0; i < tileCount; i++) {
                            const tile = new THREE.Mesh(this.fallenTileGeo, this.rottedTileMat);
                            tile.position.set(cx + (poiRandom() - 0.5) * 2.6, 0.03 + poiRandom() * 0.09, cz + (poiRandom() - 0.5) * 2.6);
                            tile.rotation.set((poiRandom() - 0.5) * 0.3, poiRandom() * Math.PI, (poiRandom() - 0.5) * 0.3);
                            addGeometry(tile);
                        }
                        const hole = buildWall(2.2, 2.2, this.ceilingHoleMat, 0.02);
                        hole.position.set(cx, 2.975, cz);
                        addGeometry(hole);
                    } else if (flavor === 1) {
                        const pieces = 2 + Math.floor(poiRandom() * 2);
                        for (let i = 0; i < pieces; i++) {
                            const felled = buildChair(cx + (poiRandom() - 0.5) * 1.8, 0, cz + (poiRandom() - 0.5) * 1.8, poiRandom() * Math.PI * 2);
                            felled.rotation.z = (poiRandom() > 0.5 ? 1 : -1) * Math.PI / 2;
                            felled.position.y = 0.38;
                            addFurniture(felled);
                        }
                        const table = buildTable(cx, 0, cz);
                        table.rotation.x = Math.PI / 2;
                        table.position.y = 0.5;
                        addFurniture(table);
                    } else if (flavor === 2) {
                        if (!this.anomalySeamMat) {
                            this.anomalySeamMat = new THREE.MeshBasicMaterial({color: 0x7744ff});
                            this.sharedAssets.add(this.anomalySeamMat.uuid);
                        }
                        const theta = poiRandom() * Math.PI * 2;
                        const cosT = Math.cos(theta), sinT = Math.sin(theta);
                        const place = (mesh, lx, y, lz) => {
                            mesh.position.set(cx + lx * cosT + lz * sinT, y, cz - lx * sinT + lz * cosT);
                            mesh.rotation.y = theta;
                        };
                        for (let s = -1; s <= 1; s += 2) {
                            const jamb = new THREE.Mesh(this._boxGeo(0.1, 2.72, 0.3), this.woodMat);
                            place(jamb, s * 0.75, 1.36, 0);
                            addGeometry(jamb);
                        }
                        const header = new THREE.Mesh(this._boxGeo(1.6, 0.1, 0.3), this.woodMat);
                        place(header, 0, 2.77, 0);
                        addGeometry(header);
                        const door = new THREE.Mesh(this._boxGeo(1.32, 2.60, 0.1), this.doorMat);
                        place(door, 0, 1.33, 0);
                        addGeometry(door);
                        const glow = new THREE.Mesh(this._boxGeo(1.44, 2.70, 0.03), this.anomalySeamMat);
                        place(glow, 0, 1.35, 0);
                        glow.userData.chunkHash = hash;
                        glow.updateMatrixWorld(true);
                        ctx.stagingMeshes.push(glow);
                        const mold = new THREE.Mesh(this.moldGeo, this.moldMat);
                        mold.position.set(cx, 0.015, cz);
                        mold.rotation.y = poiRandom() * Math.PI * 2;
                        addGeometry(mold);
                    } else if (flavor === 3) {
                        const table = buildTable(cx, 0, cz);
                        table.rotation.x = Math.PI;
                        table.position.y = 2.95;
                        addFurniture(table);
                        for (let s = -1; s <= 1; s += 2) {
                            const chair = buildChair(cx + s * 0.95, 0, cz + (poiRandom() - 0.5) * 0.4, s > 0 ? -Math.PI / 2 : Math.PI / 2);
                            chair.rotation.x = Math.PI;
                            chair.position.y = 2.95;
                            addFurniture(chair);
                        }
                    } else if (flavor === 4) {
                        const activeMat = ctx.getLightMaterial(0xfff2cc, 0xffe9b0, false);
                        const panel = new THREE.Mesh(this.sharedPanelGeo,
                            [this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat, this.baseHousingMat]);
                        panel.position.set(cx, 0.055, cz);
                        panel.rotation.y = poiRandom() > 0.5 ? Math.PI / 2 : 0;
                        chunkGroup.add(panel);
                        this.walls.push(panel);
                        this.fixtureData.push({
                            chunkHash: hash,
                            position: new THREE.Vector3(cx, 0.4, cz),
                            flickerOffset: poiRandom() * 10.0,
                            material: activeMat,
                            isFaulty: poiRandom() > 0.6,
                            baseIntensity: 0.85,
                            targetIntensity: 0.85,
                            currentIntensity: 0.85
                        });
                    } else {
                        const seats = 5 + Math.floor(poiRandom() * 3);
                        const ringR = 1.25 + poiRandom() * 0.3;
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
                build: (x, z, localX, localZ) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, this.structMat, "EXIT")) return;
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
                build: (x, z, localX, localZ, maze) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, this.impoundWallMat || this.sharedWallMat, "IMPOUND")) return;
                    const px = x * this.cellSize, pz = z * this.cellSize;
                    const isWall = maze && maze[localX][localZ];
                    if (isWall) {
                        const FENCE_H = 1.8, FENCE_SCALE = FENCE_H / 3.0;
                        if (!this.fenceGeoX) {
                            this.fenceGeoX = new THREE.BoxGeometry(this.cellSize, FENCE_H, 0.05);
                            this.geoCache.set(this.fenceGeoX.uuid, true);
                            this.fenceGeoZ = new THREE.BoxGeometry(0.05, FENCE_H, this.cellSize);
                            this.geoCache.set(this.fenceGeoZ.uuid, true);
                        }
                        const mwWall = (dx, dz) => {
                            const nx = localX + dx, nz = localZ + dz;
                            return nx >= 0 && nx < this.chunkSize && nz >= 0 && nz < this.chunkSize && maze && maze[nx][nz];
                        };
                        const cPillar = new THREE.Mesh(this.vPipeGeo, this.rustMat);
                        cPillar.scale.set(1, FENCE_SCALE, 1);
                        cPillar.position.set(px + (this.cellSize / 2), FENCE_H / 2, pz + (this.cellSize / 2));
                        addGeometry(cPillar);
                        if (!mwWall(-1, 0)) {
                            const endPillar = new THREE.Mesh(this.vPipeGeo, this.rustMat);
                            endPillar.scale.set(1, FENCE_SCALE, 1);
                            endPillar.position.set(px - (this.cellSize / 2), FENCE_H / 2, pz + (this.cellSize / 2));
                            addGeometry(endPillar);
                        }
                        if (!mwWall(0, -1)) {
                            const endPillar = new THREE.Mesh(this.vPipeGeo, this.rustMat);
                            endPillar.scale.set(1, FENCE_SCALE, 1);
                            endPillar.position.set(px + (this.cellSize / 2), FENCE_H / 2, pz - (this.cellSize / 2));
                            addGeometry(endPillar);
                        }
                        const buildFenceRun = (alongX) => {
                            const fx = px + (alongX ? 0 : this.cellSize / 2);
                            const fz = pz + (alongX ? this.cellSize / 2 : 0);
                            if (random() > 0.85) {
                                for (let s = -1; s <= 1; s += 2) {
                                    const stub = new THREE.Mesh(this._boxGeo(alongX ? 1.3 : 0.05, FENCE_H, alongX ? 0.05 : 1.3), this.fenceMat);
                                    stub.position.set(fx + (alongX ? s * 1.35 : 0), FENCE_H / 2, fz + (alongX ? 0 : s * 1.35));
                                    addGeometry(stub);
                                    const gatePost = new THREE.Mesh(this.vPipeGeo, this.metalMat);
                                    gatePost.scale.set(0.7, 0.75 * FENCE_SCALE, 0.7);
                                    gatePost.position.set(fx + (alongX ? s * 0.7 : 0), 1.12 * FENCE_SCALE, fz + (alongX ? 0 : s * 0.7));
                                    addGeometry(gatePost);
                                }
                                const gateGeo = this._cacheGeo(`impGate:${alongX ? 'X' : 'Z'}`, () => {
                                    const g = new THREE.BoxGeometry(alongX ? 1.4 : 0.05, 2.2 * FENCE_SCALE, alongX ? 0.05 : 1.4);
                                    g.translate(alongX ? 0.7 : 0, 0, alongX ? 0 : 0.7);
                                    return g;
                                });
                                const gate = new THREE.Mesh(gateGeo, this.fenceMat);
                                gate.position.set(fx - (alongX ? 0.7 : 0), 1.15 * FENCE_SCALE, fz - (alongX ? 0 : 0.7));
                                gate.rotation.y = (random() > 0.5 ? 1 : -1) * (0.3 + random() * 1.0);
                                gate.userData.chunkHash = hash;
                                gate.updateMatrixWorld(true);
                                stagingMeshes.push(gate);
                            } else {
                                const fence = new THREE.Mesh(alongX ? this.fenceGeoX : this.fenceGeoZ, this.fenceMat);
                                fence.position.set(fx, FENCE_H / 2, fz);
                                if (random() > (alongX ? 0.1 : 0.2)) fence.userData.isEntityBlocker = true;
                                addGeometry(fence);
                                const rail = new THREE.Mesh(this._boxGeo(alongX ? this.cellSize : 0.07, 0.07, alongX ? 0.07 : this.cellSize), this.rustMat);
                                rail.position.set(fx, FENCE_H - 0.04, fz);
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
                        let placedBig = false;
                        if (pocketWalls >= 1 && random() > 0.58) {
                            const pick = random();
                            const kind = pick < 0.46 ? 'car' : (pick < 0.74 ? 'machine' : 'tires');
                            placedBig = this._buildImpoundItem(px, pz, kind, {addFurniture, chunkGroup, hash, random});
                        }
                        if (!placedBig && pocketWalls >= 2 && random() > 0.7) {
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
                build: (x, z, localX, localZ, maze) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, this.sharedWallMat, "CLINIC")) return;
                    const cx0 = x * this.cellSize, cz0 = z * this.cellSize;
                    const wallAt = (lx, lz) => (lx < 0 || lx > 15 || lz < 0 || lz > 15) ? true : (maze ? maze[lx][lz] === true : false);
                    const decal = (mesh) => {
                        mesh.userData.chunkHash = hash;
                        mesh.updateMatrixWorld(true);
                        stagingMeshes.push(mesh);
                    };
                    const hangCurtain = (alongZ, px, pz, width) => {
                        const track = new THREE.Mesh(this._boxGeo(alongZ ? 0.06 : width, 0.08, alongZ ? width : 0.06), this.metalMat);
                        track.position.set(px, 2.52, pz);
                        decal(track);
                        const curtain = new THREE.Mesh(this._boxGeo(alongZ ? 0.05 : width - 0.2, 2.2, alongZ ? width - 0.2 : 0.05), this.fabricMat);
                        curtain.position.set(px, 1.36, pz);
                        curtain.rotation.y = (random() - 0.5) * 0.06;
                        decal(curtain);
                    };
                    const ivPole = (px, pz) => {
                        const pole = new THREE.Mesh(this._boxGeo(0.08, 2.0, 0.08), this.rustMat);
                        pole.position.set(px, 1.0, pz);
                        addGeometry(pole);
                    };
                    if (maze && maze[localX][localZ]) {
                        const zRun = wallAt(localX, localZ - 1) || wallAt(localX, localZ + 1);
                        const xRun = wallAt(localX - 1, localZ) || wallAt(localX + 1, localZ);
                        const alongZ = zRun && !xRun ? true : (xRun && !zRun ? false : ((localX + localZ) % 2 === 0));
                        const openDirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx2, dz2]) => !wallAt(localX + dx2, localZ + dz2));
                        const roll = random();
                        if (roll < 0.14 && openDirs.length > 0) {
                            const [odx, odz] = openDirs[Math.floor(random() * openDirs.length)];
                            const back = buildWall(odx !== 0 ? 0.3 : this.cellSize, odx !== 0 ? this.cellSize : 0.3, this.sharedWallMat, 3.0);
                            back.position.set(cx0 - odx * 1.85, 1.5, cz0 - odz * 1.85);
                            addGeometry(back);
                            for (let s = -1; s <= 1; s += 2) {
                                const sw = buildWall(odx !== 0 ? 3.7 : 0.3, odx !== 0 ? 0.3 : 3.7, this.sharedWallMat, 3.0);
                                sw.position.set(cx0 + (odx !== 0 ? -odx * 0.15 : s * 1.85), 1.5, cz0 + (odx !== 0 ? s * 1.85 : -odz * 0.15));
                                addGeometry(sw);
                            }
                            const cot = new THREE.Group();
                            const cotFrame = new THREE.Mesh(this._boxGeo(1.0, 0.5, 2.0), this.structMat);
                            cotFrame.position.y = 0.25;
                            const mattress = new THREE.Mesh(this._boxGeo(0.9, 0.15, 1.9), this.fabricMat);
                            mattress.position.y = 0.575;
                            cot.add(cotFrame, mattress);
                            if (odx !== 0) cot.rotation.y = Math.PI / 2;
                            cot.position.set(cx0 - odx * 0.55, 0, cz0 - odz * 0.55);
                            addFurniture(cot);
                            ivPole(cx0 + (odz !== 0 ? 1.3 : -odx * 0.2), cz0 + (odx !== 0 ? 1.3 : -odz * 0.2));
                            hangCurtain(odx !== 0, cx0 + odx * 1.6, cz0 + odz * 1.6, 3.6);
                        } else if (roll < 0.27) {
                            hangCurtain(alongZ, cx0, cz0, this.cellSize);
                            if (random() > 0.6) {
                                hangCurtain(alongZ, cx0 + (alongZ ? 0.7 : 0), cz0 + (alongZ ? 0 : 0.7), this.cellSize);
                            }
                        } else if (roll < 0.38) {
                            const segLen = 1.8;
                            for (let s = -1; s <= 1; s += 2) {
                                const seg = buildWall(alongZ ? 1.2 : segLen, alongZ ? segLen : 1.2, this.sharedWallMat, 3.0);
                                seg.position.set(cx0 + (alongZ ? 0 : s * 1.1), 1.5, cz0 + (alongZ ? s * 1.1 : 0));
                                addGeometry(seg);
                            }
                        } else {
                            const wall = buildWall(this.cellSize, this.cellSize, this.sharedWallMat, 3.0);
                            wall.position.set(cx0, 1.5, cz0);
                            addGeometry(wall);
                            for (const [dx2, dz2] of openDirs) {
                                const rail = new THREE.Mesh(this._boxGeo(dz2 !== 0 ? 3.9 : 0.07, 0.14, dz2 !== 0 ? 0.07 : 3.9), this.rustMat);
                                rail.position.set(cx0 + dx2 * 2.06, 0.95, cz0 + dz2 * 2.06);
                                decal(rail);
                            }
                        }
                        return;
                    }
                    const gateApproach = (localX === 7 && (localZ <= 2 || localZ >= 13)) || (localZ === 7 && (localX <= 2 || localX >= 13));
                    const corrX = !wallAt(localX - 1, localZ) || !wallAt(localX + 1, localZ);
                    const obRoll = gateApproach ? 1.0 : random();
                    const isCollapse = obRoll >= 0.12 && obRoll < 0.20;
                    if (!isCollapse && (localX + localZ) % 2 === 0 && random() > 0.5) {
                        const activeMat = ctx.getLightMaterial(0xd0e8ff, 0xa0d0ff, false);
                        const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                        panel.position.set(cx0, 2.98, cz0);
                        chunkGroup.add(panel);
                        this.walls.push(panel);
                        this.fixtureData.push({
                            chunkHash: hash,
                            position: new THREE.Vector3(cx0, 2.8, cz0),
                            flickerOffset: random() * 500,
                            material: activeMat,
                            isFaulty: random() > 0.6,
                            baseIntensity: 0.5,
                            targetIntensity: 0.5,
                            currentIntensity: 0.5
                        });
                    }
                    if (gateApproach) return;
                    if (obRoll < 0.12) {
                        const gurney = new THREE.Group();
                        const bed = new THREE.Mesh(this._boxGeo(1.0, 0.12, 2.0), this.structMat);
                        bed.position.y = 0.75;
                        const gMat = new THREE.Mesh(this._boxGeo(0.95, 0.12, 1.9), this.fabricMat);
                        gMat.position.y = 0.87;
                        gurney.add(bed, gMat);
                        for (let e = -1; e <= 1; e += 2) {
                            const legs = new THREE.Mesh(this._boxGeo(0.9, 0.75, 0.06), this.metalMat);
                            legs.position.set(0, 0.375, e * 0.85);
                            gurney.add(legs);
                        }
                        gurney.rotation.y = (corrX ? 0 : Math.PI / 2) + (random() - 0.5) * 0.9;
                        gurney.position.set(cx0 + (random() - 0.5) * 1.2, 0, cz0 + (random() - 0.5) * 1.2);
                        addFurniture(gurney);
                        if (random() > 0.5) ivPole(cx0 + (random() - 0.5) * 2.5, cz0 + (random() - 0.5) * 2.5);
                    } else if (isCollapse) {
                        const travelX = corrX;
                        const depth = 2.6;
                        const massW = travelX ? depth : this.cellSize;
                        const massD = travelX ? this.cellSize : depth;
                        const belly = 1.22;
                        const massH = 3.0 - belly;
                        const body = buildWall(massW, massD, this.structMat, massH);
                        body.position.set(cx0, belly + massH / 2, cz0);
                        addGeometry(body);
                        const skin = new THREE.Mesh(this._boxGeo(massW - 0.1, 0.06, massD - 0.1), this.ceilMat);
                        skin.position.set(cx0, belly + 0.04, cz0);
                        decal(skin);
                        const side = random() > 0.5 ? 1 : -1;
                        const chunk = new THREE.Mesh(this._boxGeo(travelX ? depth * 0.5 : 1.5, 0.5, travelX ? 1.5 : depth * 0.5), this.structMat);
                        chunk.position.set(cx0 + (travelX ? 0 : side * 1.0), belly + 0.5, cz0 + (travelX ? side * 1.0 : 0));
                        chunk.rotation.set(travelX ? 0 : side * 0.24, 0, travelX ? -side * 0.24 : 0);
                        decal(chunk);
                        if (!this.collapseRebarGeo) {
                            this.collapseRebarGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 5);
                            this.geoCache.set(this.collapseRebarGeo.uuid, true);
                        }
                        for (let i = 0; i < 4; i++) {
                            const bar = new THREE.Mesh(this.collapseRebarGeo, this.rustMat);
                            const t = (i / 3 - 0.5) * (this.cellSize - 1.4);
                            bar.position.set(cx0 + (travelX ? depth * 0.42 : t), belly + 0.42, cz0 + (travelX ? t : depth * 0.42));
                            bar.rotation.set((random() - 0.5) * 0.3, random() * Math.PI, Math.PI / 2 + (random() - 0.5) * 0.3);
                            decal(bar);
                        }
                        const duct = new THREE.Mesh(this._boxGeo(0.5, 0.85, 0.5), this.metalMat);
                        duct.position.set(cx0 + (random() - 0.5) * 1.2, belly + 0.6, cz0 + (random() - 0.5) * 1.2);
                        duct.rotation.set((random() - 0.5) * 0.3, random() * Math.PI, (random() - 0.5) * 0.3);
                        decal(duct);
                        if (!this.fallenTileGeo) {
                            this.fallenTileGeo = new THREE.BoxGeometry(0.9, 0.04, 0.9);
                            this.geoCache.set(this.fallenTileGeo.uuid, true);
                        }
                        const tileCount = 2 + Math.floor(random() * 3);
                        for (let i = 0; i < tileCount; i++) {
                            const tile = new THREE.Mesh(this.fallenTileGeo, this.ceilMat);
                            tile.position.set(cx0 + (random() - 0.5) * 2.8, 0.03 + random() * 0.06, cz0 + (random() - 0.5) * 2.8);
                            tile.rotation.set((random() - 0.5) * 0.25, random() * Math.PI, (random() - 0.5) * 0.25);
                            decal(tile);
                        }
                        const strut = new THREE.Mesh(this._boxGeo(0.08, 0.85, 0.08), this.rustMat);
                        strut.position.set(cx0 + (random() - 0.5) * 2.0, 1.65, cz0 + (random() - 0.5) * 2.0);
                        strut.rotation.z = (random() - 0.5) * 0.5;
                        decal(strut);
                    } else if (obRoll < 0.32) {
                        for (let s = -1; s <= 1; s += 2) {
                            const screen = new THREE.Mesh(this._boxGeo(corrX ? 0.1 : 2.6, 2.4, corrX ? 2.6 : 0.1), this.fabricMat);
                            screen.position.set(
                                cx0 + (corrX ? s * 0.9 : s * 1.0),
                                1.2,
                                cz0 + (corrX ? s * 1.0 : s * 0.9)
                            );
                            screen.rotation.y = (random() - 0.5) * 0.5;
                            addGeometry(screen);
                        }
                    } else if (obRoll < 0.42) {
                        const chairCount = 1 + Math.floor(random() * 2);
                        for (let i = 0; i < chairCount; i++) {
                            addFurniture(buildChair(cx0 + (random() - 0.5) * 2.2, 0, cz0 + (random() - 0.5) * 2.2, random() * Math.PI * 2));
                        }
                        if (random() > 0.5) {
                            if (!this.cartonGeo) {
                                this.cartonGeo = new THREE.BoxGeometry(0.6, 0.5, 0.6);
                                this.geoCache.set(this.cartonGeo.uuid, true);
                            }
                            const cartonPool = this.cartonMats || [this.fileBoxMat];
                            const mBox = new THREE.Mesh(this.cartonGeo, cartonPool[Math.floor(random() * cartonPool.length)]);
                            mBox.rotation.y = random() * Math.PI;
                            mBox.position.set(cx0 + (random() - 0.5) * 2.0, 0.25, cz0 + (random() - 0.5) * 2.0);
                            addGeometry(mBox);
                        }
                    } else if (obRoll < 0.50) {
                        const mold = new THREE.Mesh(this.moldGeo, this.moldMat);
                        mold.position.set(cx0 + (random() - 0.5) * 1.5, 0.015, cz0 + (random() - 0.5) * 1.5);
                        mold.rotation.y = random() * Math.PI * 2;
                        decal(mold);
                    }
                }
            },
            {
                id: "BOARDROOM",
                foundationMat: this.boardTileMat || this.tileMat,
                ceilingMat: this.clinicMat,
                build: (x, z, localX, localZ) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, this.sharedWallMat, "BOARDROOM")) return;
                    const bx = x * this.cellSize, bz = z * this.cellSize;
                    const glass = this.glassMat || this.fabricMat;
                    const isC = (v) => v === 3 || v === 7 || v === 11;
                    const last = this.chunkSize - 2;
                    const cellHash = (gx, gz) => {
                        const h = Math.sin(gx * 127.1 + gz * 311.7 + (this.baseSeed % 4096) * 0.618) * 43758.5453;
                        return h - Math.floor(h);
                    };
                    const isBowl = (gx, gz, lx, lz) =>
                        lx >= 1 && lx <= last && lz >= 1 && lz <= last &&
                        !isC(lx) && !isC(lz) && cellHash(gx, gz) < 0.10;
                    const ceilingPanel = (px, pz) => {
                        const activeMat = ctx.getLightMaterial(0xe8f2ff, 0xd8e8ff, false);
                        const panel = new THREE.Mesh(this.sharedPanelGeo, [this.baseHousingMat, this.baseHousingMat, this.baseHousingMat, activeMat, this.baseHousingMat, this.baseHousingMat]);
                        panel.position.set(px, 2.98, pz);
                        chunkGroup.add(panel);
                        this.walls.push(panel);
                        this.fixtureData.push({
                            chunkHash: hash,
                            position: new THREE.Vector3(px, 2.8, pz),
                            flickerOffset: random() * 500,
                            material: activeMat,
                            isFaulty: random() > 0.9,
                            baseIntensity: 0.65,
                            targetIntensity: 0.65,
                            currentIntensity: 0.65
                        });
                    };
                    if (isC(localX) || isC(localZ)) {
                        const junction = isC(localX) && isC(localZ);
                        if (!junction && (localX + localZ) % 2 === 0 && random() > 0.30) {
                            ceilingPanel(bx, bz);
                        } else if (junction && random() > 0.5) {
                            ceilingPanel(bx, bz);
                        }
                        return;
                    }
                    const bowlHere = isBowl(x, z, localX, localZ);
                    const post = (px, pz, thick = 0.15) => {
                        const p = buildWall(thick, thick, this.metalMat, 3.0);
                        p.position.set(px, 1.5, pz);
                        addGeometry(p);
                    };
                    const pane = (alongX, px, pz, len) => {
                        if (len < 0.2) return;
                        const g = buildWall(alongX ? len : 0.06, alongX ? 0.06 : len, glass, 2.6);
                        g.position.set(px, 1.42, pz);
                        addGeometry(g);
                    };
                    const rails = (alongX, px, pz, len) => {
                        const sill = buildWall(alongX ? len : 0.15, alongX ? 0.15 : len, this.metalMat, 0.12);
                        sill.position.set(px, 0.06, pz);
                        addGeometry(sill);
                        const head = buildWall(alongX ? len : 0.15, alongX ? 0.15 : len, this.metalMat, 0.3);
                        head.position.set(px, 2.83, pz);
                        addGeometry(head);
                    };
                    const hangDoor = (alongX, hx, hz, closedRot) => {
                        const doorGeo = this._cacheGeo('vestibuleDoor', () => {
                            const g = new THREE.BoxGeometry(1.0, 2.55, 0.07);
                            g.translate(0.5, 0, 0);
                            return g;
                        });
                        const door = new THREE.Mesh(doorGeo, glass);
                        door.position.set(hx, 1.315, hz);
                        door.rotation.y = closedRot;
                        door.castShadow = door.receiveShadow = true;
                        door.userData = {chunkHash: hash, closedRot: closedRot, currentRot: closedRot};
                        chunkGroup.add(door);
                        this.interactiveDoors.push(door);
                        this.walls.push(door);
                        door.updateMatrixWorld();
                        const dBox = new THREE.Box3().setFromObject(door);
                        dBox.chunkHash = hash;
                        door.userData.box = dBox;
                        this.spatialGrid.insert(dBox);
                    };
                    const glassFace = (alongX, faceC, latC, len, withDoor) => {
                        const half = len / 2;
                        if (alongX) {
                            rails(true, latC, faceC, len);
                            post(latC - half + 0.075, faceC);
                            post(latC + half - 0.075, faceC);
                            if (withDoor) {
                                const dl = bx - 0.55, dr = bx + 0.55;
                                const lStart = latC - half + 0.15;
                                const rEnd = latC + half - 0.15;
                                pane(true, (lStart + dl) / 2, faceC, dl - lStart);
                                pane(true, (dr + rEnd) / 2, faceC, rEnd - dr);
                                post(dl, faceC, 0.1);
                                post(dr, faceC, 0.1);
                                hangDoor(true, bx - 0.5, faceC, 0);
                            } else {
                                pane(true, latC, faceC, len - 0.3);
                                post(latC, faceC, 0.1);
                            }
                        } else {
                            rails(false, faceC, latC, len);
                            post(faceC, latC - half + 0.075);
                            post(faceC, latC + half - 0.075);
                            if (withDoor) {
                                const dl = bz - 0.55, dr = bz + 0.55;
                                const lStart = latC - half + 0.15;
                                const rEnd = latC + half - 0.15;
                                pane(false, faceC, (lStart + dl) / 2, dl - lStart);
                                pane(false, faceC, (dr + rEnd) / 2, rEnd - dr);
                                post(faceC, dl, 0.1);
                                post(faceC, dr, 0.1);
                                hangDoor(false, faceC, bz + 0.5, Math.PI / 2);
                            } else {
                                pane(false, faceC, latC, len - 0.3);
                                post(faceC, latC, 0.1);
                            }
                        }
                    };
                    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
                    const inSuite = (lx, lz) => lx >= 1 && lx <= last && lz >= 1 && lz <= last && !isC(lx) && !isC(lz);
                    const corridorFaces = (lx, lz) => dirs.filter(([ddx, ddz]) => {
                        const nx = lx + ddx, nz = lz + ddz;
                        return nx >= 1 && nx <= last && nz >= 1 && nz <= last && (isC(nx) || isC(nz));
                    });
                    const hasOwnDoor = (gx, gz, lx, lz) =>
                        corridorFaces(lx, lz).length > 0 && !isBowl(gx, gz, lx, lz) && cellHash(gx + 31, gz + 17) < 0.35;
                    const egress = (gx, gz, lx, lz) => {
                        const cf = corridorFaces(lx, lz);
                        if (cf.length) {
                            if (cellHash(gx + 31, gz + 17) < 0.35) {
                                return {door: cf[Math.floor(cellHash(gx + 7, gz + 13) * cf.length)]};
                            }
                            const dn = dirs.filter(([ddx, ddz]) => {
                                const nx = lx + ddx, nz = lz + ddz;
                                return inSuite(nx, nz) && hasOwnDoor(gx + ddx, gz + ddz, nx, nz);
                            });
                            if (dn.length) return {open: dn[Math.floor(cellHash(gx + 7, gz + 13) * dn.length)]};
                            return {door: cf[Math.floor(cellHash(gx + 7, gz + 13) * cf.length)]};
                        }
                        const bf = dirs.filter(([ddx, ddz]) => {
                            const nx = lx + ddx, nz = lz + ddz;
                            return inSuite(nx, nz) && corridorFaces(nx, nz).length > 0 && !isBowl(gx + ddx, gz + ddz, nx, nz);
                        });
                        if (!bf.length) return {};
                        return {open: bf[Math.floor(cellHash(gx + 7, gz + 13) * bf.length)]};
                    };
                    const myEgress = bowlHere ? {} : egress(x, z, localX, localZ);
                    for (let d = 0; d < 4; d++) {
                        const dx = dirs[d][0], dz = dirs[d][1];
                        const nlx = localX + dx, nlz = localZ + dz;
                        if (nlx < 1 || nlx > last || nlz < 1 || nlz > last) continue;
                        const alongX = dz !== 0;
                        const negLat = alongX ? localX - 1 : localZ - 1;
                        const posLat = alongX ? localX + 1 : localZ + 1;
                        const extNeg = (negLat >= 1 && isC(negLat)) ? 0.8 : 0;
                        const extPos = (posLat <= last && isC(posLat)) ? 0.8 : 0;
                        if (isC(nlx) || isC(nlz)) {
                            const faceC = alongX ? bz + dz * 2.8 : bx + dx * 2.8;
                            const len = this.cellSize + extNeg + extPos;
                            const latC = (alongX ? bx : bz) + (extPos - extNeg) / 2;
                            for (let e = -1; e <= 1; e += 2) {
                                const latEdge = (e < 0 ? negLat : posLat);
                                if (latEdge >= 1 && latEdge <= last) continue;
                                const retLat = (alongX ? bx : bz) + e * 2;
                                const retFace = (alongX ? bz : bx) + (alongX ? dz : dx) * 2.4;
                                const ret = buildWall(alongX ? 0.2 : 0.8, alongX ? 0.8 : 0.2, this.sharedWallMat, 3.0);
                                ret.position.set(alongX ? retLat : retFace, 1.5, alongX ? retFace : retLat);
                                addGeometry(ret);
                            }
                            const isDoorFace = myEgress.door && myEgress.door[0] === dx && myEgress.door[1] === dz;
                            if (bowlHere) {
                                glassFace(alongX, faceC, latC, len, false);
                            } else if (isDoorFace) {
                                glassFace(alongX, faceC, latC, len, true);
                            } else if (random() < 0.18) {
                                glassFace(alongX, faceC, latC, len, false);
                            } else {
                                const wall = buildWall(alongX ? len : 0.2, alongX ? 0.2 : len, this.sharedWallMat, 3.0);
                                wall.position.set(alongX ? latC : faceC, 1.5, alongX ? faceC : latC);
                                addGeometry(wall);
                            }
                        } else if (dx === 1 || dz === 1) {
                            const faceC = alongX ? bz + 2 : bx + 2;
                            const len = this.cellSize + extNeg + extPos;
                            const latC = (alongX ? bx : bz) + (extPos - extNeg) / 2;
                            const neighborBowl = isBowl(x + dx, z + dz, nlx, nlz);
                            if (bowlHere || neighborBowl) {
                                glassFace(alongX, faceC, latC, len, false);
                            } else {
                                const nbEgress = egress(x + dx, z + dz, nlx, nlz);
                                const forcedOpen =
                                    (myEgress.open && myEgress.open[0] === dx && myEgress.open[1] === dz) ||
                                    (nbEgress.open && nbEgress.open[0] === -dx && nbEgress.open[1] === -dz);
                                const roll = random();
                                if (forcedOpen || roll < 0.35) {
                                } else if (roll < 0.78) {
                                    glassFace(alongX, faceC, latC, len, false);
                                } else {
                                    const wall = buildWall(alongX ? len : 0.15, alongX ? 0.15 : len, this.sharedWallMat, 3.0);
                                    wall.position.set(alongX ? latC : faceC, 1.5, alongX ? faceC : latC);
                                    addGeometry(wall);
                                }
                            }
                        }
                    }
                    if (inSuite(localX + 1, localZ) && inSuite(localX, localZ + 1) && inSuite(localX + 1, localZ + 1)) {
                        post(bx + 2, bz + 2, 0.24);
                    }
                    if (bowlHere) {
                        if (random() > 0.45) {
                            addFurniture(buildChair(bx + (random() - 0.5) * 1.2, 0, bz + (random() - 0.5) * 1.2, random() * Math.PI * 2));
                        } else {
                            const crtGroup = new THREE.Group();
                            const body = new THREE.Mesh(this.terminalBodyGeo, this.baseHousingMat);
                            const screen = new THREE.Mesh(this._boxGeo(0.45, 0.35, 0.05), this.baseHousingMat);
                            screen.position.set(0, 0, 0.26);
                            crtGroup.add(body, screen);
                            crtGroup.position.set(bx, 0.28, bz);
                            crtGroup.rotation.y = random() * Math.PI * 2;
                            addFurniture(crtGroup);
                        }
                        if (random() > 0.6) ceilingPanel(bx, bz);
                        return;
                    }
                    const dress = random();
                    if (dress < 0.45) {
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
                        confTable.position.set(bx, 0, bz);
                        addFurniture(confTable);
                        const sideOff = 1.15;
                        for (let sc = -1; sc <= 1; sc += 2) {
                            for (let sp = -1; sp <= 1; sp += 2) {
                                if (random() > 0.25) {
                                    const cxp = bx + (longX ? sp * 0.9 : sc * sideOff);
                                    const czp = bz + (longX ? sc * sideOff : sp * 0.9);
                                    const face = longX
                                        ? (sc > 0 ? Math.PI : 0)
                                        : (sc > 0 ? -Math.PI / 2 : Math.PI / 2);
                                    addFurniture(buildChair(cxp, 0, czp, face));
                                }
                            }
                        }
                        if (random() > 0.55) {
                            const crtGroup = new THREE.Group();
                            const body = new THREE.Mesh(this.terminalBodyGeo, this.baseHousingMat);
                            body.position.set(0, 0.2, 0);
                            const screen = new THREE.Mesh(this._boxGeo(0.45, 0.35, 0.05), this.crtScreenMat);
                            screen.position.set(0, 0.2, 0.26);
                            crtGroup.add(body, screen);
                            crtGroup.position.set(bx, 0.825, bz);
                            crtGroup.rotation.y = random() * Math.PI * 2;
                            chunkGroup.add(crtGroup);
                            crtGroup.updateMatrixWorld(true);
                            body.userData.chunkHash = hash;
                            screen.userData.chunkHash = hash;
                            stagingMeshes.push(body, screen);
                        }
                    } else if (dress < 0.57) {
                        const felled = buildChair(bx + (random() - 0.5) * 2.0, 0, bz + (random() - 0.5) * 2.0, random() * Math.PI * 2);
                        felled.rotation.z = (random() > 0.5 ? 1 : -1) * Math.PI / 2;
                        felled.position.y = 0.38;
                        addFurniture(felled);
                    }
                    if (random() > 0.62) ceilingPanel(bx, bz);
                }
            },
            {
                id: "ARCHIVE",
                foundationMat: this.structMat,
                ceilingMat: this.structMat,
                build: (x, z, localX, localZ, maze) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, this.structMat, "ARCHIVE")) return;
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
                                sheet.position.set(acx + (random() - 0.5) * 2.6, 0.035, acz + (random() - 0.5) * 2.6);
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
                build: (x, z, localX, localZ, maze) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, this.sharedWallMat, "SERVER")) return;
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
                build: (x, z, localX, localZ, maze) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, this.structMat, "MAINTENANCE")) return;
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
                build: (x, z, localX, localZ, maze) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, this.sharedWallMat, "CHASM")) return;
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
                        const vW = checkVoid(localX - 1, localZ);
                        const vE = checkVoid(localX + 1, localZ);
                        const vN = checkVoid(localX, localZ - 1);
                        const vS = checkVoid(localX, localZ + 1);
                        if (vW) {
                            const extN = !vN, extS = !vS;
                            const len = this.cellSize + (extN ? 0.2 : 0) + (extS ? 0.2 : 0);
                            const cz = (extS ? 0.1 : 0) - (extN ? 0.1 : 0);
                            const railing = buildWall(0.15, len, this.rustMat, 1.2);
                            railing.position.set(gx - 1.8, 0.6, gz + cz);
                            addGeometry(railing);
                        }
                        if (vE) {
                            const extN = !vN, extS = !vS;
                            const len = this.cellSize + (extN ? 0.2 : 0) + (extS ? 0.2 : 0);
                            const cz = (extS ? 0.1 : 0) - (extN ? 0.1 : 0);
                            const railing = buildWall(0.15, len, this.rustMat, 1.2);
                            railing.position.set(gx + 1.8, 0.6, gz + cz);
                            addGeometry(railing);
                        }
                        if (vN) {
                            const extW = !vW, extE = !vE;
                            const len = this.cellSize + (extW ? 0.2 : 0) + (extE ? 0.2 : 0);
                            const cx = (extE ? 0.1 : 0) - (extW ? 0.1 : 0);
                            const railing = buildWall(len, 0.15, this.rustMat, 1.2);
                            railing.position.set(gx + cx, 0.6, gz - 1.8);
                            addGeometry(railing);
                        }
                        if (vS) {
                            const extW = !vW, extE = !vE;
                            const len = this.cellSize + (extW ? 0.2 : 0) + (extE ? 0.2 : 0);
                            const cx = (extE ? 0.1 : 0) - (extW ? 0.1 : 0);
                            const railing = buildWall(len, 0.15, this.rustMat, 1.2);
                            railing.position.set(gx + cx, 0.6, gz + 1.8);
                            addGeometry(railing);
                        }
                        const addCornerPost = (px, pz) => {
                            const post = buildWall(0.3, 0.3, this.rustMat, 1.2);
                            post.position.set(px, 0.6, pz);
                            addGeometry(post);
                        };
                        if (vW && vN) addCornerPost(gx - 1.8, gz - 1.8);
                        if (vE && vN) addCornerPost(gx + 1.8, gz - 1.8);
                        if (vW && vS) addCornerPost(gx - 1.8, gz + 1.8);
                        if (vE && vS) addCornerPost(gx + 1.8, gz + 1.8);
                        if (!vW && !vN && checkVoid(localX - 1, localZ - 1)) addCornerPost(gx - 1.8, gz - 1.8);
                        if (!vE && !vN && checkVoid(localX + 1, localZ - 1)) addCornerPost(gx + 1.8, gz - 1.8);
                        if (!vW && !vS && checkVoid(localX - 1, localZ + 1)) addCornerPost(gx - 1.8, gz + 1.8);
                        if (!vE && !vS && checkVoid(localX + 1, localZ + 1)) addCornerPost(gx + 1.8, gz + 1.8);
                        if (random() > 0.78) {
                            const lampMat = this.baseLightMat.clone();
                            lampMat.color.setHex(0xff2200);
                            lampMat.emissive.setHex(0xff0000);
                            const edge = 1.7;
                            let ex = checkVoid(localX - 1, localZ) ? -edge : (checkVoid(localX + 1, localZ) ? edge : 0);
                            let ez = 0;
                            if (ex === 0) ez = checkVoid(localX, localZ - 1) ? -edge : (checkVoid(localX, localZ + 1) ? edge : 0);
                            const post = buildWall(0.12, 0.12, this.rustMat, 0.5);
                            post.position.set(gx + ex, 0.25, gz + ez);
                            addGeometry(post);
                            const lamp = buildWall(0.28, 0.28, lampMat, 0.3);
                            lamp.position.set(gx + ex, 0.6, gz + ez);
                            lamp.userData.chunkHash = hash;
                            chunkGroup.add(lamp);
                            lamp.updateMatrixWorld(true);
                            this.walls.push(lamp);
                            this.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(gx + ex, 0.55, gz + ez),
                                flickerOffset: random() * 500,
                                material: lampMat,
                                isFaulty: random() > 0.75,
                                baseIntensity: 2.4,
                                targetIntensity: 2.4,
                                currentIntensity: 2.4
                            });
                        }
                    } else {
                        const voidBox = new AABB();
                        voidBox.min.set(gx - 2, -100, gz - 2);
                        voidBox.max.set(gx + 2, 3, gz + 2);
                        voidBox.isVoid = true;
                        voidBox.chunkHash = hash;
                        this.spatialGrid.insert(voidBox);
                        if (this._chasmPillarHash !== hash) {
                            this._chasmPillarHash = hash;
                            const band = [];
                            for (let ix = 3; ix <= 11; ix++) for (let iz = 3; iz <= 11; iz++) {
                                if (!maze || maze[ix][iz]) band.push(ix * this.chunkSize + iz);
                            }
                            const set = new Set();
                            if (band.length) {
                                let s = (hash ^ 0x00C0FFEE) >>> 0;
                                const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
                                for (let i = band.length - 1; i > 0; i--) {
                                    const j = Math.floor(rng() * (i + 1));
                                    const t = band[i]; band[i] = band[j]; band[j] = t;
                                }
                                const want = Math.min(band.length, 3 + ((hash >>> 3) % 3));
                                for (let k = 0; k < want; k++) set.add(band[k]);
                            }
                            this._chasmPillarSet = set;
                        }
                        const guaranteed = this._chasmPillarSet.has(localX * this.chunkSize + localZ);
                        const scatter = random() > 0.90;
                        const inBand = localX > 2 && localX < 12 && localZ > 2 && localZ < 12;
                        if (guaranteed || (scatter && inBand)) {
                            const pw = 1.8 + random() * 1.5;
                            const pillar = buildWall(pw, pw, this.rustMat, 80.0);
                            pillar.position.set(gx, -30.0, gz);
                            addGeometry(pillar);
                            const isVoidCell = (nx, nz) =>
                                (nx < 0 || nx >= this.chunkSize || nz < 0 || nz >= this.chunkSize)
                                    ? true : (!maze || maze[nx][nz]);
                            let ox = 0, oz = 0;
                            const nb = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                            for (let n = 0; n < nb.length; n++) {
                                if (!isVoidCell(localX + nb[n][0], localZ + nb[n][1])) { ox = nb[n][0]; oz = nb[n][1]; break; }
                            }
                            if (ox === 0 && oz === 0) ox = localX < 7 ? 1 : -1;
                            const off = pw / 2 + 0.5;
                            const canX = gx + ox * off, canZ = gz + oz * off;
                            const upMat = this.baseLightMat.clone();
                            upMat.color.setHex(0xff3a00);
                            upMat.emissive.setHex(0xff2200);
                            const can = new THREE.Mesh(this._boxGeo(0.4, 0.25, 0.4), upMat);
                            can.position.set(canX, 0.35, canZ);
                            can.userData.chunkHash = hash;
                            chunkGroup.add(can);
                            can.updateMatrixWorld(true);
                            this.walls.push(can);
                            this.fixtureData.push({
                                chunkHash: hash,
                                position: new THREE.Vector3(canX, 1.2, canZ),
                                flickerOffset: random() * 500,
                                material: upMat,
                                isFaulty: false,
                                baseIntensity: 3.0,
                                targetIntensity: 3.0,
                                currentIntensity: 3.0
                            });
                        }
                    }
                }
            },
            {
                id: "INCINERATOR",
                foundationMat: this.diamondPlateMat || this.rustMat,
                ceilingMat: this.incinCeilingMat || null,
                build: (x, z, localX, localZ) => {
                    const edge = this.chunkSize - 1;
                    const isDoorwayNS = localX === 7 && (localZ === 0 || localZ === edge);
                    const isDoorwayEW = localZ === 7 && (localX === 0 || localX === edge);
                    const isDoorway = isDoorwayNS || isDoorwayEW;
                    if (ctx.buildPerimeter(x, z, localX, localZ, this.sharedWallMat, "INCINERATOR")) {
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
                build: (x, z, localX, localZ) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, this.sharedWallMat, "ANNEX")) return;
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
                        doorMesh.userData = (isOpenable || isKeypad) ? {chunkHash: hash, closedRot: 0, currentRot: 0, useXApproach: true} : {chunkHash: hash};
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
                        fin.position.set(ox, 0.035, oz);
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
                        doc.position.set(ox + (random() - 0.5) * 1.6, 0.035, oz + (random() - 0.5) * 1.6);
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
                build: (x, z, localX, localZ, maze) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, this.sharedWallMat, "ATRIUM")) {
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

                    }
                }
            },
            {
                id: "CHECKPOINT",
                foundationMat: this.tileMat,
                ceilingMat: this.structMat,
                build: (x, z, localX, localZ) => {
                    if (ctx.buildPerimeter(x, z, localX, localZ, this.structMat, "CHECKPOINT")) return;
                    const isPathN = localX === 7 && localZ <= 7;
                    const isPathS = localX === 7 && localZ >= 7;
                    const isPathW = localZ === 7 && localX <= 7;
                    const isPathE = localZ === 7 && localX >= 7;
                    const isPath = isPathN || isPathS || isPathW || isPathE;
                    const ckHash = (a, b, salt) => {
                        let h = (hash ^ Math.imul(a + 64, 73856093) ^ Math.imul(b + 64, 19349663) ^ Math.imul(salt + 1, 83492791)) >>> 0;
                        h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
                        h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0;
                        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
                    };
                    const roomCandidate = (lx, lz) => {
                        if (lx === 7 || lz === 7) return false;
                        const fV = (lx === 6 || lx === 8) && lz !== 6 && lz !== 8;
                        const fH = (lz === 6 || lz === 8) && lx !== 6 && lx !== 8;
                        if (!fV && !fH) return false;
                        const t = fV ? lz : lx;
                        if (t < 3 || t > 12) return false;
                        if (Math.abs(t - 7) < 2) return false;
                        return ckHash(lx, lz, 11) < 0.14;
                    };
                    const isBuiltRoom = (lx, lz) => {
                        if (!roomCandidate(lx, lz)) return false;
                        const fV = (lx === 6 || lx === 8) && lz !== 6 && lz !== 8;
                        const prev = fV ? roomCandidate(lx, lz - 1) : roomCandidate(lx - 1, lz);
                        return !prev;
                    };
                    if (!isPath) {
                        if (isBuiltRoom(localX, localZ)) {
                            const flankV = (localX === 6 || localX === 8) && localZ !== 6 && localZ !== 8;
                            this._buildCheckpointRoom(x, z, localX, localZ, flankV, ckHash, {buildWall, addGeometry, chunkGroup, hash});
                            return;
                        }
                        const block = buildWall(this.cellSize, this.cellSize, this.structMat);
                        block.position.set(x * this.cellSize, 1.5, z * this.cellSize);
                        block.userData.isEntityBlocker = true;
                        addGeometry(block);
                        return;
                    }
                    if (localX === 7 && localZ === 7) {
                        this._buildCheckpointColumn(x, z, hash, {addGeometry, stagingMeshes});
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
                        const cx0 = x * this.cellSize, cz0 = z * this.cellSize;
                        if (Math.hypot(cx0, cz0) < this.cellSize * 2) return;
                        const alongZ = localX === 7;
                        const travelCoord = alongZ ? localZ : localX;
                        const nearGate = travelCoord <= 1 || travelCoord >= 14;
                        const nearChoke = Math.abs(travelCoord - 7) === 1;
                        const lat = (side, off) => alongZ
                            ? [cx0 + side * off, cz0]
                            : [cx0, cz0 + side * off];
                        const doorMinus = alongZ ? isBuiltRoom(6, localZ) : isBuiltRoom(localX, 6);
                        const doorPlus = alongZ ? isBuiltRoom(8, localZ) : isBuiltRoom(localX, 8);
                        const anyDoor = doorMinus || doorPlus;
                        const clearSide = (pref) => {
                            const blocked = (s) => (s < 0 ? doorMinus : doorPlus);
                            if (!blocked(pref)) return pref;
                            if (!blocked(-pref)) return -pref;
                            return 0;
                        };
                        const decalMesh = (mesh) => {
                            mesh.userData.chunkHash = hash;
                            mesh.updateMatrixWorld(true);
                            stagingMeshes.push(mesh);
                        };
                        if (!this.hazmatMat) {
                            this.hazmatMat = new THREE.MeshStandardMaterial({color: 0xc9b83a, roughness: 0.85});
                            this.sharedAssets.add(this.hazmatMat.uuid);
                        }
                        if (!this.deconSheetMat) {
                            this.deconSheetMat = new THREE.MeshStandardMaterial({
                                color: 0xbfd8d0, transparent: true, opacity: 0.28,
                                roughness: 0.6, side: THREE.DoubleSide
                            });
                            this.sharedAssets.add(this.deconSheetMat.uuid);
                        }
                        const hazmatSuit = (px, pz, faceYaw) => {
                            const suit = new THREE.Group();
                            const torso = new THREE.Mesh(this._boxGeo(0.4, 0.55, 0.24), this.hazmatMat);
                            torso.position.y = 1.55;
                            const hood = new THREE.Mesh(this._boxGeo(0.24, 0.24, 0.24), this.hazmatMat);
                            hood.position.y = 1.94;
                            const visor = new THREE.Mesh(this._boxGeo(0.16, 0.12, 0.02), this.crtScreenMat);
                            visor.position.set(0, 1.96, 0.13);
                            suit.add(torso, hood, visor);
                            for (let a = -1; a <= 1; a += 2) {
                                const arm = new THREE.Mesh(this._boxGeo(0.11, 0.5, 0.11), this.hazmatMat);
                                arm.position.set(a * 0.24, 1.32, 0);
                                const leg = new THREE.Mesh(this._boxGeo(0.14, 0.55, 0.14), this.hazmatMat);
                                leg.position.set(a * 0.11, 0.92, 0);
                                suit.add(arm, leg);
                            }
                            suit.position.set(px, 0, pz);
                            suit.rotation.y = faceYaw + (random() - 0.5) * 0.25;
                            suit.updateMatrixWorld(true);
                            suit.traverse(m => { if (m.isMesh) decalMesh(m); });
                        };
                        const suitRack = (side) => {
                            const railLen = 3.2;
                            const [rx, rz] = lat(side, 1.5);
                            const rail = new THREE.Mesh(
                                this._boxGeo(alongZ ? 0.06 : railLen, 0.06, alongZ ? railLen : 0.06), this.metalMat);
                            rail.position.set(rx, 2.35, rz);
                            addGeometry(rail);
                            for (let p = -1; p <= 1; p += 2) {
                                const post = new THREE.Mesh(this._boxGeo(0.06, 2.35, 0.06), this.metalMat);
                                const [ppx, ppz] = alongZ ? [rx, rz + p * 1.5] : [rx + p * 1.5, rz];
                                post.position.set(ppx, 1.17, ppz);
                                decalMesh(post);
                            }
                            const faceYaw = alongZ ? (side < 0 ? Math.PI / 2 : -Math.PI / 2) : (side < 0 ? Math.PI : 0);
                            const n = 2 + Math.floor(random() * 2);
                            for (let i = 0; i < n; i++) {
                                const t = (n === 1) ? 0 : (i / (n - 1) - 0.5) * 2.4;
                                const [sx, sz] = alongZ ? [rx, rz + t] : [rx + t, rz];
                                if (random() > 0.15) hazmatSuit(sx, sz, faceYaw);
                            }
                        };
                        const crateStack = (side) => {
                            if (!this.cartonGeo) {
                                this.cartonGeo = new THREE.BoxGeometry(0.6, 0.5, 0.6);
                                this.geoCache.set(this.cartonGeo.uuid, true);
                            }
                            const cartonPool = this.cartonMats || [this.fileBoxMat];
                            const [bx0, bz0] = lat(side, 1.45);
                            const pallet = new THREE.Mesh(this._boxGeo(1.3, 0.12, 1.3), this.woodMat);
                            pallet.position.set(bx0, 0.06, bz0);
                            addGeometry(pallet);
                            const cols = 1 + Math.floor(random() * 2);
                            for (let c = 0; c < cols; c++) {
                                const ox = (c - (cols - 1) / 2) * 0.62;
                                const stack = 1 + Math.floor(random() * 3);
                                for (let s = 0; s < stack; s++) {
                                    const mBox = new THREE.Mesh(this.cartonGeo, cartonPool[Math.floor(random() * cartonPool.length)]);
                                    const jitter = (random() - 0.5) * 0.12;
                                    mBox.rotation.y = (random() - 0.5) * 0.3;
                                    const [mx, mz] = alongZ ? [bx0 + jitter, bz0 + ox] : [bx0 + ox, bz0 + jitter];
                                    mBox.position.set(mx, 0.37 + s * 0.5, mz);
                                    addGeometry(mBox);
                                }
                            }
                        };
                        const drumCluster = (side) => {
                            const drumGeo = this._cacheGeo('ckDrum', () => new THREE.CylinderGeometry(0.29, 0.29, 0.92, 10));
                            const n = 2 + Math.floor(random() * 2);
                            const [dx0, dz0] = lat(side, 1.5);
                            for (let i = 0; i < n; i++) {
                                const drum = new THREE.Mesh(drumGeo, random() > 0.5 ? this.rustMat : this.hazmatMat);
                                const off = (i - (n - 1) / 2) * 0.64;
                                const [ddx, ddz] = alongZ ? [dx0 + (random() - 0.5) * 0.2, dz0 + off] : [dx0 + off, dz0 + (random() - 0.5) * 0.2];
                                drum.position.set(ddx, 0.46, ddz);
                                addGeometry(drum);
                                const ring = new THREE.Mesh(this._boxGeo(0.6, 0.05, 0.6), this.hazardMat);
                                ring.position.set(ddx, 0.7, ddz);
                                decalMesh(ring);
                            }
                        };
                        const avCart = (side) => {
                            const cart = new THREE.Group();
                            const shelf = new THREE.Mesh(this._boxGeo(0.9, 0.05, 0.6), this.metalMat);
                            shelf.position.y = 0.78;
                            const lower = new THREE.Mesh(this._boxGeo(0.9, 0.05, 0.6), this.metalMat);
                            lower.position.y = 0.4;
                            cart.add(shelf, lower);
                            for (let lx2 = -1; lx2 <= 1; lx2 += 2) for (let lz2 = -1; lz2 <= 1; lz2 += 2) {
                                const leg = new THREE.Mesh(this._boxGeo(0.05, 0.78, 0.05), this.metalMat);
                                leg.position.set(lx2 * 0.4, 0.39, lz2 * 0.26);
                                cart.add(leg);
                            }
                            const body = new THREE.Mesh(this.terminalBodyGeo, this.baseHousingMat);
                            body.position.set(0, 1.0, 0);
                            const screen = new THREE.Mesh(this._boxGeo(0.45, 0.35, 0.05), this.crtScreenMat);
                            screen.position.set(0, 1.0, 0.26);
                            cart.add(body, screen);
                            const [ax, az] = lat(side, 1.5);
                            cart.position.set(ax, 0, az);
                            cart.rotation.y = (alongZ ? 0 : Math.PI / 2) + (random() - 0.5) * 0.4;
                            addFurniture(cart);
                        };
                        const deconSheet = () => {
                            const strips = 5;
                            for (let i = 0; i < strips; i++) {
                                const t = (i / (strips - 1) - 0.5) * 3.4;
                                const strip = new THREE.Mesh(
                                    this._boxGeo(alongZ ? 0.62 : 0.03, 2.3, alongZ ? 0.03 : 0.62), this.deconSheetMat);
                                const [spx, spz] = alongZ ? [cx0 + t, cz0] : [cx0, cz0 + t];
                                strip.position.set(spx, 1.3, spz);
                                strip.rotation.y = (random() - 0.5) * 0.05;
                                decalMesh(strip);
                            }
                            const track = new THREE.Mesh(
                                this._boxGeo(alongZ ? 3.6 : 0.06, 0.08, alongZ ? 0.06 : 3.6), this.metalMat);
                            track.position.set(cx0, 2.48, cz0);
                            decalMesh(track);
                        };
                        if (nearChoke && this._ckDeskHash !== hash) {
                            this._ckDeskHash = hash;
                            const side = random() > 0.5 ? 1 : -1;
                            const [dx0, dz0] = lat(side, 1.15);
                            const desk = new THREE.Group();
                            const top = new THREE.Mesh(this._boxGeo(alongZ ? 1.0 : 2.0, 0.08, alongZ ? 2.0 : 1.0), this.woodMat);
                            top.position.y = 0.78;
                            const skirt = new THREE.Mesh(this._boxGeo(alongZ ? 0.9 : 1.9, 0.68, alongZ ? 1.9 : 0.9), this.structMat);
                            skirt.position.y = 0.38;
                            desk.add(top, skirt);
                            const body = new THREE.Mesh(this.terminalBodyGeo, this.baseHousingMat);
                            body.position.set(0, 1.0, 0);
                            const screen = new THREE.Mesh(this._boxGeo(0.45, 0.35, 0.05), this.crtScreenMat);
                            screen.position.set(0, 1.0, alongZ ? 0.26 : 0.26);
                            desk.add(body, screen);
                            desk.position.set(dx0, 0, dz0);
                            desk.rotation.y = alongZ ? (side < 0 ? -Math.PI / 2 : Math.PI / 2) : (side < 0 ? 0 : Math.PI);
                            addFurniture(desk);
                            return;
                        }
                        if (nearGate) return;
                        const dress = random();
                        if (dress < 0.16) {
                            const s = clearSide(random() > 0.5 ? 1 : -1);
                            if (s) suitRack(s);
                        } else if (dress < 0.34) {
                            const s = clearSide(random() > 0.5 ? 1 : -1);
                            if (s) crateStack(s);
                            if (random() > 0.6) {
                                const s2 = clearSide(random() > 0.5 ? 1 : -1);
                                if (s2) drumCluster(s2);
                            }
                        } else if (dress < 0.46) {
                            const s = clearSide(random() > 0.5 ? 1 : -1);
                            if (s) drumCluster(s);
                        } else if (dress < 0.58) {
                            const s = clearSide(random() > 0.5 ? 1 : -1);
                            if (s) avCart(s);
                        } else if (dress < 0.66) {
                            if (!anyDoor) deconSheet();
                        } else if (dress < 0.80) {
                            if (!doorPlus) crateStack(1);
                            if (!doorMinus) crateStack(-1);
                        }
                    }
                }
            }
        ];
    }
}