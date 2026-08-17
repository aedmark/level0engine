import {makeDuctInterior} from './DuctLighting.js';

/**
 * Every block below is copied verbatim from the `if (!env.xMat) {...}` singleton it
 * pre-empts — AnnexSector, ServerSector, SetPieces, and the rest each still carry their
 * own copy, gating on the same field, so nothing here changes what gets built or when a
 * sector first uses it. The only thing that changes is *who* pays for the first compile.
 *
 * These are the materials `ShaderWarmup._materialiseLazySectorAssets` cannot reach: it
 * calls each sector's top-level blueprint factory (`AnnexSector(env, ctx)` and siblings)
 * to force their *unconditional* materials into existence, but never calls the `build()`
 * function that factory returns — that only runs later, per real chunk, during play. Any
 * material created inside `build()` itself — gated behind a spawn roll, a keypad branch,
 * an RNG-selected furniture piece — is invisible to that pass and compiles cold the first
 * time a player's camera actually reaches it.
 *
 * Called once from ShaderWarmup, after `lazyLoadSectorAssets` has populated the per-sector
 * texture bundles (env.rustMat, env.emberGrateMat, env.pegboardTex, ...) these blocks clone
 * or fall back to.
 */
export function warmLazySectorMaterials(env) {
    if (!env.laptopScreenMat) {
        env.laptopScreenMat = new THREE.MeshBasicMaterial({color: 0xa8ffd0});
        env.sharedAssets.add(env.laptopScreenMat.uuid);
    }
    if (!env.exitKeyMat) {
        env.exitKeyMat = new THREE.MeshStandardMaterial({
            color: 0xb8912f, roughness: 0.32, metalness: 0.95,
            emissive: 0x3a2c08, emissiveIntensity: 0.6
        });
        env.sharedAssets.add(env.exitKeyMat.uuid);
    }
    if (!env._impTireMat) {
        env._impTireMat = new THREE.MeshStandardMaterial({color: 0x161618, roughness: 0.95, metalness: 0.0});
        env.sharedAssets.add(env._impTireMat.uuid);
    }
    if (!env.airlockRedMat) {
        env.airlockRedMat = new THREE.MeshBasicMaterial({color: 0xff2222});
        env.airlockGreenMat = new THREE.MeshBasicMaterial({color: 0x22ff44});
    }
    if (!env.palletWoodMat) {
        env.palletWoodMat = new THREE.MeshStandardMaterial({color: 0x8b7355, roughness: 0.9});
        if (env.sharedAssets) env.sharedAssets.add(env.palletWoodMat.uuid);
    }
    if (!env.archiveBowlMat && env.rustMat) {
        env.archiveBowlMat = env.rustMat.clone();
        env.archiveBowlMat.side = THREE.DoubleSide;
        env.sharedAssets.add(env.archiveBowlMat.uuid);
    }
    if (!env.atriumPipeMat) {
        env.atriumPipeMat = new THREE.MeshStandardMaterial({color: 0x111111, roughness: 0.8, metalness: 0.5});
        env.sharedAssets.add(env.atriumPipeMat.uuid);
    }
    if (!env.blackIronMat) {
        env.blackIronMat = new THREE.MeshStandardMaterial({color: 0x151515, roughness: 0.7, metalness: 0.9});
    }

    if (!env.matrixVoidMat) {
        env.matrixVoidMat = new THREE.MeshBasicMaterial({color: 0xffffff});
    }
    if (!env.cartLatticeMat) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx2d = canvas.getContext('2d', {alpha: false});
        ctx2d.fillStyle = '#000000';
        ctx2d.fillRect(0, 0, 64, 64);
        ctx2d.fillStyle = '#ffffff';
        ctx2d.fillRect(0, 0, 64, 8);
        ctx2d.fillRect(0, 0, 8, 64);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4, 4);
        env.cartLatticeMat = new THREE.MeshStandardMaterial({
            color: env.paintedSteelMat ? env.paintedSteelMat.color : 0x777777,
            roughness: 0.3,
            metalness: 0.8,
            alphaMap: tex,
            alphaTest: 0.5,
            side: THREE.DoubleSide
        });
        if (env.sharedAssets) env.sharedAssets.add(env.cartLatticeMat.uuid);
    }
    if (!env.soupCanMat) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx2d = canvas.getContext('2d', {alpha: false});
        ctx2d.fillStyle = '#999999';
        ctx2d.fillRect(0, 0, 128, 128);
        ctx2d.fillStyle = '#cc2222';
        ctx2d.fillRect(0, 20, 128, 44);
        ctx2d.fillStyle = '#ffffff';
        ctx2d.fillRect(0, 64, 128, 44);
        ctx2d.fillStyle = '#000000';
        ctx2d.font = 'bold 24px monospace';
        ctx2d.textAlign = 'center';
        ctx2d.fillText('SOUP', 64, 52);
        const tex = new THREE.CanvasTexture(canvas);
        env.soupCanMat = new THREE.MeshStandardMaterial({
            map: tex, roughness: 0.4, metalness: 0.5
        });
        if (env.sharedAssets) env.sharedAssets.add(env.soupCanMat.uuid);
    }
    if (!env.brownPaperMat) {
        env.brownPaperMat = new THREE.MeshStandardMaterial({
            color: 0x8b6546, roughness: 0.9, bumpMap: env.carpetMat ? env.carpetMat.map : null, bumpScale: 0.05,
            side: THREE.DoubleSide
        });
    }
    if (!env.flyerMat) {
        env.flyerMat = new THREE.MeshStandardMaterial({
            color: 0xdddddd, roughness: 0.8
        });
    }
    if (!env.vendingPanelMat) {
        const VENDING_GLOW = 0.6;
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 512;
        const ctx2d = canvas.getContext('2d', {alpha: false});
        ctx2d.fillStyle = '#ccffff';
        ctx2d.fillRect(0, 0, 256, 512);
        ctx2d.fillStyle = '#ff3333';
        ctx2d.font = 'bold 50px monospace';
        ctx2d.textAlign = 'center';
        ctx2d.fillText('SODA', 128, 80);
        ctx2d.fillStyle = '#1155cc';
        ctx2d.fillRect(80, 150, 96, 160);
        ctx2d.fillStyle = '#aaaaaa';
        ctx2d.beginPath();
        ctx2d.ellipse(128, 150, 48, 16, 0, 0, Math.PI * 2);
        ctx2d.fill();
        ctx2d.beginPath();
        ctx2d.ellipse(128, 310, 48, 16, 0, 0, Math.PI * 2);
        ctx2d.fill();
        ctx2d.fillStyle = '#ffffff';
        ctx2d.font = 'bold 24px monospace';
        ctx2d.fillText('COLA', 128, 240);
        ctx2d.fillStyle = '#111111';
        ctx2d.fillRect(200, 100, 40, 300);
        for (let i = 0; i < 6; i++) {
            ctx2d.fillStyle = '#555555';
            ctx2d.fillRect(208, 120 + i * 40, 24, 20);
        }
        ctx2d.fillStyle = '#000000';
        ctx2d.fillRect(216, 380, 8, 24);
        ctx2d.fillStyle = '#0a0a0a';
        ctx2d.fillRect(20, 400, 216, 80);
        const tex = new THREE.CanvasTexture(canvas);
        env.vendingPanelMat = new THREE.MeshStandardMaterial({
            map: tex,
            emissiveMap: tex,
            color: 0xffffff,
            emissive: 0xd8f2ff,
            emissiveIntensity: VENDING_GLOW,
            roughness: 0.2
        });
        if (env.sharedAssets) env.sharedAssets.add(env.vendingPanelMat.uuid);
    }

    if (!env.hazmatMat) {
        env.hazmatMat = new THREE.MeshStandardMaterial({color: 0xc9b83a, roughness: 0.85});
        env.sharedAssets.add(env.hazmatMat.uuid);
    }
    if (!env.deconSheetMat) {
        env.deconSheetMat = new THREE.MeshStandardMaterial({
            color: 0xbfd8d0, transparent: true, opacity: 0.28,
            roughness: 0.6, side: THREE.DoubleSide
        });
        env.sharedAssets.add(env.deconSheetMat.uuid);
    }

    if (!env.voidShroudMat) {
        env.voidShroudMat = new THREE.MeshBasicMaterial({color: 0x000000, side: THREE.DoubleSide});
        env.sharedAssets.add(env.voidShroudMat.uuid);
    }
    if (!env.voidShroudWhiteMat) {
        env.voidShroudWhiteMat = new THREE.MeshBasicMaterial({color: 0xffffff, side: THREE.DoubleSide});
        env.sharedAssets.add(env.voidShroudWhiteMat.uuid);
    }

    if (!env.benchTopMat) {
        env.benchTopMat = new THREE.MeshStandardMaterial({color: 0x3d4a52, roughness: 0.6, metalness: 0.3});
        if (env.sharedAssets) env.sharedAssets.add(env.benchTopMat.uuid);
    }
    if (!env.cabinetMat) {
        env.cabinetMat = new THREE.MeshStandardMaterial({color: 0x5c6570, roughness: 0.55, metalness: 0.4});
        if (env.sharedAssets) env.sharedAssets.add(env.cabinetMat.uuid);
    }
    if (!env.pegboardMat && env.pegboardTex) {
        env.pegboardMat = new THREE.MeshStandardMaterial({
            map: env.pegboardTex,
            roughness: 0.9,
            bumpMap: env.pegboardTex,
            bumpScale: 0.05
        });
        if (env.sharedAssets) env.sharedAssets.add(env.pegboardMat.uuid);
    }
    if (!env.cat6Mat) {
        env.cat6Mat = new THREE.MeshStandardMaterial({color: 0x2266ff, roughness: 0.6});
        if (env.sharedAssets) env.sharedAssets.add(env.cat6Mat.uuid);
    }
    if (!env.spoolWoodMat) {
        env.spoolWoodMat = new THREE.MeshStandardMaterial({color: 0xaa8866, roughness: 0.8});
        if (env.sharedAssets) env.sharedAssets.add(env.spoolWoodMat.uuid);
    }
    if (!env.cartMat) {
        env.cartMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            metalness: 0.6,
            roughness: 0.7
        });
        if (env.sharedAssets) env.sharedAssets.add(env.cartMat.uuid);
    }
    if (!env.cableEnergizedMat) {
        env.cableEnergizedMat = new THREE.MeshStandardMaterial({
            color: 0xbdf6ff, emissive: 0x6be8ff, emissiveIntensity: 2.2, roughness: 0.3
        });
        if (env.sharedAssets) env.sharedAssets.add(env.cableEnergizedMat.uuid);
    }

    if (!env._lhBulbMat) {
        env._lhBulbMat = new THREE.MeshBasicMaterial({color: 0xffffee});
        env.sharedAssets.add(env._lhBulbMat.uuid);
    }
    if (!env._lhBeamMat) {
        env._lhBeamMat = new THREE.MeshBasicMaterial({
            color: 0xffeedd,
            transparent: true,
            opacity: 0.02,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        env.sharedAssets.add(env._lhBeamMat.uuid);
    }

    if (!env.ropeMat) {
        env.ropeMat = new THREE.MeshStandardMaterial({color: 0x660000, roughness: 0.9, metalness: 0.1});
        env.sharedAssets.add(env.ropeMat.uuid);
    }

    if (!env.ductLiningMat && env.ductMat) {
        env.ductLiningMat = makeDuctInterior(env.ductMat.clone());
        env.ductLiningMat.userData.noShadow = true;
        env.sharedAssets.add(env.ductLiningMat.uuid);
    }

    if (!env._impoundBeamMat) {
        env._impoundBeamMat = new THREE.MeshBasicMaterial({
            color: 0xffaa55,
            transparent: true,
            opacity: 0.012,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        env.sharedAssets.add(env._impoundBeamMat.uuid);
    }

    if (!env.rottedTileMat && env.ceilMat) {
        env.rottedTileMat = env.ceilMat.clone();
        env.rottedTileMat.color.setHex(0x93856b);
        env.rottedTileMat.roughness = 0.95;
        env.rottedTileMat.userData = {noShadow: true};
        env.sharedAssets.add(env.rottedTileMat.uuid);
    }
    if (!env.ceilingHoleMat) {
        env.ceilingHoleMat = new THREE.MeshBasicMaterial({color: 0x060504});
        env.ceilingHoleMat.userData = {noShadow: true};
        env.sharedAssets.add(env.ceilingHoleMat.uuid);
    }
    if (!env.anomalySeamMat) {
        env.anomalySeamMat = new THREE.MeshBasicMaterial({color: 0x7744ff});
        env.sharedAssets.add(env.anomalySeamMat.uuid);
    }

    if (!env.emberGrilleMat) {
        env.emberGrilleMat = env.emberGrateMat || new THREE.MeshStandardMaterial({
            color: 0x2a1005, emissive: 0xff5500, emissiveIntensity: 1.2, roughness: 0.9
        });
        env.sharedAssets.add(env.emberGrilleMat.uuid);
    }
    if (!env.ventCollarMat) {
        env.ventCollarMat = new THREE.MeshStandardMaterial({
            color: 0x1f1c19, roughness: 0.6, metalness: 0.55
        });
        env.sharedAssets.add(env.ventCollarMat.uuid);
    }

    if (!env.blackMat) {
        env.blackMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.8
        });
    }
    if (!env.toolboxMat) {
        env.toolboxMat = new THREE.MeshStandardMaterial({
            color: 0xa33322,
            roughness: 0.6,
            metalness: 0.2
        });
        env.sharedAssets.add(env.toolboxMat.uuid);
    }

    if (!env.clinicCurtainMat) {
        env.clinicCurtainMat = new THREE.MeshStandardMaterial({
            color: 0x8fb9ae, roughness: 0.85, metalness: 0.0, side: THREE.DoubleSide,
            transparent: true, opacity: 0.92
        });
        env.sharedAssets.add(env.clinicCurtainMat.uuid);
    }
}
