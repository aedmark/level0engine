const POOL_NON_SHADOW_SCALAR = 0.35;

const PROP_GLOW_SLOT_BIAS = 40.0;

const _glowPos = new THREE.Vector3();
const _targetPos = new THREE.Vector3();

export function attachPropGlow(env, obj, hash, {
    color,
    intensity,
    distance,
    offset,
    flickerOffset = 0,
    isSpot = true,
    targetOffset,
    spotAngle = Math.PI / 2.3,
    spotPenumbra = 0.6
}) {
    if (!env.fixtureData) return null;
    obj.updateMatrixWorld(true);
    _glowPos.set(offset ? offset[0] : 0, offset ? offset[1] : 0, offset ? offset[2] : 0);
    obj.localToWorld(_glowPos);

    let finalTargetPos = null;
    if (isSpot) {
        if (targetOffset) {
            _targetPos.set(targetOffset[0], targetOffset[1], targetOffset[2]);
            obj.localToWorld(_targetPos);
        } else {
            _targetPos.set(0, 1, 0);
            _targetPos.transformDirection(obj.matrixWorld);
            _targetPos.multiplyScalar(2.0).add(_glowPos);
        }
        finalTargetPos = _targetPos.clone();
    }

    const scaled = intensity / POOL_NON_SHADOW_SCALAR;
    const fixture = {
        chunkHash: hash,
        position: _glowPos.clone(),
        targetPos: finalTargetPos,
        isSpot: !!isSpot,
        spotAngle,
        spotPenumbra,
        color: new THREE.Color(color),
        distance,
        baseIntensity: scaled,
        targetIntensity: scaled,
        currentIntensity: scaled,
        flickerOffset,
        noShadow: true,
        noGlare: true,
        slotBias: PROP_GLOW_SLOT_BIAS,
        isPropGlow: true
    };
    env.fixtureData.push(fixture);
    obj.userData.glowFixture = fixture;
    return fixture;
}

export function releasePropLighting(env, obj) {
    const fixture = obj.userData && obj.userData.glowFixture;
    if (fixture) {
        obj.userData.glowFixture = null;
        const idx = env.fixtureData.indexOf(fixture);
        if (idx !== -1) env.fixtureData.splice(idx, 1);
    }

    const host = obj.parent;
    if (!host) return;
    const strays = [];
    obj.traverse((o) => {
        if (o.isLight) strays.push(o);
    });
    if (!strays.length) return;
    host.updateWorldMatrix(true, false);
    for (const light of strays) {
        light.updateWorldMatrix(true, false);
        _glowPos.setFromMatrixPosition(light.matrixWorld);
        light.intensity = 0;
        host.add(light);
        host.worldToLocal(_glowPos);
        light.position.copy(_glowPos);
    }
}
