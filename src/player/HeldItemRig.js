export function clamp(val, max) {
    return Math.max(-max, Math.min(max, val));
}

export function buildHandSkinTexture() {
    const S = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = S;
    const c = canvas.getContext('2d');
    c.fillStyle = '#a87a5e';
    c.fillRect(0, 0, S, S);
    for (let i = 0; i < 420; i++) {
        const x = Math.random() * S, y = Math.random() * S;
        const r = 1 + Math.random() * 7;
        const warm = Math.random() > 0.45;
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fillStyle = warm
            ? `rgba(158,96,72,${(0.03 + Math.random() * 0.07).toFixed(3)})`
            : `rgba(206,168,138,${(0.03 + Math.random() * 0.07).toFixed(3)})`;
        c.fill();
    }
    for (let i = 0; i < 26; i++) {
        const x = Math.random() * S, y = Math.random() * S;
        c.strokeStyle = `rgba(92,56,40,${(0.06 + Math.random() * 0.10).toFixed(3)})`;
        c.lineWidth = 0.6 + Math.random() * 1.0;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + (Math.random() - 0.5) * 22, y + (Math.random() - 0.5) * 8);
        c.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

export function buildFinger(lengths, curls, rad, skin) {
    const root = new THREE.Group();
    let parent = root;
    for (let i = 0; i < lengths.length; i++) {
        const len = lengths[i];
        const r = rad * (1 - i * 0.13);
        const joint = new THREE.Group();
        joint.rotation.x = curls[i];
        parent.add(joint);
        const knuckle = new THREE.Mesh(new THREE.SphereGeometry(r * 1.06, 8, 6), skin);
        joint.add(knuckle);
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r * 0.88, len, 8), skin);
        seg.position.y = len / 2;
        joint.add(seg);
        if (i === lengths.length - 1) {
            const tip = new THREE.Mesh(new THREE.SphereGeometry(r * 0.9, 8, 6), skin);
            tip.position.y = len;
            tip.scale.set(1, 0.85, 1);
            joint.add(tip);
        }
        const next = new THREE.Group();
        next.position.y = len;
        joint.add(next);
        parent = next;
    }
    return root;
}

// config: {palmX, fingers: [{x, y, len, curl, r}], thumb: {len, curl, r, position, rotation}, forearmPosition, forearmRotation}
// Returns {hand, forearm} — caller is responsible for stashing `forearm` if it needs it later.
export function buildHeldHand(config) {
    const hand = new THREE.Group();
    const skinTex = buildHandSkinTexture();
    const skin = new THREE.MeshStandardMaterial({
        map: skinTex, roughness: 0.78, metalness: 0.0,
        emissive: 0x120a06, emissiveIntensity: 0.35
    });
    const cuffMat = new THREE.MeshStandardMaterial({
        color: 0x3f4438, roughness: 0.96, metalness: 0.0,
        emissive: 0x0a0b08, emissiveIntensity: 0.3
    });

    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.132, 0.122, 0.032), skin);
    palm.position.set(config.palmX, -0.008, -0.036);
    palm.rotation.x = -0.06;
    hand.add(palm);
    const heel = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), skin);
    heel.scale.set(1.15, 0.72, 0.42);
    heel.position.set(config.palmX, -0.062, -0.038);
    hand.add(heel);

    for (const f of config.fingers) {
        const finger = buildFinger(f.len, f.curl, f.r, skin);
        finger.position.set(f.x, f.y, -0.040);
        finger.rotation.z = -f.x * 1.6;
        hand.add(finger);
    }

    const thumb = buildFinger(config.thumb.len, config.thumb.curl, config.thumb.r, skin);
    thumb.position.copy(config.thumb.position);
    thumb.rotation.copy(config.thumb.rotation);
    hand.add(thumb);

    const forearm = new THREE.Group();
    forearm.position.copy(config.forearmPosition);
    forearm.rotation.copy(config.forearmRotation);

    const WRIST_LEN = 0.075, CUFF_LEN = 0.055, SLEEVE_LEN = 0.26;
    const CUFF_LAP = 0.014, SLEEVE_LAP = 0.010;
    const cuffTop = -(WRIST_LEN - CUFF_LAP);
    const sleeveTop = cuffTop - CUFF_LEN + SLEEVE_LAP;

    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.045, WRIST_LEN, 12), skin);
    wrist.position.y = -WRIST_LEN / 2;
    forearm.add(wrist);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.062, CUFF_LEN, 12), cuffMat);
    cuff.position.y = cuffTop - CUFF_LEN / 2;
    forearm.add(cuff);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.057, 0.070, SLEEVE_LEN, 12), cuffMat);
    sleeve.position.y = sleeveTop - SLEEVE_LEN / 2;
    forearm.add(sleeve);
    hand.add(forearm);

    return {hand, forearm};
}

// instance needs: .player, .environment, ._probeVec (Vector3), .basePos (Vector3)
export function computeProximityTuck(instance, cam, reach, clear = 0.15) {
    const state = instance.player.input ? instance.player.input.state : null;
    if (instance.player.isSqueezing || (state && state.isCrawling)) return 1;
    const env = instance.environment;
    if (!env || !env.spatialGrid || !env.spatialGrid.getNearby) return 0;

    instance._probeVec.copy(instance.basePos).applyQuaternion(cam.quaternion);
    const cx = cam.position.x + instance._probeVec.x;
    const cy = cam.position.y + instance._probeVec.y;
    const cz = cam.position.z + instance._probeVec.z;

    const boxes = env.spatialGrid.getNearby(cx, cz, reach + 0.5);
    let nearestSq = Infinity;

    for (let i = 0; i < boxes.length; i++) {
        const box = boxes[i];
        if (box.isInvisibleBlocker) continue;

        const clampX = Math.max(box.min.x, Math.min(cx, box.max.x));
        const clampY = Math.max(box.min.y, Math.min(cy, box.max.y));
        const clampZ = Math.max(box.min.z, Math.min(cz, box.max.z));

        const dx = cx - clampX;
        const dy = cy - clampY;
        const dz = cz - clampZ;
        const dSq = dx * dx + dy * dy + dz * dz;

        if (dSq < nearestSq) nearestSq = dSq;
    }

    if (nearestSq >= reach * reach) return 0;
    const d = Math.sqrt(nearestSq);
    return Math.max(0, Math.min(1, 1 - (d - clear) / (reach - clear)));
}

export function computeGaitSwing(player) {
    const phase = (player.headBobPhase || 0) * 0.35;
    const gait = player.gait || 0;
    return {
        phase, gait,
        swingX: Math.sin(phase) * 0.020 * gait,
        swingY: Math.sin(phase * 2.0) * 0.013 * gait,
        swingRoll: Math.sin(phase) * 0.055 * gait,
        swingPitch: Math.sin(phase * 2.0 + 0.6) * 0.030 * gait
    };
}

// instance needs: ._prevYaw, ._prevPitch, ._trailYaw, ._trailPitch (mutated in place)
export function updateTrailTracking(instance, cam, dt) {
    let dYaw = cam.rotation.y - instance._prevYaw;
    while (dYaw > Math.PI) dYaw -= Math.PI * 2;
    while (dYaw < -Math.PI) dYaw += Math.PI * 2;
    const dPitch = cam.rotation.x - instance._prevPitch;
    instance._prevYaw = cam.rotation.y;
    instance._prevPitch = cam.rotation.x;
    const invDt = 1 / Math.max(dt, 1e-4);
    const yawRate = clamp(dYaw * invDt, 6.0);
    const pitchRate = clamp(dPitch * invDt, 6.0);
    const follow = Math.min(1, dt * 9.0);
    instance._trailYaw += (yawRate - instance._trailYaw) * follow;
    instance._trailPitch += (pitchRate - instance._trailPitch) * follow;
}

// instance needs: .player, ._swayX, ._swayY, ._swayZ (mutated in place)
export function updateSway(instance, cam, dt) {
    const speed = Math.sqrt(
        instance.player.velocity.x * instance.player.velocity.x +
        instance.player.velocity.z * instance.player.velocity.z
    );
    const sinY = Math.sin(cam.rotation.y), cosY = Math.cos(cam.rotation.y);
    const vRight = instance.player.velocity.x * cosY - instance.player.velocity.z * sinY;
    const vForward = -instance.player.velocity.x * sinY - instance.player.velocity.z * cosY;
    const lagX = -clamp(vRight * 0.0105, 0.045);
    const lagY = -clamp(speed * 0.0060, 0.035);
    const lagZ = clamp(vForward * 0.0075, 0.032);
    instance._swayX += (lagX - instance._swayX) * Math.min(1, dt * 11.0);
    instance._swayY += (lagY - instance._swayY) * Math.min(1, dt * 10.0);
    instance._swayZ += (lagZ - instance._swayZ) * Math.min(1, dt * 8.0);
}
