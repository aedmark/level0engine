import TextureMechanics from './textures/TextureMechanics.js';
import StructuralTextures from './textures/common/StructuralTextures.js';
import SurfaceTextures from './textures/common/SurfaceTextures.js';
import ClinicTextures from './textures/sectors/ClinicTextures.js';
import AtriumTextures from './textures/sectors/AtriumTextures.js';
import OrganicTextures from './textures/common/OrganicTextures.js';
import TechTextures from './textures/common/TechTextures.js';
import CreviceTextures from './textures/common/CreviceTextures.js';
import HazardTextures from './textures/common/HazardTextures.js';
import PropTextures from './textures/common/PropTextures.js';
import AnnexTextures from './textures/sectors/AnnexTextures.js';
import ImpoundTextures from './textures/sectors/ImpoundTextures.js';
import BoardroomTextures from './textures/sectors/BoardroomTextures.js';
import MaintenanceTextures from './textures/sectors/MaintenanceTextures.js';
import ArchiveTextures from './textures/sectors/ArchiveTextures.js';
import CheckpointTextures from './textures/sectors/CheckpointTextures.js';
import IncineratorTextures from './textures/sectors/IncineratorTextures.js';
import ServerTextures from './textures/sectors/ServerTextures.js';
import ExitTextures from './textures/sectors/ExitTextures.js';
import StaticTextureLoader from './StaticTextureLoader.js';

export default class ProceduralTextureFactory {
    static USE_STATIC_TEXTURES = true;

    static async generateAssets(onProgress = null) {
        const masterNoise = TextureMechanics._generateMasterNoise();
        ProceduralTextureFactory._masterNoise = masterNoise;

        if (ProceduralTextureFactory.USE_STATIC_TEXTURES) {
            const staticAssets = await StaticTextureLoader.loadCoreAssets(onProgress);
            if (!staticAssets.creviceWallMat) staticAssets.creviceWallMat = CreviceTextures._buildLathAndPlasterAsset(masterNoise);

            const techKeys = ['ventMat', 'ductMat', 'serverMat', 'baseLightMat', 'baseBrokenLightMat',
                'baseHousingMat', 'matteLightMat', 'matteBrokenLightMat', 'flangeMat'];
            if (techKeys.some(key => !staticAssets[key])) {
                const techAssets = TechTextures._buildTechAssets(masterNoise);
                for (const key of techKeys) {
                    if (!staticAssets[key]) staticAssets[key] = techAssets[key];
                }
            }

            const structKeys = ['headerMat', 'wallTexture', 'wallBumpTexture', 'structMat', 'woodMat',
                'doorMat', 'baseboardMat', 'baseboardTrimMat', 'subwayTileMats'];
            if (structKeys.some(key => !staticAssets[key])) {
                const structAssets = StructuralTextures._buildStructuralAssets(masterNoise);
                for (const key of structKeys) {
                    if (!staticAssets[key]) staticAssets[key] = structAssets[key];
                }
            }

            const surfaceKeys = ['carpetTexture', 'ceilingTexture', 'ceilingBumpTexture', 'tileMat', 'clinicMat',
                'atriumFloorMat', 'clinicFloorMat', 'clinicCeilingMat', 'clinicWallMat', 'clinicRailMat'];
            if (surfaceKeys.some(key => !staticAssets[key])) {
                const surfaceAssets = await SurfaceTextures._buildSurfaceAssets(masterNoise);
                for (const key of surfaceKeys) {
                    if (!staticAssets[key]) staticAssets[key] = surfaceAssets[key];
                }
            }

            const organicKeys = ['fabricMat', 'mossMat', 'cornMat', 'dirtMat', 'nightSkyMat'];
            if (organicKeys.some(key => !staticAssets[key])) {
                const organicAssets = OrganicTextures._buildOrganicAssets(masterNoise);
                for (const key of organicKeys) {
                    if (!staticAssets[key]) staticAssets[key] = organicAssets[key];
                }
            }

            const serverKeys = ['serverFloorMat', 'serverCeilingMat'];
            if (serverKeys.some(key => !staticAssets[key])) {
                const serverAssets = ServerTextures._buildServerAssets(masterNoise);
                for (const key of serverKeys) {
                    if (!staticAssets[key]) staticAssets[key] = serverAssets[key];
                }
            }

            if (!staticAssets.pegboardTex) staticAssets.pegboardTex = PropTextures.generatePegboardTexture();
            if (!staticAssets.fernTex) staticAssets.fernTex = PropTextures.generateFernTexture();

            const cartonKeys = ['fileBoxMat', 'movingBoxMat', 'bananaBoxMat', 'parcelBoxMat', 'cartonMats'];
            if (cartonKeys.some(key => !staticAssets[key])) {
                const cartonAssets = PropTextures._buildCartons();
                for (const key of cartonKeys) {
                    if (!staticAssets[key]) staticAssets[key] = cartonAssets[key];
                }
            }

            Object.assign(staticAssets, SurfaceTextures._buildDuctInteriorSet(masterNoise));

            const hazardAssets = HazardTextures._buildHazardAndMiscAssets(masterNoise);
            staticAssets.tagGeo = hazardAssets.tagGeo;
            staticAssets.glowGeo = hazardAssets.glowGeo;
            const hazardKeys = ['fenceMat', 'hazardMat', 'glowMat', 'flareMat', 'tagMat', 'voidMat', 'metalMat',
                'paintedSteelMat', 'pittedMetalMat', 'titaniumMat', 'pipeMat', 'breakerPanelMat', 'stainlessMat',
                'stainlessDoorMat', 'corrosionBumpTexture'];
            for (const key of hazardKeys) {
                if (!staticAssets[key]) staticAssets[key] = hazardAssets[key];
            }

            ProceduralTextureFactory._applyOpts(staticAssets);
            return staticAssets;
        }

        const extras = {
                pegboardTex: PropTextures.generatePegboardTexture(),
                fernTex: PropTextures.generateFernTexture(),
            };
            const structAssets = StructuralTextures._buildStructuralAssets(masterNoise);
            await TextureMechanics._yield();
            const surfaceAssets = await SurfaceTextures._buildSurfaceAssets(masterNoise);
            await TextureMechanics._yield();
            const cartonAssets = PropTextures._buildCartons();
            await TextureMechanics._yield();
        const organicAssets = OrganicTextures._buildOrganicAssets(masterNoise);
        await TextureMechanics._yield();
        const techAssets = TechTextures._buildTechAssets(masterNoise);
        await TextureMechanics._yield();
        const hazardAssets = HazardTextures._buildHazardAndMiscAssets(masterNoise);
        await TextureMechanics._yield();

        const serverAssets = ServerTextures._buildServerAssets(masterNoise);
        await TextureMechanics._yield();
        
        let clinicAssets = {};
        if (ClinicTextures && ClinicTextures._buildClinicAssets) {
            clinicAssets = ClinicTextures._buildClinicAssets(masterNoise);
            await TextureMechanics._yield();
        }
        
        const assets = {
            ...extras,
            ...structAssets,
            ...surfaceAssets,
            ...cartonAssets,
            ...organicAssets,
            ...techAssets,
            ...hazardAssets,
            ...serverAssets,
            ...clinicAssets,
            creviceWallMat: CreviceTextures._buildLathAndPlasterAsset(masterNoise)
        };
        
        ProceduralTextureFactory._applyOpts(assets);
        return assets;
    }

    static sectorGenerators() {
        return [
            ['ANNEX', (noise) => AnnexTextures._buildAnnexAssets(noise)],
            ['IMPOUND', (noise) => ImpoundTextures._buildImpoundAssets(noise)],
            ['BOARDROOM', (noise) => BoardroomTextures._buildBoardroomAssets(noise)],
            ['ATRIUM', (noise) => AtriumTextures._buildAtriumAssets(noise)],
            ['MAINTENANCE', (noise) => MaintenanceTextures._buildMaintenanceAssets(noise), {
                leakStainGeo: () => MaintenanceTextures._buildLeakStainGeo()
            }],
            ['ARCHIVE', (noise) => ArchiveTextures._buildArchiveAssets(noise), {
                paperGeo: () => ArchiveTextures._buildPaperGeo(),
                coffeeStainGeo: () => ArchiveTextures._buildCoffeeStainGeo(),
                bookMatSets: (noise) => ArchiveTextures._buildBookMatSets(noise)
            }],
            ['CHECKPOINT', (noise) => CheckpointTextures._buildCheckpointAssets(noise)],
            ['INCINERATOR', (noise) => IncineratorTextures._buildIncineratorAssets(noise)],
            ['EXIT', (noise) => ExitTextures._buildExitAssets(noise)]
        ];
    }

    static async lazyLoadSectorAssets(env, onProgress = null) {
        const masterNoise = ProceduralTextureFactory._masterNoise;
        if (!masterNoise) return;

        const lazyModules = ProceduralTextureFactory.sectorGenerators();

        let i = 0;
        let staticHits = 0;
        for (const [name, buildFn, residualBuilders] of lazyModules) {
            await TextureMechanics._yield();
            i++;
            if (!buildFn) continue;

            const t0 = performance.now();
            let sectorAssets = null;
            let source = 'static';

            if (ProceduralTextureFactory.USE_STATIC_TEXTURES) {
                const result = await StaticTextureLoader.loadSectorAssets(name);
                if (result) {
                    const {assets: staticAssets, residual} = result;
                    if (residual.length === 0) {
                        sectorAssets = staticAssets;
                    } else if (residualBuilders && residual.every(key => typeof residualBuilders[key] === 'function')) {
                        for (const key of residual) staticAssets[key] = residualBuilders[key](masterNoise);
                        sectorAssets = staticAssets;
                        source = 'static+residual';
                    }
                }
            }
            if (sectorAssets) {
                staticHits++;
            } else {
                source = 'generated';
                sectorAssets = buildFn(masterNoise);
            }

            ProceduralTextureFactory._applyOpts(sectorAssets);
            Object.assign(env, sectorAssets);
            if (onProgress) {
                onProgress(i, lazyModules.length, `${name}/${source}`, Math.round(performance.now() - t0));
            }
        }
        console.log(`[TEXTURES] Sector bundles: ${staticHits} static, ${lazyModules.length - staticHits} generated.`);
    }

    static _applyOpts(assets) {
        const markSRGB = (texture) => {
            if ('colorSpace' in texture) {
                texture.colorSpace = THREE.SRGBColorSpace;
            } else {
                texture.encoding = THREE.sRGBEncoding;
            }
        };
        const isNonColorData = (key) => /Bump|Rough|Normal|Displacement/.test(key);
        const applyOpt = (item, key) => {
            if (item && item.isTexture) {
                item.anisotropy = 16;
                if (!isNonColorData(key || '')) markSRGB(item);
            }
            if (item && item.map && item.map.isTexture) {
                item.map.anisotropy = 16;
                markSRGB(item.map);
            }
            if (item && item.emissiveMap && item.emissiveMap.isTexture) {
                item.emissiveMap.anisotropy = 16;
                markSRGB(item.emissiveMap);
            }
            for (const slot of ['bumpMap', 'roughnessMap']) {
                if (item && item[slot] && item[slot].isTexture) {
                    item[slot].anisotropy = 16;
                }
            }
        };
        Object.entries(assets).forEach(([key, item]) => {
            if (Array.isArray(item)) {
                item.forEach(sub => applyOpt(sub, key));
            } else {
                applyOpt(item, key);
            }
        });
    }
}
