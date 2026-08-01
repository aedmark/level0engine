/**
 * A centralized factory for generating and caching Three.js materials and geometries.
 *
 * To keep the game bundle extremely small and avoid loading external image files,
 * this engine procedurally generates its textures at runtime using the HTML5 2D Canvas API.
 * (e.g. `dpCanvas` for diamond plate, `ccv` for soot-stained ceilings). These canvases are
 * then converted into `THREE.CanvasTexture` objects.
 */
export default class MaterialLibrary {
    /**
     * Injects dynamically generated geometries, materials, and procedural textures
     * into the provided environment instance. Initializes shared assets used across the world.
     * @param {Object} env - The target Environment instance to inject materials into.
     */
    static injectMaterials(env) {
        if (env.sharedWallGeo) return;
        env.sharedWallGeo = new THREE.BoxGeometry(env.cellSize + 0.02, 3.02, env.cellSize + 0.02);
        env.sharedWallMat = new THREE.MeshStandardMaterial({
            map: env.wallTexture,
            color: 0xffffff,
            roughness: 0.75,
            metalness: 0.05,
            bumpMap: env.wallTexture,
            bumpScale: 0.010
        });
        env.sharedPanelGeo = new THREE.BoxGeometry(0.98, 0.05, 1.98);
        env.pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, env.cellSize, 8);
        env.pipeGeo.rotateZ(Math.PI / 2);
        env.pipeJointGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.25, 8);
        env.pipeJointGeo.rotateZ(Math.PI / 2);
        env.pipeJunctionGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
        env.pipeMountGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8);
        env.vPipeGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.0, 8);
        // The bump used to be `structMat.map` -- the structural concrete texture, dark
        // horizontal bands and all -- at bumpScale 0.03. Wrapped round a cylinder those bands
        // read as stacked concrete rings, so every drum, pillar and pipe on this material
        // looked poured rather than forged. `corrosionBumpTexture` is pitting and scale with
        // no direction to it, which is what this needs given it also skins Chasm pillars and
        // Incinerator walls.
        env.rustMat = new THREE.MeshStandardMaterial({
            color: 0x4a433a,
            roughness: 0.70,
            // See _buildPipeMaterial: with no envMap in the scene, metalness only removes
            // diffuse and returns nothing. This was 0.3 originally; 0.45 made every drum and
            // pillar go flat under the hemisphere light.
            metalness: 0.10,
            bumpMap: env.corrosionBumpTexture || env.structMat.map,
            bumpScale: env.corrosionBumpTexture ? 0.012 : 0.03
        });
        env.cushionGeo = new THREE.BoxGeometry(0.8, 0.15, 0.8);
        env.backrestGeo = new THREE.BoxGeometry(0.8, 0.8, 0.15);
        env.legGeo = new THREE.BoxGeometry(0.1, 0.4, 0.1);
        env.couchSeatGeo = new THREE.BoxGeometry(2.2, 0.3, 0.85);
        env.couchBackGeo = new THREE.BoxGeometry(2.2, 0.7, 0.18);
        env.couchArmGeo = new THREE.BoxGeometry(0.18, 0.55, 0.85);
        env.tableTopGeo = new THREE.BoxGeometry(1.2, 0.05, 1.2);
        env.tableBaseGeo = new THREE.BoxGeometry(0.5, 0.8, 0.5);
        env.tableLegGeo = new THREE.BoxGeometry(0.1, 0.88, 0.1);
        env.wallVentMat = env.ventMat.clone();
        env.wallVentMat.map = env.ventMat.map.clone();
        env.wallVentMat.map.repeat.set(1, 1);
        env.serverFloorMat = env.ventMat.clone();
        env.serverFloorMat.map = env.ventMat.map.clone();
        env.serverFloorMat.map.repeat.set(64, 32);
        env.serverFloorMat.metalness = 0.2;
        env.serverFloorMat.roughness = 0.85;
        env.serverCeilingMat = env.serverFloorMat.clone();
        env.serverCeilingMat.metalness = 0.0;
        env.serverCeilingMat.roughness = 0.95;
        env.boardCeilingMat = env.clinicMat.clone();
        env.boardCeilingMat.metalness = 0.0;
        env.boardCeilingMat.roughness = 0.95;
        env.breakerBaseGeo = new THREE.BoxGeometry(0.6, 0.8, 0.20);
        env.breakerDoorGeo = new THREE.BoxGeometry(0.6, 0.8, 0.05);
        env.breakerDoorGeo.translate(0.3, 0, 0);
        env.breakerHandleGeo = new THREE.BoxGeometry(0.05, 0.2, 0.05);
        env.breakerHandleMat = new THREE.MeshStandardMaterial({color: 0x2b2b2b, roughness: 0.4, metalness: 0.8});
        env.crtScreenMat = new THREE.MeshStandardMaterial({
            color: 0xffb000,
            emissive: 0xffb000,
            emissiveIntensity: 0.8,
            roughness: 0.2
        });
        env.documentMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.9,
            metalness: 0.0
        });
        env.terminalBodyGeo = new THREE.BoxGeometry(0.5, 0.4, 0.5);
        env.documentGeo = new THREE.PlaneGeometry(0.2, 0.3);
        env.documentGeo.rotateX(-Math.PI / 2);
        env.geoCache = new Map();
        env.almondPrefab = new THREE.Group();
        const aBodyGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.12, 16);
        const aNeckGeo = new THREE.CylinderGeometry(0.012, 0.035, 0.05, 16);
        const aCapGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.015, 12);
        const aBody = new THREE.Mesh(aBodyGeo, env.almondMat);
        aBody.position.y = 0.06;
        const aNeck = new THREE.Mesh(aNeckGeo, env.clinicMat);
        aNeck.position.y = 0.12 + 0.025;
        const aCap = new THREE.Mesh(aCapGeo, env.metalMat);
        aCap.position.y = 0.12 + 0.05 + 0.0075;
        env.almondPrefab.add(aBody, aNeck, aCap);
        env.batteryPrefab = new THREE.Group();
        const bBodyGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.16, 16);
        const bRimGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.015, 16);
        const bTermGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.02, 12);
        const bBody = new THREE.Mesh(bBodyGeo, env.hazardMat);
        bBody.position.y = 0.08;
        const bTopRim = new THREE.Mesh(bRimGeo, env.metalMat);
        bTopRim.position.y = 0.16 - 0.0075;
        const bBotRim = new THREE.Mesh(bRimGeo, env.metalMat);
        bBotRim.position.y = 0.0075;
        const bTerm = new THREE.Mesh(bTermGeo, env.metalMat);
        bTerm.position.y = 0.16 + 0.01;
        env.batteryPrefab.add(bBody, bTopRim, bBotRim, bTerm);
        env.observerMat = new THREE.MeshBasicMaterial({color: 0x010101, transparent: true, opacity: 0.85});
        env.observerGeo = new THREE.CylinderGeometry(0.15, 0.1, 1.9, 8);
        env.observers = [];
        env.sharedAssets = new Set();
        Object.values(env).forEach(v => {
            if (v && v.isGeometry) env.sharedAssets.add(v.uuid);
            if (v && v.isMaterial) env.sharedAssets.add(v.uuid);
        });
    }
}