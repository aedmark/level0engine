// Shared shard-burst particle kinematics used by IncineratorEntity's ember shower and
// BackupDaemonEntity's cable sparks — both are a pool of tetrahedra flung outward from a
// point and dropped under gravity until they land, then held dormant until the next burst.

export function buildShardSlot({shardGeo, shardMat, shardCount, light, cycleTimer = 0}) {
    const group = new THREE.Group();
    group.add(light);
    const shards = [];
    for (let i = 0; i < shardCount; i++) {
        const mesh = new THREE.Mesh(shardGeo, shardMat);
        mesh.visible = false;
        group.add(mesh);
        shards.push({
            mesh,
            localX: 0, localY: 0, localZ: 0,
            velX: 0, velY: 0, velZ: 0,
            landed: true,
            launchDelay: 0
        });
    }
    return {group, light, shards, cycleTimer};
}

export function launchShardBurst(shards, {
    angleJitter = 0.9,
    speedMin = 1.0,
    speedRange = 1.2,
    velYBase = 1.0,
    velYRange = 1.0,
    extraVelY = 0,
    launchDelayRange = 0.15
} = {}) {
    const angle = Math.random() * Math.PI * 2;
    shards.forEach(s => {
        const a = angle + (Math.random() - 0.5) * angleJitter;
        const speed = speedMin + Math.random() * speedRange;
        s.velX = Math.cos(a) * speed;
        s.velZ = Math.sin(a) * speed;
        s.velY = velYBase + Math.random() * velYRange + extraVelY;
        s.localX = 0;
        s.localY = 0;
        s.localZ = 0;
        s.landed = false;
        s.launchDelay = Math.random() * launchDelayRange;
        s.mesh.visible = false;
    });
}

export function stepShardPhysics(shards, delta, gravity, floorLocalY, rotSpeedX, rotSpeedY) {
    shards.forEach(s => {
        if (s.landed) return;
        if (s.launchDelay > 0) {
            s.launchDelay -= delta;
            return;
        }
        s.mesh.visible = true;
        s.velY -= gravity * delta;
        s.localX += s.velX * delta;
        s.localY += s.velY * delta;
        s.localZ += s.velZ * delta;
        if (s.localY <= floorLocalY) {
            s.localY = floorLocalY;
            s.landed = true;
            s.mesh.visible = false;
        }
        s.mesh.position.set(s.localX, s.localY, s.localZ);
        s.mesh.rotation.x += rotSpeedX;
        s.mesh.rotation.y += rotSpeedY;
    });
}
