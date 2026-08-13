/**
 * [ROLE] Asynchronously generates procedural textures by composing multiple texture modules.
 * [WHY] Replaces static image assets with generated canvases to reduce load times and bandwidth.
 * [STATE] Stateless factory class.
 * [DEPENDS] Relies on TextureMechanics, multiple texture generation modules, and THREE.js.
 */
import TextureMechanics from './textures/TextureMechanics.js';
import StructuralTextures from './textures/common/StructuralTextures.js';
import SurfaceTextures from './textures/common/SurfaceTextures.js';
import ClinicTextures from './textures/sectors/ClinicTextures.js';
import AtriumTextures from './textures/sectors/AtriumTextures.js';
import OrganicTextures from './textures/common/OrganicTextures.js';
import TechTextures from './textures/common/TechTextures.js';
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

export default class ProceduralTextureFactory {
    static async generateAssets() {
        const masterNoise = TextureMechanics._generateMasterNoise();
        ProceduralTextureFactory._masterNoise = masterNoise; // save for lazy loading
        
        const extras = {
            pegboardTex: PropTextures.generatePegboardTexture(),
            fernTex: PropTextures.generateFernTexture(),
        };
        const structAssets = StructuralTextures._buildStructuralAssets(masterNoise);
        await TextureMechanics._yield();
        const surfaceAssets = await SurfaceTextures._buildSurfaceAssets(masterNoise);
        await TextureMechanics._yield();
        const organicAssets = OrganicTextures._buildOrganicAssets(masterNoise);
        await TextureMechanics._yield();
        const techAssets = TechTextures._buildTechAssets(masterNoise);
        await TextureMechanics._yield();
        const hazardAssets = HazardTextures._buildHazardAndMiscAssets(masterNoise);
        await TextureMechanics._yield();
        const cartonAssets = PropTextures._buildCartons();
        await TextureMechanics._yield();
        
        // Essential sector textures for MaterialLibrary and Environment setup
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
            ...organicAssets,
            ...techAssets,
            ...hazardAssets,
            ...serverAssets,
            ...clinicAssets,
            ...cartonAssets
        };
        
        ProceduralTextureFactory._applyOpts(assets);
        return assets;
    }

    static async lazyLoadSectorAssets(env) {
        const masterNoise = ProceduralTextureFactory._masterNoise;
        if (!masterNoise) return;
        
        const lazyModules = [
            (noise) => AnnexTextures._buildAnnexAssets(noise),
            (noise) => ImpoundTextures._buildImpoundAssets(noise),
            (noise) => BoardroomTextures._buildBoardroomAssets(noise),
            (noise) => AtriumTextures._buildAtriumAssets(noise),
            (noise) => MaintenanceTextures._buildMaintenanceAssets(noise),
            (noise) => ArchiveTextures._buildArchiveAssets(noise),
            (noise) => CheckpointTextures._buildCheckpointAssets(noise),
            (noise) => IncineratorTextures._buildIncineratorAssets(noise)
        ];
        
        for (const buildFn of lazyModules) {
            await TextureMechanics._yield();
            if (!buildFn) continue;
            
            const sectorAssets = buildFn(masterNoise);
            ProceduralTextureFactory._applyOpts(sectorAssets);
            
            // Assign dynamically to env.
            Object.assign(env, sectorAssets);
        }
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
