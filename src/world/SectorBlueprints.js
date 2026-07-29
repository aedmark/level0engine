import {ExitSector} from './sectors/ExitSector.js';
import {ImpoundSector} from './sectors/ImpoundSector.js';
import {ClinicSector} from './sectors/ClinicSector.js';
import {BoardroomSector} from './sectors/BoardroomSector.js';
import {ArchiveSector} from './sectors/ArchiveSector.js';
import {ServerSector} from './sectors/ServerSector.js';
import {MaintenanceSector} from './sectors/MaintenanceSector.js';
import {ChasmSector} from './sectors/ChasmSector.js';
import {IncineratorSector} from './sectors/IncineratorSector.js';
import {AnnexSector} from './sectors/AnnexSector.js';
import {AtriumSector} from './sectors/AtriumSector.js';
import {CheckpointSector} from './sectors/CheckpointSector.js';

/**
 * A factory class that aggregates all procedural sector generators.
 *
 * This file acts as the central registry for "themed" maze chunks.
 * When `Environment.js` generates a new chunk, it can query this matrix to pick a
 * generator (like `ArchiveSector` or `ClinicSector`) to override the default
 * structural generation. By decoupling the generation logic into separate files,
 * we keep the core `Environment` class clean and modular.
 */
export default class SectorBlueprints {
    static getSectorMatrix(ctx) {
        return [
            ExitSector(this, ctx),
            ImpoundSector(this, ctx),
            ClinicSector(this, ctx),
            BoardroomSector(this, ctx),
            ArchiveSector(this, ctx),
            ServerSector(this, ctx),
            MaintenanceSector(this, ctx),
            ChasmSector(this, ctx),
            IncineratorSector(this, ctx),
            AnnexSector(this, ctx),
            AtriumSector(this, ctx),
            CheckpointSector(this, ctx)
        ];
    }
}
