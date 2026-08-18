const POOL_NON_SHADOW_SCALAR = 0.35;

const PROP_GLOW_SLOT_BIAS = 40.0;

const _glowPos = new THREE.Vector3();

export function attachPropGlow(env, obj, hash, {color, intensity, distance, offset, flickerOffset = 0}) {
    if (!env.fixtureData) return null;
    obj.updateMatrixWorld(true);
    _glowPos.set(offset ? offset[0] : 0, offset ? offset[1] : 0, offset ? offset[2] : 0);
    obj.localToWorld(_glowPos);
    const scaled = intensity / POOL_NON_SHADOW_SCALAR;
    const fixture = {
        chunkHash: hash,
        position: _glowPos.clone(),
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
