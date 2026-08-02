/**
 * Manages all physical interactions between the player, entities, and the environment.
 *
 * Decoupling interaction logic (like doors, lights, and airlocks) from
 * the main Environment/Player classes prevents those classes from becoming massive "God Objects".
 * This controller acts as a state machine orchestrator for moving parts in the level.
 */
export default class InteractionController {
    constructor(env) {
        this.env = env;
        this._camDir = new THREE.Vector3();
        this._lookDir = new THREE.Vector3();
    }

    /**
     * Instantly shatters a light fixture, breaking the bulb and plunging the area into darkness.
     * @param {Object} fixture - The mesh object representing the light fixture.
     */
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

    /**
     * Updates the state and animation of a standard sliding door (e.g., blast doors, elevator doors).
     *
     * We use easing functions (`t * t * (3 - 2 * t)`) to give the doors weight
     * and momentum, rather than just snapping them open linearly.
     *
     * @param {THREE.Group} door - The door group.
     * @param {THREE.Vector3} playerPos - The player's current position.
     * @param {number} delta - Time elapsed since last frame.
     */
    updateSliderDoor(door, playerPos, delta) {
        const env = this.env;
        const ud = door.userData;
        if (ud.isAirlockDoor) return;
        const pDistSq = playerPos.distanceToSquared(door.position);
        const entityOpen = ud.entityOpen === true;
        ud.entityOpen = false;
        if (pDistSq > 900.0 && ud.progress === 0 && !entityOpen) return;
        const shouldOpen = entityOpen || pDistSq < 20.0;
        const target = shouldOpen ? 1.0 : 0.0;
        const travelAxis = ud.spansX ? 'z' : 'x';
        const playerOutside = ((playerPos[travelAxis] - door.position[travelAxis]) * ud.outSign) > 0;
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
        if (ud.progress === target) return;
        const speed = entityOpen ? 3.0 : 0.9;
        const dir = target > ud.progress ? 1 : -1;
        ud.progress = Math.max(0, Math.min(1, ud.progress + dir * speed * delta));
        const t = ud.progress;
        const eased = t * t * (3 - 2 * t);
        const axis = ud.spansX ? 'x' : 'z';
        for (let i = 0; i < 2; i++) {
            const p = ud.panels[i];
            p.position[axis] = ud.baseOffsets[i] + ud.signs[i] * eased * ud.slideDist;
        }
        env.lumenGrid.shadowsDirty = true;
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

    /**
     * Master update loop for all interactable objects in the environment.
     *
     * This handles raycast-less "look at" detection by taking the dot product
     * between the camera's forward vector and the vector pointing from the player to the object.
     * If the dot product is close to 1.0, the player is looking directly at it. This is significantly
     * faster than firing raycasts every frame.
     *
     * @param {THREE.Vector3} playerPos - The player's position.
     * @param {number} delta - Time elapsed since last frame.
     */
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
            const distSq = obj.position.distanceToSquared(playerPos);
            if (distSq < closestDistSq) {
                this._lookDir.subVectors(obj.position, playerPos).normalize();
                if (this._camDir.dot(this._lookDir) > 0.75) {
                    closestDistSq = distSq;
                    lookingAtHit = true;
                }
            }
        };
        if (env.interactables) env.interactables.forEach(checkObj);
        if (env.interactiveDoors) env.interactiveDoors.forEach(checkObj);
        env.isLookingAtInteractable = lookingAtHit;
        env._updateBreakerScan(playerPos, delta);
        if (env.airlocks) {
            env.airlocks.forEach(airlock => env._updateAirlock(airlock, playerPos, delta));
        }
        env.interactiveDoors.forEach(door => {
            if (door.userData.isSlider) {
                env._updateSliderDoor(door, playerPos, delta);
                return;
            }
            if (door.userData.codeLocked) door.userData.entityOpen = false;
            const pDistSq = playerPos.distanceToSquared(door.position);
            if (pDistSq > 400.0 && !door.userData.isLatched && !door.userData.entityOpen) return;
            const playerOpen = door.userData.playerOpen === true;
            const entityOpen = door.userData.entityOpen === true;
            door.userData.entityOpen = false;
            const isOpen = playerOpen || entityOpen;
            let targetRot = door.userData.closedRot;
            if (isOpen) {
                if (!door.userData.isLatched) {
                    const triggerPos = (entityOpen && !playerOpen) ? env.anomaly.group.position : playerPos;
                    const isZDoor = door.userData.useXApproach ? false :
                        (Math.abs(door.userData.closedRot) < 0.1 || Math.abs(door.userData.closedRot - Math.PI) < 0.1);
                    const swingAngle = Math.PI / 2.2;
                    let desiredRot;
                    if (isZDoor) {
                        const approachZ = triggerPos.z - door.position.z;
                        desiredRot = approachZ < 0 ? (door.userData.closedRot + swingAngle) : (door.userData.closedRot - swingAngle);
                    } else {
                        const approachX = triggerPos.x - door.position.x;
                        desiredRot = approachX < 0 ? (door.userData.closedRot - swingAngle) : (door.userData.closedRot + swingAngle);
                    }
                    door.userData.latchedRot = desiredRot;
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
                door.rotation.y = door.userData.currentRot;
                env.lumenGrid.shadowsDirty = true;
                if (door.userData.box && isOpen) {
                    if (!door.userData.box.isEmpty()) door.userData.box.makeEmpty();
                }
                if (pDistSq < 2.5) {
                    const pushDist = Math.sqrt(pDistSq) || 0.1;
                    const pushStrength = (2.5 - pDistSq) * 15.0;
                    const pushX = ((playerPos.x - door.position.x) / pushDist) * pushStrength;
                    const pushZ = ((playerPos.z - door.position.z) / pushDist) * pushStrength;
                    const cosY = Math.cos(env.camera.rotation.y);
                    const sinY = Math.sin(env.camera.rotation.y);
                    const localVx = pushX * cosY - pushZ * sinY;
                    const localVz = pushX * sinY + pushZ * cosY;
                    env.player.velocity.x -= localVx;
                    env.player.velocity.z += localVz;
                }
            } else if (door.userData.currentRot !== targetRot) {
                door.userData.currentRot = targetRot;
                door.rotation.y = targetRot;
                if (!isOpen && door.userData.box) {
                    door.updateMatrixWorld(true);
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
                if (obj.userData.type === 'grate' && !obj.userData.active) {
                    const targetRot = -Math.PI / 2;
                    const diff = obj.userData.blocksX ? (targetRot - obj.rotation.z) : (targetRot - obj.rotation.x);
                    if (Math.abs(diff) > 0.01) {
                        if (obj.userData.blocksX) obj.rotation.z += diff * 15.0 * delta;
                        else obj.rotation.x += diff * 15.0 * delta;
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
                        if (Math.random() > 0.8 && env.interactables) {
                            const almondGroup = new THREE.Group();
                            almondGroup.add(env.almondPrefab.clone());
                            const aGlow = new THREE.Mesh(env.glowGeo, env.glowMat);
                            aGlow.scale.set(0.15, 0.15, 0.15);
                            aGlow.position.y = 0.01;
                            almondGroup.add(aGlow);
                            almondGroup.position.copy(obs.position);
                            almondGroup.position.y = 0.1;
                            almondGroup.userData = {type: 'almond', chunkHash: obs.userData.chunkHash, active: true};
                            obs.parent.add(almondGroup);
                            env.interactables.push(almondGroup);
                        }
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

    /**
     * Updates an individual door belonging to an airlock sequence.
     * @param {Object} doorObj - The airlock door data wrapper.
     * @param {number} delta - Time elapsed since last frame.
     */
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
            const speed = ud.entityOpen ? 3.0 : 1.2;
            const dir = target > ud.progress ? 1 : -1;
            ud.progress = Math.max(0, Math.min(1, ud.progress + dir * speed * delta));
            const t = ud.progress;
            const eased = t * t * (3 - 2 * t);
            const axis = ud.spansX ? 'x' : 'z';
            for (let i = 0; i < 2; i++) {
                const p = ud.panels[i];
                p.position[axis] = ud.baseOffsets[i] + ud.signs[i] * eased * ud.slideDist;
            }
            env.lumenGrid.shadowsDirty = true;
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
        ud.entityOpen = false;
    }

    /**
     * State machine for airlock sequences.
     *
     * Airlocks serve as hidden loading zones and sector transitions.
     * By locking the player inside a small chamber while "cycling", the engine has time to
     * load/unload sector assets, swap audio profiles, and change global fog settings
     * without the player seeing the geometry pop in or out.
     *
     * Educational Note: `CYCLING`'s fixed `cycleDuration` alone only ever guaranteed a minimum
     * wait, not a maximum -- it had no idea whether the room on the other side of the door
     * actually existed yet. Entering a sector (`openedFrom === 'OUTSIDE'`) now also requires
     * `env.isMacroChunkContentReady(airlock.chunkHash)`, which mirrors the moment
     * `env.beginMacroChunkContent` was fired back in `OUTER_OPENING` -- as early as possible, so
     * the build gets maximum wall-clock time before it's needed. So the chamber holds the
     * player for however long is longer: the scripted cycle, or the actual build. See
     * `Environment.buildChunk` for why a sector's interior is built lazily in the first place.
     *
     * @param {Object} airlock - The airlock data structure.
     * @param {THREE.Vector3} playerPos - The player's position.
     * @param {number} delta - Time elapsed since last frame.
     */
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
                } else if (!isPlayerInChamber && pDistOuterSq > 30.0) {
                    airlock.state = 'CLOSING_AFTER_EXIT';
                }
                break;
            case 'INNER_OPENING':
                airlock.innerDoor.data.target = 1.0;
                airlock.outerDoor.data.target = 0.0;
                if (isPlayerInChamber) {
                    airlock.state = 'AWAITING_SWITCH';
                } else if (!isPlayerInChamber && pDistInnerSq > 30.0) {
                    airlock.state = 'CLOSING_AFTER_EXIT';
                }
                break;
            case 'AWAITING_SWITCH':
                if (switchPressed) {
                    airlock.state = 'WAIT_IN_CHAMBER';
                } else if (!isPlayerInChamber) {
                    if (airlock.openedFrom === 'OUTSIDE' && pDistOuterSq > 30.0) {
                        airlock.state = 'CLOSING_AFTER_EXIT';
                    } else if (airlock.openedFrom === 'INSIDE' && pDistInnerSq > 30.0) {
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
                if (airlock.outerDoor.data.progress === 0 && airlock.innerDoor.data.progress === 0) {
                    airlock.state = 'IDLE';
                }
                break;
        }
        const isReadyToPass = airlock.state === 'EXIT_INNER' || airlock.state === 'EXIT_OUTER' || airlock.state === 'OUTER_OPENING' || airlock.state === 'INNER_OPENING';
        const targetMat = isReadyToPass ? env.airlockGreenMat : env.airlockRedMat;
        env._updateAirlockDoor(airlock.outerDoor, delta);
        env._updateAirlockDoor(airlock.innerDoor, delta);
    }
}