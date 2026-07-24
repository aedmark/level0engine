// StructuralBlueprints.js
// LEVEL 0 PROCEDURAL BLUEPRINT FACTORY - STRUCTURAL

import Vec3 from '../math/Vec3.js';
import AABB from '../math/AABB.js';

export default class StructuralBlueprints {
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
                            const floor1 = buildWall(holeW, innerW, this.ductMat, liningH);
                            floor1.position.set(x * this.cellSize, liningH / 2, z * this.cellSize - (flipZ * (this.cellSize / 2 - innerW / 2)));
                            addGeometry(floor1);
                            const floor2 = buildWall(sideW, holeW, this.ductMat, liningH);
                            floor2.position.set(x * this.cellSize - (flipX * (this.cellSize / 2 - sideW / 2)), liningH / 2, z * this.cellSize);
                            addGeometry(floor2);
                            const ceil1 = buildWall(holeW, innerW, this.ductMat, liningH);
                            ceil1.position.set(x * this.cellSize, holeH - liningH / 2, z * this.cellSize - (flipZ * (this.cellSize / 2 - innerW / 2)));
                            addGeometry(ceil1);
                            const ceil2 = buildWall(sideW, holeW, this.ductMat, liningH);
                            ceil2.position.set(x * this.cellSize - (flipX * (this.cellSize / 2 - sideW / 2)), holeH - liningH / 2, z * this.cellSize);
                            addGeometry(ceil2);
                            const lOuterX = buildWall(liningH, sideW, this.ductMat, sideH);
                            lOuterX.position.set(x * this.cellSize - (flipX * (holeW / 2 - liningH / 2)), holeH / 2, z * this.cellSize - (flipZ * (this.cellSize / 2 - sideW / 2)));
                            addGeometry(lOuterX);
                            const lOuterZ = buildWall(sideW, liningH, this.ductMat, sideH);
                            lOuterZ.position.set(x * this.cellSize - (flipX * (this.cellSize / 2 - sideW / 2)), holeH / 2, z * this.cellSize - (flipZ * (holeW / 2 - liningH / 2)));
                            addGeometry(lOuterZ);
                            const lInnerX = buildWall(liningH, innerW, this.ductMat, sideH);
                            lInnerX.position.set(x * this.cellSize + (flipX * (holeW / 2 - liningH / 2)), holeH / 2, z * this.cellSize - (flipZ * (this.cellSize / 2 - innerW / 2)));
                            addGeometry(lInnerX);
                            const lInnerZ = buildWall(innerW, liningH, this.ductMat, sideH);
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
                                const liningFloor = buildWall(linW, linD, this.ductMat, liningH);
                                liningFloor.position.set(segX * this.cellSize, liningH / 2, segZ * this.cellSize);
                                addGeometry(liningFloor);
                                const liningCeil = buildWall(linW, linD, this.ductMat, liningH);
                                liningCeil.position.set(segX * this.cellSize, holeH - (liningH / 2), segZ * this.cellSize);
                                addGeometry(liningCeil);
                                const liningSideW = tunnelOnZ ? liningH : linW;
                                const liningSideD = tunnelOnZ ? linD : liningH;
                                const liningLeft = buildWall(liningSideW, liningSideD, this.ductMat, sideH);
                                liningLeft.position.set(segX * this.cellSize + (tunnelOnZ ? -sideOffsetLining : 0), holeH / 2, segZ * this.cellSize + (tunnelOnZ ? 0 : -sideOffsetLining));
                                addGeometry(liningLeft);
                                const liningRight = buildWall(liningSideW, liningSideD, this.ductMat, sideH);
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
                            const liningFloor = buildWall(dirZ ? tunnelW : this.cellSize + 0.05, dirZ ? this.cellSize + 0.05 : tunnelW, this.ductMat, liningH);
                            liningFloor.position.set(segX * this.cellSize, liningH / 2, segZ * this.cellSize);
                            addGeometry(liningFloor);
                            const liningCeil = buildWall(dirZ ? tunnelW : this.cellSize + 0.05, dirZ ? this.cellSize + 0.05 : tunnelW, this.ductMat, liningH);
                            liningCeil.position.set(segX * this.cellSize, tunnelH - (liningH / 2), segZ * this.cellSize);
                            addGeometry(liningCeil);
                            const liningSideW = dirZ ? liningH : this.cellSize + 0.05;
                            const liningSideD = dirZ ? this.cellSize + 0.05 : liningH;
                            const liningLeft = buildWall(liningSideW, liningSideD, this.ductMat, sideH);
                            liningLeft.position.set(segX * this.cellSize + (dirZ ? -sideOffsetLining : 0), tunnelH / 2, segZ * this.cellSize + (dirZ ? 0 : -sideOffsetLining));
                            addGeometry(liningLeft);
                            const liningRight = buildWall(liningSideW, liningSideD, this.ductMat, sideH);
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
}
