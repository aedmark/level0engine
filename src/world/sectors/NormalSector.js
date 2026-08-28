export default class NormalSector {
    static buildMaterials(env, assets) {
        const {carpetTexture, ceilingTexture, ceilingBumpTexture} = assets;
        carpetTexture.repeat.set(16, 16);
        ceilingTexture.repeat.set(20, 20);
        ceilingBumpTexture.repeat.set(20, 20);
        env.carpetMat = new THREE.MeshStandardMaterial({
            map: carpetTexture,
            roughness: 1.0,
            metalness: 0.0,
            bumpMap: carpetTexture,
            bumpScale: 0.015
        });
        env.ceilMat = new THREE.MeshStandardMaterial({
            map: ceilingTexture,
            color: 0xffffff,
            roughness: 0.92,
            metalness: 0.0,
            bumpMap: ceilingBumpTexture,
            bumpScale: 0.02
        });
        env.ceilMatHall = env.ceilMat.clone();
        env.ceilMatHall.map = ceilingTexture.clone();
        env.ceilMatHall.map.repeat.set(1, 1);
        env.ceilMatHall.map.needsUpdate = true;
        env.ceilMatHall.bumpMap = ceilingBumpTexture.clone();
        env.ceilMatHall.bumpMap.repeat.set(1, 1);
        env.ceilMatHall.bumpMap.needsUpdate = true;
    }
}
