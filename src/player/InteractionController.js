import {releasePropLighting} from '../world/PropGlow.js';

export default class InteractionController {
    constructor(env) {
        this.env = env;
        this._camDir = new THREE.Vector3();
        this._lookDir = new THREE.Vector3();
        this._objWorldPos = new THREE.Vector3();
        this.setupEventListeners();
    }

    shatterFixture(fixture) {
        const env = this.env;
        fixture.isDead = true;
        fixture.baseIntensity = 0.0;
        fixture.currentIntensity = 0.0;
        if (fixture.material) {
            fixture.material.emissiveIntensity = 0.0;
            if (fixture.material.color) fixture.material.color.setHex(0x222222);
            if (fixture.material.emissive) fixture.material.emissive.setHex(0x000000);
        }
        const pDistSq = env.camera.position.distanceToSquared(fixture.position);
        if (pDistSq < 625.0) {
            document.dispatchEvent(new CustomEvent('somatic-door', {detail: {distSq: pDistSq, intensity: 1.2}}));
        }
    }


    _animateSliderPanels(ud, target, pDistSq, delta, entityOpen, baseSpeedMultiplier) {
        if (ud.progress === target) return;
        const speed = entityOpen ? 3.0 : baseSpeedMultiplier;
        const dir = target > ud.progress ? 1 : -1;
        ud.progress = Math.max(0, Math.min(1, ud.progress + dir * speed * delta));
        const t = ud.progress;
        const eased = t * t * (3 - 2 * t);
        const axis = ud.spansX ? 'x' : 'z';
        for (let i = 0; i < 2; i++) {
            const p = ud.panels[i];
            p.position[axis] = ud.baseOffsets[i] + ud.signs[i] * eased * ud.slideDist;
        }
        this.env.lumenGrid.shadowsDirty = true;
        if (ud.progress > 0.12) {
            if (!ud.box.isEmpty()) ud.box.makeEmpty();
        } else if (ud.progress === 0) {
            if (ud.box.isEmpty()) ud.box.copy(ud.closedBox);
        }
        if (ud.progress === 1 || ud.progress === 0) {
            document.dispatchEvent(new CustomEvent('somatic-door', {
                detail: {distSq: pDistSq, intensity: ud.progress === 0 ? 0.9 : 0.5, variant: 'blast'}
            }));
        }
    }

    updateSliderDoor(door, playerPos, delta) {
        const env = this.env;
        const ud = door.userData;
        if (ud.isAirlockDoor) return;
        const worldPos = door.matrixWorld ? this._objWorldPos.setFromMatrixPosition(door.matrixWorld) : door.position;
        const pDistSq = playerPos.distanceToSquared(worldPos);
        const entityOpen = ud.entityOpen === true;
        ud.entityOpen = false;
        if (pDistSq > 900.0 && ud.progress === 0 && !entityOpen) return;
        const openRadiusSq = ud.openRadiusSq !== undefined ? ud.openRadiusSq : 20.0;
        let shouldOpen = entityOpen || pDistSq < openRadiusSq;
        if (ud.codeLocked && !ud.playerOpen) {
            shouldOpen = false;
        }
        if (ud.tutorialLocked) {
            if (env.player.flashlightBattery >= 100.0) {
                ud.tutorialLocked = false;
                env.tutorialActive = false;
                ud.codeLocked = true;
                if (ud.tutorialFixture) {
                    ud.tutorialFixture.isDead = false;
                    ud.tutorialFixture.baseIntensity = 0.8;
                    ud.tutorialFixture.targetIntensity = 0.8;
                    ud.tutorialFixture.currentIntensity = 0.8;
                }
                try { localStorage.setItem('level0_tutorial', '1'); } catch(e) {}
            } else {
                shouldOpen = false;
            }
        }
        const target = shouldOpen ? 1.0 : 0.0;
        const travelAxis = ud.spansX ? 'z' : 'x';
        const playerOutside = ((playerPos[travelAxis] - worldPos[travelAxis]) * ud.outSign) > 0;
        if (target !== ud.lastTarget) {
            ud.lastTarget = target;
            if (target === 1.0) ud.openedFromOutside = playerOutside;
            document.dispatchEvent(new CustomEvent('somatic-door', {
                detail: {distSq: pDistSq, intensity: shouldOpen ? 0.7 : 0.45, variant: 'blast'}
            }));
        }
        let approaching = false;
        const mvx = env._playerMoveX || 0;
        const mvz = env._playerMoveZ || 0;
        const moveSq = mvx * mvx + mvz * mvz;
        const minStep = 0.5 * delta;
        if (moveSq > minStep * minStep) {
            const dx = door.position.x - playerPos.x;
            const dz = door.position.z - playerPos.z;
            const dLen = Math.sqrt(dx * dx + dz * dz) || 1.0;
            approaching = ((mvx * dx + mvz * dz) / (Math.sqrt(moveSq) * dLen)) > 0.45;
        }
        if (ud.sectorId && pDistSq < 30.0 && ud.openedFromOutside && (ud.lastTarget === 1 || ud.progress > 0)) {
            if ((playerOutside && approaching) || (!playerOutside && pDistSq < 20.0)) {
                env._doorSectorForce = ud.sectorId;
            }
        }
        this._animateSliderPanels(ud, target, pDistSq, delta, entityOpen, 0.9);
    }


    // Shared core for anything that swings on a hinge (room doors, duct grates, gate arms):
    // sweep the visible mesh's geometry through candidate rotations and reject any that
    // intersect real collision geometry, so a hinge never commits to a swing that clips.
    // `rotNode` is whatever actually rotates (the mesh itself for a self-hinged door, or a
    // parent pivot Group for anything mounted off-center like a grate or gate arm);
    // `sweepMesh` is the mesh whose geometry defines the swept shape (a child of rotNode,
    // or rotNode itself when they're the same object).
    _hingeSweepBoxAt(rotNode, sweepMesh, targetRot) {
        if (!sweepMesh.userData.baseBox) {
            sweepMesh.geometry.computeBoundingBox();
            sweepMesh.userData.baseBox = sweepMesh.geometry.boundingBox.clone();
        }
        const prevRot = rotNode.rotation.y;
        rotNode.rotation.y = targetRot;
        rotNode.updateMatrixWorld(true);
        if (!this._swingProbeBox) this._swingProbeBox = new THREE.Box3();
        this._swingProbeBox.copy(sweepMesh.userData.baseBox).applyMatrix4(sweepMesh.matrixWorld);
        rotNode.rotation.y = prevRot;
        rotNode.updateMatrixWorld(true);
        return this._swingProbeBox;
    }

    _isHingeSweepClear(rotNode, sweepMesh, worldPos, fromRot, targetRot, owner, radius) {
        const env = this.env;
        const nearby = env.spatialGrid.getNearby(worldPos.x, worldPos.z, radius);
        const count = nearby.length;
        const steps = 4;
        for (let s = 1; s <= steps; s++) {
            const rot = fromRot + (targetRot - fromRot) * (s / steps);
            const box = this._hingeSweepBoxAt(rotNode, sweepMesh, rot);
            box.expandByScalar(-0.03);
            for (let i = 0; i < count; i++) {
                const other = nearby[i];
                if (other.doorFrameOwner === owner) continue;
                if (other.intersectsBox(box)) return false;
            }
        }
        return true;
    }

    // Tries each candidate rotation in order and returns the first that sweeps clear;
    // falls back to `fromRot` (stays put) if none of them do.
    _resolveHingeSwing(rotNode, sweepMesh, worldPos, fromRot, candidates, owner, radius) {
        for (const rot of candidates) {
            if (this._isHingeSweepClear(rotNode, sweepMesh, worldPos, fromRot, rot, owner, radius)) return rot;
        }
        return fromRot;
    }

    _resolveDoorSwing(door, worldPos, triggerPos) {
        const swingAngle = Math.PI / 2.2;
        const isZDoor = door.userData.useXApproach ? false :
            (Math.abs(door.userData.closedRot) < 0.1 || Math.abs(door.userData.closedRot - Math.PI) < 0.1);
        const preferPlus = isZDoor
            ? (triggerPos.z - worldPos.z) < 0
            : !((triggerPos.x - worldPos.x) < 0);
        const closedRot = door.userData.closedRot;
        const first = closedRot + (preferPlus ? swingAngle : -swingAngle);
        const second = closedRot + (preferPlus ? -swingAngle : swingAngle);
        const rotNode = door.userData.pivot || door;
        return this._resolveHingeSwing(rotNode, door, worldPos, closedRot, [first, second], door, 3.0);
    }

    _updateSwingingDoor(door, playerPos, delta) {
        const env = this.env;
        const rotNode = door.userData.pivot || door;
        if (door.userData.codeLocked) door.userData.entityOpen = false;
        const worldPos = door.matrixWorld ? this._objWorldPos.setFromMatrixPosition(door.matrixWorld) : door.position;
        const pDistSq = playerPos.distanceToSquared(worldPos);
        if (pDistSq > 400.0 && !door.userData.isLatched && !door.userData.entityOpen) return;
        const playerOpen = door.userData.playerOpen === true;
        const entityOpen = door.userData.entityOpen === true;
        door.userData.entityOpen = false;
        const isOpen = playerOpen || entityOpen;
        let targetRot = door.userData.closedRot;
        if (isOpen) {
            if (!door.userData.isLatched) {
                const triggerPos = (entityOpen && !playerOpen) ? env.anomaly.group.position : playerPos;
                door.userData.latchedRot = this._resolveDoorSwing(door, worldPos, triggerPos);
                door.userData.isLatched = true;
                door.userData.swingSpeed = (entityOpen && !playerOpen) ? 35.0 : 8.0;
                const intensity = (entityOpen && !playerOpen) ? 1.0 : 0.25;
                document.dispatchEvent(new CustomEvent('somatic-door', {
                    detail: {distSq: pDistSq, intensity: intensity}
                }));
            }
            targetRot = door.userData.latchedRot;
        } else {
            door.userData.isLatched = false;
            door.userData.swingSpeed = 8.0;
        }
        const rotDiff = targetRot - door.userData.currentRot;
        if (Math.abs(rotDiff) > 0.001) {
            door.userData.currentRot += rotDiff * door.userData.swingSpeed * delta;
            rotNode.rotation.y = door.userData.currentRot;
            env.lumenGrid.shadowsDirty = true;
            if (door.userData.box && isOpen) {
                if (!door.userData.box.isEmpty()) door.userData.box.makeEmpty();
            }
            if (pDistSq < 2.5) {
                const pushDist = Math.sqrt(pDistSq) || 0.1;
                const pushStrength = (2.5 - pDistSq) * 15.0;
                const pushX = ((playerPos.x - worldPos.x) / pushDist) * pushStrength;
                const pushZ = ((playerPos.z - worldPos.z) / pushDist) * pushStrength;
                const cosY = Math.cos(env.camera.rotation.y);
                const sinY = Math.sin(env.camera.rotation.y);
                const localVx = pushX * cosY - pushZ * sinY;
                const localVz = pushX * sinY + pushZ * cosY;
                env.player.velocity.x -= localVx;
                env.player.velocity.z += localVz;
            }
        } else if (door.userData.currentRot !== targetRot) {
            door.userData.currentRot = targetRot;
            rotNode.rotation.y = targetRot;
            if (!isOpen && door.userData.box) {
                rotNode.updateMatrixWorld(true);
                if (!door.userData.baseBox) {
                    door.geometry.computeBoundingBox();
                    door.userData.baseBox = door.geometry.boundingBox.clone();
                }
                door.userData.box.copy(door.userData.baseBox).applyMatrix4(door.matrixWorld);
            }
        }
    }

    _resolveGrateSwing(grateMesh, pivot) {
        return grateMesh.userData.openRot !== undefined ? grateMesh.userData.openRot : (Math.PI / 2);
    }

    _updateInteractable(obj, playerPos, delta) {
        const env = this.env;
        if (obj.userData.type === 'grate' && obj.userData.pivot) {
            // Hinged grates (e.g. crawlspace duct doors) toggle open/closed like a room door -
            // userData.active means "closed", matching the interact handler's toggle. Kick-down
            // grates (the `else` branch below) stay one-shot: a grate that's fallen to the floor
            // can't un-fall, so they're only handled while userData.active is still true.
            const pivot = obj.userData.pivot;
            if (!obj.userData.active && obj.userData.resolvedOpenRot === undefined) {
                obj.userData.resolvedOpenRot = this._resolveGrateSwing(obj, pivot);
            }
            const targetRot = obj.userData.active ? 0 : obj.userData.resolvedOpenRot;
            const diff = targetRot - pivot.rotation.y;
            if (Math.abs(diff) > 0.01) {
                pivot.rotation.y += diff * 8.0 * delta;
                env.lumenGrid.shadowsDirty = true;
                if (obj.userData.box && !obj.userData.active) {
                    if (!obj.userData.box.isEmpty()) obj.userData.box.makeEmpty();
                }
            } else if (pivot.rotation.y !== targetRot) {
                pivot.rotation.y = targetRot;
                if (obj.userData.active && obj.userData.box) {
                    pivot.updateMatrixWorld(true);
                    if (!obj.userData.baseBox) {
                        obj.geometry.computeBoundingBox();
                        obj.userData.baseBox = obj.geometry.boundingBox.clone();
                    }
                    obj.userData.box.copy(obj.userData.baseBox).applyMatrix4(obj.matrixWorld);
                }
            }
        } else if (obj.userData.type === 'grate' && !obj.userData.active) {
            // Kick-down grate (no pivot): a one-shot fall, not reversible.
            if (obj.userData.targetRot === undefined) {
                if (obj.userData.blocksX) {
                    const fallSign = obj.userData.fallDir !== undefined ? obj.userData.fallDir : ((playerPos.x > obj.position.x) ? 1 : -1);
                    obj.userData.targetRot = -fallSign * Math.PI / 2;
                    obj.userData.targetPos = obj.position.x + fallSign * obj.position.y;
                } else {
                    const fallSign = obj.userData.fallDir !== undefined ? obj.userData.fallDir : ((playerPos.z > obj.position.z) ? 1 : -1);
                    obj.userData.targetRot = fallSign * Math.PI / 2;
                    obj.userData.targetPos = obj.position.z + fallSign * obj.position.y;
                }
            }
            const diff = obj.userData.blocksX ? (obj.userData.targetRot - obj.rotation.z) : (obj.userData.targetRot - obj.rotation.x);
            if (Math.abs(diff) > 0.01) {
                if (obj.userData.blocksX) {
                    obj.rotation.z += diff * 15.0 * delta;
                    obj.position.x += (obj.userData.targetPos - obj.position.x) * 15.0 * delta;
                } else {
                    obj.rotation.x += diff * 15.0 * delta;
                    obj.position.z += (obj.userData.targetPos - obj.position.z) * 15.0 * delta;
                }
                obj.position.y += (0.05 - obj.position.y) * 15.0 * delta;
                env.lumenGrid.shadowsDirty = true;
                if (obj.userData.box && !obj.userData.box.isEmpty()) {
                    obj.userData.box.makeEmpty();
                }
            }
        } else if (obj.userData.type === 'valve') {
            if (obj.userData.active) {
                const vDistSq = obj.position.distanceToSquared(playerPos);
                if (vDistSq < env.closestActiveValveDistSq) env.closestActiveValveDistSq = vDistSq;
                if (obj.userData.wheel) {
                    if (!obj.userData.spinAngle) obj.userData.spinAngle = 0;
                    if (obj.userData.spinAngle > -Math.PI * 6) {
                        const spin = 10.0 * delta;
                        obj.userData.wheel.rotation.z -= spin;
                        obj.userData.spinAngle -= spin;
                    }
                }
            }
        }
    }

    _updateAnimator(anim, playerPos, delta) {
        const env = this.env;
        if (anim.userData.type === 'ventFan' && anim.userData.active) {
            anim.userData.fanMesh.rotation.z -= anim.userData.spinSpeed * delta;
        } else if (anim.userData.type === 'cone') {
            if (!anim.userData.tipped) {
                if (env.player && env.player.isRunning) {
                    const dx = playerPos.x - anim.position.x;
                    const dz = playerPos.z - anim.position.z;
                    const distSq2D = dx * dx + dz * dz;
                    if (distSq2D < 0.64) {
                        anim.userData.tipped = true;
                        anim.userData.fallDir = anim.position.clone().sub(playerPos).normalize();
                        document.dispatchEvent(new CustomEvent('somatic-step', {
                            detail: {
                                distSq: 0.1,
                                intensity: 2.0
                            }
                        }));
                        document.dispatchEvent(new CustomEvent('somatic-trip'));
                    }
                }
            } else if (anim.userData.fallProgress < 1.0) {
                if (anim.userData.fallProgress === 0) {
                    anim.rotation.y = Math.atan2(anim.userData.fallDir.x, anim.userData.fallDir.z);
                }
                anim.userData.fallProgress += delta * 3.5;
                if (anim.userData.fallProgress > 1.0) anim.userData.fallProgress = 1.0;
                const t = anim.userData.fallProgress;
                const eased = t * t * (3 - 2 * t);
                anim.rotation.x = (Math.PI / 2 + 0.258) * eased;
            }
        }
    }

    updateInteractives(playerPos, delta) {
        const env = this.env;
        if (!env._prevPlayerPos) env._prevPlayerPos = playerPos.clone();
        env._playerMoveX = playerPos.x - env._prevPlayerPos.x;
        env._playerMoveZ = playerPos.z - env._prevPlayerPos.z;
        env._prevPlayerPos.copy(playerPos);
        let lookingAtHit = false;
        let closestDistSq = 9.0;
        if (env.camera) env.camera.getWorldDirection(this._camDir);
        const checkObj = (obj) => {
            if (obj.userData.isSlider && !obj.userData.isAirlockDoor) return;
            // Hinged grates toggle like a door - active===false just means "currently open,
            // can be closed again", not "used up" the way it does for other interactables.
            if (obj.userData.active === false && !(obj.userData.type === 'grate' && obj.userData.pivot)) return;
            const worldPos = obj.matrixWorld ? this._objWorldPos.setFromMatrixPosition(obj.matrixWorld) : obj.position;
            const distSq = worldPos.distanceToSquared(playerPos);
            if (distSq < closestDistSq) {
                this._lookDir.subVectors(worldPos, playerPos).normalize();
                if (this._camDir.dot(this._lookDir) > 0.75) {
                    closestDistSq = distSq;
                    lookingAtHit = true;
                }
            }
        };
        const indexObj = (obj) => {
            if (obj.userData.box && !obj.userData.box.interactableEntity) {
                obj.userData.box.interactableEntity = obj;
            } else if (!obj.userData.box) {
                const box = new THREE.Box3().setFromObject(obj);
                obj.userData.box = box;
                box.interactableEntity = obj;
                box.chunkHash = obj.userData.chunkHash;
                if (box.chunkHash) env.spatialGrid.insert(box);
            }
        };
        if (env.interactables) env.interactables.forEach(obj => { indexObj(obj); checkObj(obj); });
        if (env.interactiveDoors) env.interactiveDoors.forEach(obj => { indexObj(obj); checkObj(obj); });
        env.isLookingAtInteractable = lookingAtHit;
        this.updateBreakerScan(playerPos, delta);
        if (env.airlocks) {
            env.airlocks.forEach(airlock => this.updateAirlock(airlock, playerPos, delta));
        }
        env.interactiveDoors.forEach(door => {
            if (door.userData.isSlider) {
                this.updateSliderDoor(door, playerPos, delta);
                return;
            }
            if (door.userData.codeLocked) door.userData.entityOpen = false;
            const rotNode = door.userData.pivot || door;
            const worldPos = door.matrixWorld ? this._objWorldPos.setFromMatrixPosition(door.matrixWorld) : door.position;
            const pDistSq = playerPos.distanceToSquared(worldPos);
            if (pDistSq > 400.0 && !door.userData.isLatched && !door.userData.entityOpen) return;
            const playerOpen = door.userData.playerOpen === true;
            const entityOpen = door.userData.entityOpen === true;
            door.userData.entityOpen = false;
            const isOpen = playerOpen || entityOpen;
            let targetRot = door.userData.closedRot;
            if (isOpen) {
                if (!door.userData.isLatched) {
                    const triggerPos = (entityOpen && !playerOpen) ? env.anomaly.group.position : playerPos;
                    door.userData.latchedRot = this._resolveDoorSwing(door, worldPos, triggerPos);
                    door.userData.isLatched = true;
                    door.userData.swingSpeed = (entityOpen && !playerOpen) ? 35.0 : 8.0;
                    const intensity = (entityOpen && !playerOpen) ? 1.0 : 0.25;
                    document.dispatchEvent(new CustomEvent('somatic-door', {
                        detail: {distSq: pDistSq, intensity: intensity}
                    }));
                }
                targetRot = door.userData.latchedRot;
            } else {
                door.userData.isLatched = false;
                door.userData.swingSpeed = 8.0;
            }
            const rotDiff = targetRot - door.userData.currentRot;
            if (Math.abs(rotDiff) > 0.001) {
                door.userData.currentRot += rotDiff * door.userData.swingSpeed * delta;
                rotNode.rotation.y = door.userData.currentRot;
                env.lumenGrid.shadowsDirty = true;
                if (door.userData.box && isOpen) {
                    if (!door.userData.box.isEmpty()) door.userData.box.makeEmpty();
                }
                if (pDistSq < 2.5) {
                    const pushDist = Math.sqrt(pDistSq) || 0.1;
                    const pushStrength = (2.5 - pDistSq) * 15.0;
                    const pushX = (playerPos.x - worldPos.x) / pushDist;
                    const pushZ = (playerPos.z - worldPos.z) / pushDist;
                    env.player.applyExternalImpulse(pushX, pushZ, pushStrength);
                }
            } else if (door.userData.currentRot !== targetRot) {
                door.userData.currentRot = targetRot;
                rotNode.rotation.y = targetRot;
                if (!isOpen && door.userData.box) {
                    rotNode.updateMatrixWorld(true);
                    if (!door.userData.baseBox) {
                        door.geometry.computeBoundingBox();
                        door.userData.baseBox = door.geometry.boundingBox.clone();
                    }
                    door.userData.box.copy(door.userData.baseBox).applyMatrix4(door.matrixWorld);
                }
            }
        });
        let closestActiveValveDistSq = 9999.0;
        if (env.interactables) {
            env.interactables.forEach(obj => {
                if (obj.userData.type === 'grate' && obj.userData.pivot) {
                    const pivot = obj.userData.pivot;
                    if (!obj.userData.active && obj.userData.resolvedOpenRot === undefined) {
                        obj.userData.resolvedOpenRot = this._resolveGrateSwing(obj, pivot);
                    }
                    const targetRot = obj.userData.active ? 0 : obj.userData.resolvedOpenRot;
                    const diff = targetRot - pivot.rotation.y;
                    if (Math.abs(diff) > 0.01) {
                        pivot.rotation.y += diff * 8.0 * delta;
                        env.lumenGrid.shadowsDirty = true;
                        if (obj.userData.box && !obj.userData.active) {
                            if (!obj.userData.box.isEmpty()) obj.userData.box.makeEmpty();
                        }
                    } else if (pivot.rotation.y !== targetRot) {
                        pivot.rotation.y = targetRot;
                        if (obj.userData.active && obj.userData.box) {
                            pivot.updateMatrixWorld(true);
                            if (!obj.userData.baseBox) {
                                obj.geometry.computeBoundingBox();
                                obj.userData.baseBox = obj.geometry.boundingBox.clone();
                            }
                            obj.userData.box.copy(obj.userData.baseBox).applyMatrix4(obj.matrixWorld);
                        }
                    }
                } else if (obj.userData.type === 'grate' && !obj.userData.active) {
                    if (obj.userData.targetRot === undefined) {
                        if (obj.userData.blocksX) {
                            const fallSign = obj.userData.fallDir !== undefined ? obj.userData.fallDir : ((playerPos.x > obj.position.x) ? 1 : -1);
                            obj.userData.targetRot = -fallSign * Math.PI / 2;
                            obj.userData.targetPos = obj.position.x + fallSign * obj.position.y;
                        } else {
                            const fallSign = obj.userData.fallDir !== undefined ? obj.userData.fallDir : ((playerPos.z > obj.position.z) ? 1 : -1);
                            obj.userData.targetRot = fallSign * Math.PI / 2;
                            obj.userData.targetPos = obj.position.z + fallSign * obj.position.y;
                        }
                    }
                    const diff = obj.userData.blocksX ? (obj.userData.targetRot - obj.rotation.z) : (obj.userData.targetRot - obj.rotation.x);
                    if (Math.abs(diff) > 0.01) {
                        if (obj.userData.blocksX) {
                            obj.rotation.z += diff * 15.0 * delta;
                            obj.position.x += (obj.userData.targetPos - obj.position.x) * 15.0 * delta;
                        } else {
                            obj.rotation.x += diff * 15.0 * delta;
                            obj.position.z += (obj.userData.targetPos - obj.position.z) * 15.0 * delta;
                        }
                        obj.position.y += (0.05 - obj.position.y) * 15.0 * delta;
                        env.lumenGrid.shadowsDirty = true;
                        if (obj.userData.box && !obj.userData.box.isEmpty()) {
                            obj.userData.box.makeEmpty();
                        }
                    }
                } else if (obj.userData.type === 'valve') {
                    if (obj.userData.active) {
                        const vDistSq = obj.position.distanceToSquared(playerPos);
                        if (vDistSq < closestActiveValveDistSq) closestActiveValveDistSq = vDistSq;
                        if (obj.userData.wheel) {
                            if (!obj.userData.spinAngle) obj.userData.spinAngle = 0;
                            if (obj.userData.spinAngle > -Math.PI * 6) {
                                const spin = 10.0 * delta;
                                obj.userData.wheel.rotation.z -= spin;
                                obj.userData.spinAngle -= spin;
                            }
                        }
                        obj.userData.steamTimer -= delta;
                        if (obj.userData.steamTimer <= 0) {
                            obj.userData.active = false;
                            obj.userData.spinAngle = 0;
                            if (obj.userData.steamGroup && obj.userData.steamGroup.parent) {
                                obj.userData.steamGroup.parent.remove(obj.userData.steamGroup);
                            }
                            obj.userData.steamGroup = null;
                        }
                    }
                }
            });
        }
        env.closestActiveValveDistSq = closestActiveValveDistSq;
        if (env.animators) {
            env.animators.forEach(anim => {
                if (anim.userData.type === 'ventFan' && anim.userData.active) {
                    anim.userData.fanMesh.rotation.z -= anim.userData.spinSpeed * delta;
                } else if (anim.userData.type === 'cone') {
                    if (!anim.userData.tipped) {
                        if (env.player && env.player.isRunning) {
                            const dx = playerPos.x - anim.position.x;
                            const dz = playerPos.z - anim.position.z;
                            const distSq2D = dx * dx + dz * dz;
                            if (distSq2D < 0.64) {
                                anim.userData.tipped = true;
                                anim.userData.fallDir = anim.position.clone().sub(playerPos).normalize();
                                document.dispatchEvent(new CustomEvent('somatic-step', {
                                    detail: {
                                        distSq: 0.1,
                                        intensity: 2.0
                                    }
                                }));
                                document.dispatchEvent(new CustomEvent('somatic-trip'));
                                document.dispatchEvent(new CustomEvent('maintenance-cone-tipped', {
                                    detail: {position: anim.position.clone()}
                                }));
                            }
                        }
                    } else if (anim.userData.fallProgress < 1.0) {
                        if (anim.userData.fallProgress === 0) {
                            anim.rotation.y = Math.atan2(anim.userData.fallDir.x, anim.userData.fallDir.z);
                        }
                        anim.userData.fallProgress += delta * 3.5;
                        if (anim.userData.fallProgress > 1.0) anim.userData.fallProgress = 1.0;
                        const t = anim.userData.fallProgress;
                        const eased = t * t * (3 - 2 * t);
                        anim.rotation.x = (Math.PI / 2 + 0.258) * eased;
                        anim.position.y = 0.266 * eased;
                    }
                }
            });
        }
        if (env.steamGroups) {
            for (let i = env.steamGroups.length - 1; i >= 0; i--) {
                const groupObj = env.steamGroups[i];
                if (!groupObj.group.parent) {
                    groupObj.group.children.forEach(sprite => {
                        if (sprite.material) sprite.material.dispose();
                    });
                    env.steamGroups.splice(i, 1);
                    continue;
                }
                groupObj.group.children.forEach(sprite => {
                    const ud = sprite.userData;
                    ud.life += delta * ud.speed;
                    if (ud.life > 1.5) {
                        ud.life = 0;
                        ud.spreadX = (Math.random() - 0.5) * 1.5;
                        ud.spreadZ = (Math.random() - 0.5) * 1.5;
                        ud.speed = 2.0 + Math.random() * 2.0;
                    }
                    sprite.position.set(ud.spreadX * ud.life, ud.life * 1.5, ud.spreadZ * ud.life);
                    const scale = ud.baseScale + ud.life * 1.2;
                    sprite.scale.set(scale, scale, 1);
                    const targetOpacity = ud.life < 0.2 ? (ud.life / 0.2) : (1.0 - (ud.life - 0.2) / 1.3);
                    sprite.material.opacity = Math.max(0, targetOpacity * 0.4);
                });
            }
        }
        if (env.observers) {
            for (let i = env.observers.length - 1; i >= 0; i--) {
                const obs = env.observers[i];
                if (!obs.userData.active) continue;
                const distSq = playerPos.distanceToSquared(obs.position);
                let beingLookedAt = false;
                if (distSq < 625.0) {
                    if (!env._sharedToObs) env._sharedToObs = new THREE.Vector3();
                    if (!env._sharedLookDir) env._sharedLookDir = new THREE.Vector3();
                    env._sharedToObs.subVectors(obs.position, playerPos).normalize();
                    env._sharedLookDir.set(0, 0, -1).applyQuaternion(env.camera.quaternion);
                    if (env._sharedLookDir.dot(env._sharedToObs) > 0.90) beingLookedAt = true;
                }
                if (distSq < 36.0 || (beingLookedAt && env.player.flashlightActive && distSq < 400.0)) {
                    obs.userData.fade -= delta * 1.2;
                    if (obs.userData.fade <= 0) {
                        obs.userData.active = false;
                        obs.visible = false;
                        if (env.player.coherence > 0.1) env.player.coherence -= 0.05;
                        const isLaugh = Math.random() > 0.85;
                        document.dispatchEvent(new CustomEvent('somatic-lost', {
                            detail: {distSq: distSq, isLaugh: isLaugh, intensity: isLaugh ? 2.0 : 0.6}
                        }));
                    } else {
                        obs.material.opacity = obs.userData.fade;
                        obs.position.x += (Math.random() - 0.5) * delta * 0.5;
                        obs.position.z += (Math.random() - 0.5) * delta * 0.5;
                    }
                } else if (distSq < 900.0) {
                    obs.lookAt(playerPos.x, obs.position.y, playerPos.z);
                }
            }
        }
    }

    updateAirlockDoor(doorObj, delta) {
        const env = this.env;
        const ud = doorObj.data;
        const target = ud.target;
        const pDistSq = doorObj.position.distanceToSquared(env.camera.position);
        if (target !== ud.lastTarget) {
            ud.lastTarget = target;
            document.dispatchEvent(new CustomEvent('somatic-door', {
                detail: {distSq: pDistSq, intensity: target === 1.0 ? 0.7 : 0.45, variant: 'blast'}
            }));
        }
        if (ud.progress !== target) {
            this._animateSliderPanels(ud, target, pDistSq, delta, ud.entityOpen, 1.2);
        }
        ud.entityOpen = false;
    }

    updateAirlock(airlock, playerPos, delta) {
        const env = this.env;
        const axis = airlock.spansX ? 'z' : 'x';
        const crossAxis = airlock.spansX ? 'x' : 'z';
        const pDistOuterSq = playerPos.distanceToSquared(airlock.outerPos);
        const pDistInnerSq = playerPos.distanceToSquared(airlock.innerPos);
        const pDistChamberSq = playerPos.distanceToSquared(airlock.chamberCenter);
        if (pDistChamberSq > 1200.0 && airlock.state === 'IDLE') return;
        const inChamberCross = Math.abs(playerPos[crossAxis] - airlock.chamberCenter[crossAxis]) < 1.65;
        const outerCoord = airlock.outerPos[axis];
        const innerCoord = airlock.innerPos[axis];
        const minCoord = Math.min(outerCoord, innerCoord) - 0.2;
        const maxCoord = Math.max(outerCoord, innerCoord) + 0.2;
        const isPlayerInChamber = inChamberCross && (playerPos[axis] >= minCoord && playerPos[axis] <= maxCoord);
        const playerNearOuter = airlock.outerDoor.data.playerOpen === true;
        const playerNearInner = airlock.innerDoor.data.playerOpen === true;
        const switchPressed = airlock.switchGrp && airlock.switchGrp.userData.playerOpen === true;
        airlock.outerDoor.data.playerOpen = false;
        airlock.innerDoor.data.playerOpen = false;
        if (airlock.switchGrp) airlock.switchGrp.userData.playerOpen = false;
        const entityNearOuter = airlock.outerDoor.data.entityOpen === true;
        const entityNearInner = airlock.innerDoor.data.entityOpen === true;
        airlock.outerDoor.data.entityOpen = false;
        airlock.innerDoor.data.entityOpen = false;
        const openOuter = playerNearOuter || entityNearOuter;
        const openInner = playerNearInner || entityNearInner;
        switch (airlock.state) {
            case 'IDLE':
                airlock.outerDoor.data.target = 0.0;
                airlock.innerDoor.data.target = 0.0;
                if (openOuter) {
                    airlock.state = 'OUTER_OPENING';
                    airlock.openedFrom = 'OUTSIDE';
                } else if (openInner) {
                    airlock.state = 'INNER_OPENING';
                    airlock.openedFrom = 'INSIDE';
                }
                break;
            case 'OUTER_OPENING':
                airlock.outerDoor.data.target = 1.0;
                airlock.innerDoor.data.target = 0.0;
                if (airlock.openedFrom === 'OUTSIDE') {
                    env.beginMacroChunkContent(airlock.chunkHash);
                }
                if (isPlayerInChamber) {
                    airlock.state = 'AWAITING_SWITCH';
                } else if (!isPlayerInChamber && !openOuter && pDistOuterSq > 30.0) {
                    airlock.state = 'CLOSING_AFTER_EXIT';
                }
                break;
            case 'INNER_OPENING':
                airlock.innerDoor.data.target = 1.0;
                airlock.outerDoor.data.target = 0.0;
                if (isPlayerInChamber) {
                    airlock.state = 'AWAITING_SWITCH';
                } else if (!isPlayerInChamber && !openInner && pDistInnerSq > 30.0) {
                    airlock.state = 'CLOSING_AFTER_EXIT';
                }
                break;
            case 'AWAITING_SWITCH':
                if (switchPressed) {
                    airlock.state = 'WAIT_IN_CHAMBER';
                } else if (!isPlayerInChamber) {
                    if (airlock.openedFrom === 'OUTSIDE' && !openOuter && pDistOuterSq > 30.0) {
                        airlock.state = 'CLOSING_AFTER_EXIT';
                    } else if (airlock.openedFrom === 'INSIDE' && !openInner && pDistInnerSq > 30.0) {
                        airlock.state = 'CLOSING_AFTER_EXIT';
                    }
                }
                break;
            case 'WAIT_IN_CHAMBER':
                airlock.outerDoor.data.target = 0.0;
                airlock.innerDoor.data.target = 0.0;
                if (airlock.outerDoor.data.progress === 0 && airlock.innerDoor.data.progress === 0) {
                    airlock.state = 'CYCLING';
                    airlock.cycleTimer = airlock.cycleDuration;
                    env._doorSectorForce = (airlock.openedFrom === 'OUTSIDE') ? airlock.sectorId : 'NORMAL';
                    document.dispatchEvent(new CustomEvent('somatic-airlock', {
                        detail: {distSq: pDistChamberSq, intensity: 1.0}
                    }));
                    document.dispatchEvent(new CustomEvent('somatic-airlock-hiss', {
                        detail: {distSq: pDistChamberSq, intensity: 1.0}
                    }));
                }
                break;
            case 'CYCLING':
                airlock.outerDoor.data.target = 0.0;
                airlock.innerDoor.data.target = 0.0;
                const targetSector = (airlock.openedFrom === 'OUTSIDE') ? airlock.sectorId : 'NORMAL';
                env._doorSectorForce = targetSector;
                airlock.cycleTimer -= delta;
                const enteringSector = airlock.openedFrom === 'OUTSIDE';
                const contentReady = !enteringSector || env.isMacroChunkContentReady(airlock.chunkHash);
                if (airlock.cycleTimer <= 0 && contentReady) {
                    if (enteringSector) {
                        airlock.state = 'EXIT_INNER';
                        env._doorSectorForce = airlock.sectorId;
                    } else {
                        airlock.state = 'EXIT_OUTER';
                        env._doorSectorForce = 'NORMAL';
                    }
                }
                break;
            case 'EXIT_INNER':
                airlock.innerDoor.data.target = 1.0;
                airlock.outerDoor.data.target = 0.0;
                if (airlock.sectorId && pDistInnerSq < 30.0) {
                    env._doorSectorForce = airlock.sectorId;
                }
                if (!isPlayerInChamber && pDistInnerSq > 30.0) {
                    airlock.state = 'CLOSING_AFTER_EXIT';
                }
                break;
            case 'EXIT_OUTER':
                airlock.outerDoor.data.target = 1.0;
                airlock.innerDoor.data.target = 0.0;
                if (pDistOuterSq < 30.0) {
                    env._doorSectorForce = 'NORMAL';
                }
                if (!isPlayerInChamber && pDistOuterSq > 30.0) {
                    airlock.state = 'CLOSING_AFTER_EXIT';
                }
                break;
            case 'CLOSING_AFTER_EXIT':
                airlock.outerDoor.data.target = 0.0;
                airlock.innerDoor.data.target = 0.0;
                if (openOuter) {
                    airlock.state = 'OUTER_OPENING';
                    airlock.openedFrom = 'OUTSIDE';
                } else if (openInner) {
                    airlock.state = 'INNER_OPENING';
                    airlock.openedFrom = 'INSIDE';
                } else if (airlock.outerDoor.data.progress === 0 && airlock.innerDoor.data.progress === 0) {
                    airlock.state = 'IDLE';
                }
                break;
        }
        const isReadyToPass = airlock.state === 'EXIT_INNER' || airlock.state === 'EXIT_OUTER' || airlock.state === 'OUTER_OPENING' || airlock.state === 'INNER_OPENING';
        const targetMat = isReadyToPass ? env.airlockGreenMat : env.airlockRedMat;
        const button = airlock.switchGrp && airlock.switchGrp.userData.button;
        if (button && button.material !== targetMat) button.material = targetMat;
        this.updateAirlockDoor(airlock.outerDoor, delta);
        this.updateAirlockDoor(airlock.innerDoor, delta);
    }


    rollHuntHops() {
        const r = Math.random();
        if (r < 0.10) return 0;
        if (r < 0.60) return 1;
        return 2;
    }

    beginBreakerScan(podium) {
        const env = this.env;
        if (env.breakerScan && env.breakerScan.podium === podium) return;
        this.abortBreakerScan();
        env.breakerScan = {podium: podium, t: 0, held: true};
        if (podium.userData.setScan) podium.userData.setScan(podium, 0); 
        document.dispatchEvent(new CustomEvent('somatic-scan-start', {detail: {distSq: 1.0, intensity: 0.5}}));
    }

    abortBreakerScan() {
        const env = this.env;
        const scan = env.breakerScan;
        if (!scan) return;
        env.breakerScan = null;
        if (!scan.podium.userData.active && scan.podium.userData.setScan) scan.podium.userData.setScan(scan.podium, 0);
    }

    updateBreakerScan(playerPos, delta) {
        const env = this.env;
        const scan = env.breakerScan;
        if (!scan) return;
        const podium = scan.podium;
        if (podium.userData.active || !podium.parent) {
            this.abortBreakerScan();
            return;
        }
        if (!scan.held) {
            this.abortBreakerScan();
            return;
        }
        if (podium.position.distanceToSquared(playerPos) > 9.0) {
            this.abortBreakerScan();
            return;
        }
        if (env.camera) {
            env.camera.getWorldDirection(this._camDir);
            env._scanAim = env._scanAim || new THREE.Vector3();
            env._scanAim.subVectors(podium.position, playerPos).normalize();
            if (this._camDir.dot(env._scanAim) < 0.70) {
                this.abortBreakerScan();
                return;
            }
        }
        scan.t = Math.min(1, scan.t + delta / 3.0);
        if (podium.userData.setScan) podium.userData.setScan(podium, scan.t);
        if (scan.t >= 1) {
            env.breakerScan = null;
            podium.userData.active = true;
            if (podium.userData.setSpent) podium.userData.setSpent(podium);
            this.activateExitSwitch(podium);
        }
    }

    activateExitSwitch(podium) {
        const env = this.env;
        env.player.objectives.fixed++;
        env.player.updateObjectives();
        env._breakerHuntHops = this.rollHuntHops();
        document.dispatchEvent(new CustomEvent('somatic-door', {detail: {distSq: 0.1, intensity: 1.5}}));
        if (env.engine.ambientLight) {
            env.engine.ambientLight.intensity = 2.0;
        }
    }

    triggerBreaker(podium) {
        const env = this.env;
        const chunkHash = podium.userData.chunkHash;
        const isBlackout = env.blackoutChunks.has(chunkHash);
        if (podium.userData.door && !podium.userData.doorOpen) {
            podium.userData.door.rotation.y = -Math.PI / 1.5;
            podium.userData.doorOpen = true;
        }
        document.dispatchEvent(new CustomEvent('somatic-breaker', {detail: {distSq: 1.0, intensity: 2.0}}));
        if (!isBlackout) {
            env.blackoutChunks.add(chunkHash);
            const bounds = env.getSectorBounds ? env.getSectorBounds('MAINTENANCE') : null;
            if (bounds) {
                const worldPos = podium.matrixWorld ? this._objWorldPos.setFromMatrixPosition(podium.matrixWorld) : podium.position;
                if (worldPos.x >= bounds.minX && worldPos.x <= bounds.maxX && worldPos.z >= bounds.minZ && worldPos.z <= bounds.maxZ) {
                    setTimeout(() => {
                        document.dispatchEvent(new CustomEvent('maintenance-power-restored', {detail: {chunkHash}}));
                    }, 25000 + Math.random() * 10000);
                }
            }
            env.fixtureData.forEach(fixture => {
                if (fixture.chunkHash === chunkHash && !fixture.isDead && !fixture.isLighthouse && !fixture.isArchiveLight) {
                    fixture.originalFaulty = fixture.isFaulty;
                    fixture.baseIntensity = 2.5;
                    fixture.targetIntensity = 2.5;
                    fixture.currentIntensity = 2.5;
                    fixture.isDead = true;
                    if (fixture.isFake && fixture.material) fixture.material.emissiveIntensity = 2.0;
                    if (fixture.material && fixture.material.color && !fixture.originalColor) {
                        fixture.originalColor = fixture.material.color.getHex();
                        fixture.originalEmissive = fixture.material.emissive.getHex();
                    }
                    clearTimeout(fixture.flickerTimer);
                    clearTimeout(fixture.restoreTimer);
                    fixture.flickerTimer = setTimeout(() => {
                        fixture.baseIntensity = 0.0;
                        fixture.targetIntensity = 0.0;
                        fixture.currentIntensity = 0.0;
                        if (fixture.material && fixture.originalColor) {
                            fixture.material.color.setHex(0x333333);
                            fixture.material.emissive.setHex(0x000000);
                            fixture.material.emissiveIntensity = 0.0;
                        }
                        if (fixture.lightObj) fixture.lightObj.intensity = 0.0;
                    }, 200 + Math.random() * 600);
                    fixture.restoreTimer = setTimeout(() => {
                        env.blackoutChunks.delete(chunkHash);
                        fixture.isDead = false;
                        fixture.isFaulty = fixture.originalFaulty !== undefined ? fixture.originalFaulty : false;
                        fixture.baseIntensity = fixture.isFake ? 0.0 : 0.6;
                        fixture.targetIntensity = fixture.baseIntensity;
                        fixture.currentIntensity = fixture.baseIntensity;
                        if (fixture.material && fixture.originalColor) {
                            fixture.material.color.setHex(fixture.originalColor);
                            fixture.material.emissive.setHex(fixture.originalEmissive);
                            if (fixture.isFake) fixture.material.emissiveIntensity = 0.4;
                        }
                        if (fixture.lightObj) fixture.lightObj.intensity = fixture.baseIntensity;
                    }, 25000 + Math.random() * 10000);
                }
            });
        } else {
            env.blackoutChunks.delete(chunkHash);
            env.fixtureData.forEach(fixture => {
                if (fixture.chunkHash === chunkHash && !fixture.isLighthouse && !fixture.isArchiveLight) {
                    clearTimeout(fixture.flickerTimer);
                    clearTimeout(fixture.restoreTimer);
                    fixture.isDead = false;
                    fixture.isFaulty = fixture.originalFaulty !== undefined ? fixture.originalFaulty : false;
                    fixture.baseIntensity = fixture.isFake ? 0.0 : 0.6;
                    fixture.targetIntensity = fixture.baseIntensity;
                    fixture.currentIntensity = fixture.baseIntensity;
                    if (fixture.material && fixture.originalColor) {
                        fixture.material.color.setHex(fixture.originalColor);
                        fixture.material.emissive.setHex(fixture.originalEmissive);
                        if (fixture.isFake) fixture.material.emissiveIntensity = 0.4;
                    }
                }
            });
        }
    }


    setupEventListeners() {
        const env = this.env;
        env._interactDir = new THREE.Vector3();
        
        document.addEventListener('debug-mode-toggled', () => {
            if (window.EDMARK_DEBUG_MODE) {
                env.tutorialActive = false;
                if (env.interactiveDoors) {
                    env.interactiveDoors.forEach(obj => {
                        const ud = obj.userData;
                        if (ud && ud.tutorialLocked) {
                            ud.tutorialLocked = false;
                            ud.codeLocked = false;
                            if (ud.tutorialFixture) {
                                ud.tutorialFixture.isDead = false;
                                ud.tutorialFixture.baseIntensity = 0.8;
                                ud.tutorialFixture.targetIntensity = 0.8;
                                ud.tutorialFixture.currentIntensity = 0.8;
                            }
                        }
                    });
                }
                if (env.interactables) {
                    env.interactables.forEach(obj => {
                        const ud = obj.userData;
                        if (ud && ud.type === 'keypad') {
                            ud.codeLocked = false;
                            if (ud.doorMesh) ud.doorMesh.userData.codeLocked = false;
                        }
                    });
                }
            }
        });
        
        document.addEventListener('somatic-interact', (e) => {
            let hit = null;
            let closestDistSq = 9.0;
            if (env.interactables) {
                for (let i = 0, len = env.interactables.length; i < len; i++) {
                    const obj = env.interactables[i];
                    if (obj.userData.isSlider && !obj.userData.isAirlockDoor) continue;
                    if (obj.visible === false) continue;
                    const worldPos = obj.matrixWorld ? this._objWorldPos.setFromMatrixPosition(obj.matrixWorld) : obj.position;
                    const distSq = worldPos.distanceToSquared(e.detail.position);
                    if (distSq < closestDistSq) {
                        env._interactDir.subVectors(worldPos, e.detail.position).normalize();
                        if (e.detail.direction.dot(env._interactDir) > 0.75) {
                            closestDistSq = distSq;
                            hit = obj;
                        }
                    }
                }
            }
            if (env.interactiveDoors) {
                for (let i = 0, len = env.interactiveDoors.length; i < len; i++) {
                    const obj = env.interactiveDoors[i];
                    if (obj.userData.isSlider && !obj.userData.isAirlockDoor) continue;
                    if (obj.visible === false) continue;
                    const worldPos = obj.matrixWorld ? this._objWorldPos.setFromMatrixPosition(obj.matrixWorld) : obj.position;
                    const distSq = worldPos.distanceToSquared(e.detail.position);
                    if (distSq < closestDistSq) {
                        env._interactDir.subVectors(worldPos, e.detail.position).normalize();
                        if (e.detail.direction.dot(env._interactDir) > 0.75) {
                            closestDistSq = distSq;
                            hit = obj;
                        }
                    }
                }
            }

            if (hit && hit.userData.type === 'seat') {
                if (env.player) env.player.sit(hit);
                return;
            }

            if (hit && hit.userData.isAirlockDoor) {
                hit.userData.playerOpen = true;
                return;
            }
            if (hit && hit.userData.isAirlockSwitch) {
                hit.userData.playerOpen = true;
                return;
            }
            if (hit && hit.userData.codeLocked) {
                if (env.tutorialActive) {
                    document.dispatchEvent(new CustomEvent('somatic-door', {
                        detail: {distSq: 2.0, intensity: 0.1, variant: 'wood'}
                    }));
                    return;
                }
                env._keypadDoor = hit.userData.doorMesh || hit;
                document.dispatchEvent(new CustomEvent('somatic-keypad', {detail: {}}));
                return;
            }
            if (hit && hit.userData.closedRot !== undefined) {
                hit.userData.playerOpen = !hit.userData.playerOpen;
                document.dispatchEvent(new CustomEvent('somatic-door', {detail: {distSq: 1.0, intensity: 0.5}}));
                return;
            }
            if (hit && hit.userData.type === 'valve') {
                if (hit.userData.active) return;
                hit.userData.active = true;
                hit.userData.steamTimer = 5.0 + Math.random() * 5.0;
                document.dispatchEvent(new CustomEvent('somatic-valve', {detail: {distSq: 1.0, intensity: 1.5}}));
                if (!env.steamTex) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 64;
                    canvas.height = 64;
                    const ctx = canvas.getContext('2d');
                    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
                    grad.addColorStop(0, 'rgba(200, 220, 255, 0.5)');
                    grad.addColorStop(0.4, 'rgba(200, 220, 255, 0.15)');
                    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    ctx.fillStyle = grad;
                    ctx.fillRect(0, 0, 64, 64);
                    env.steamTex = new THREE.CanvasTexture(canvas);
                    env.steamMatTemplate = new THREE.SpriteMaterial({
                        map: env.steamTex, color: 0xffffff, transparent: true,
                        depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5
                    });
                }
                const steamGroup = new THREE.Group();
                const steamCount = 20;
                for (let i = 0; i < steamCount; i++) {
                    const sprite = new THREE.Sprite(env.steamMatTemplate.clone());
                    sprite.userData = {
                        life: Math.random(),
                        speed: 2.0 + Math.random() * 2.0,
                        spreadX: (Math.random() - 0.5) * 1.5,
                        spreadZ: (Math.random() - 0.5) * 1.5,
                        baseScale: 0.3 + Math.random() * 0.3
                    };
                    sprite.position.set(0, sprite.userData.life * 1.5, 0);
                    steamGroup.add(sprite);
                }
                hit.add(steamGroup);
                hit.userData.steamGroup = steamGroup;
                if (!env.steamGroups) env.steamGroups = [];
                env.steamGroups.push({group: steamGroup, chunkHash: hit.userData.chunkHash});
                return;
            }
            if (hit && hit.userData.type === 'breaker') {
                if (!hit.userData.active) return;
                hit.userData.active = false;
                this.triggerBreaker(hit);
            } else if (hit && hit.userData.type === 'exit_switch') {
                if (!hit.userData.active) this.beginBreakerScan(hit);
            } else if (hit && hit.userData.type === 'grate' && hit.userData.pivot) {
                hit.userData.active = !hit.userData.active;
                const soundType = hit.userData.isMiniDoor ? 'somatic-door' : 'somatic-vent';
                document.dispatchEvent(new CustomEvent(soundType, {detail: {distSq: 1.0, intensity: 0.5, variant: 'wood'}}));
            } else if (hit && hit.userData.type === 'grate' && hit.userData.active) {
                hit.userData.active = false;
                document.dispatchEvent(new CustomEvent('somatic-vent', {detail: {distSq: 1.0, intensity: 1.5}}));
            } else if (hit && hit.userData.type === 'exit_key' && hit.userData.active) {
                hit.userData.active = false;
                releasePropLighting(env, hit);
                hit.visible = false;
                env.player.inventory.hasExitKey = true;
                env.player.updateObjectives();
                document.dispatchEvent(new CustomEvent('somatic-item', {detail: {distSq: 1.0, intensity: 0.8}}));

            } else if (hit && hit.userData.type === 'document' && hit.userData.active) {
                hit.userData.active = false;
                if (hit.userData.consumeKey && env.consumedProps) { env.consumedProps.add(hit.userData.consumeKey); }
                releasePropLighting(env, hit);
                if (hit.userData.dimOnRead) {
                    if (typeof hit.userData.onDim === 'function') {
                        hit.userData.onDim();
                    }
                } else {
                    hit.visible = false;
                }
                document.dispatchEvent(new CustomEvent('somatic-read', {
                    detail: {docId: hit.userData.docId, zone: hit.userData.zone || null}
                }));
            } else if (hit && hit.userData.type === 'exit' && hit.userData.active) {
                document.dispatchEvent(new CustomEvent('somatic-inquest', {detail: {exitRef: hit}}));
            } else if (hit && typeof hit.userData.interact === 'function') {
                hit.userData.interact(env.player);
            }
        });
        
        document.addEventListener('somatic-interact-release', () => {
            if (env.breakerScan) {
                env.breakerScan.held = false;
            }
        });
    }
}
