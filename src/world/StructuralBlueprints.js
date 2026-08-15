/**
 * [ROLE] Aggregates and sorts structural blueprint profiles (architectural variants) by probability.
 * [WHY] To randomly but consistently select different architectural configurations for world generation.
 * [STATE] Caches a sorted index array statically on the class.
 * [DEPENDS] Imports individual blueprint scripts.
 */
import {RandomPillarProfile} from './blueprints/RandomPillar.js';
import {PipeClusterProfile} from './blueprints/PipeCluster.js';
import {WideHeaderGapProfile} from './blueprints/WideHeaderGap.js';
import {PartitionHeaderProfile} from './blueprints/PartitionHeader.js';
import {HingedDoorwayProfile} from './blueprints/HingedDoorway.js';
import {NarrowHeaderGapProfile} from './blueprints/NarrowHeaderGap.js';
import {LCornerNookProfile} from './blueprints/LCornerNook.js';
import {AlcoveCornerProfile} from './blueprints/AlcoveCorner.js';
import {CratesOrStairwayProfile} from './blueprints/CratesOrStairway.js';
import {DuctOrVentProfile} from './blueprints/DuctOrVent.js';
import {CrawlspaceDuctProfile} from './blueprints/CrawlspaceDuct.js';
import {BlockyObstructionProfile} from './blueprints/BlockyObstruction.js';
import {TunnelBurstProfile} from './blueprints/TunnelBurst.js';
import {TheObserverProfile} from './blueprints/TheObserver.js';
import {SettlingFieldProfile} from './blueprints/SettlingField.js';
import {AnomalousPointOfInterestProfile} from './blueprints/AnomalousPointOfInterest.js';
import {WreckedFurniturePileProfile} from './blueprints/WreckedFurniturePile.js';
import {TheOutpostProfile} from './blueprints/TheOutpost.js';
import {TheOasisProfile} from './blueprints/TheOasis.js';
import {OfficeAmenitiesProfile} from './blueprints/OfficeAmenities.js';
import {RoundPillarProfile} from './blueprints/RoundPillar.js';
import {CurvedArchwayProfile} from './blueprints/CurvedArchway.js';
import {RoundAlcoveProfile} from './blueprints/RoundAlcove.js';
import {CompressionArchwayProfile} from './blueprints/CompressionArchway.js';

export default class StructuralBlueprints {
    static getStructuralMatrix(ctx) {
        const matrix = [
            RandomPillarProfile(this, ctx),
            PipeClusterProfile(this, ctx),
            WideHeaderGapProfile(this, ctx),
            PartitionHeaderProfile(this, ctx),
            HingedDoorwayProfile(this, ctx),
            NarrowHeaderGapProfile(this, ctx),
            LCornerNookProfile(this, ctx),
            AlcoveCornerProfile(this, ctx),
            CratesOrStairwayProfile(this, ctx),
            DuctOrVentProfile(this, ctx),
            CrawlspaceDuctProfile(this, ctx),
            BlockyObstructionProfile(this, ctx),
            TunnelBurstProfile(this, ctx),
            TheObserverProfile(this, ctx),
            SettlingFieldProfile(this, ctx),
            AnomalousPointOfInterestProfile(this, ctx),
            WreckedFurniturePileProfile(this, ctx),
            TheOutpostProfile(this, ctx),
            TheOasisProfile(this, ctx),
            OfficeAmenitiesProfile(this, ctx),
            RoundPillarProfile(this, ctx),
            CurvedArchwayProfile(this, ctx),
            RoundAlcoveProfile(this, ctx),
            CompressionArchwayProfile(this, ctx)
        ];
        if (!StructuralBlueprints._sortedIndices) {
            StructuralBlueprints._sortedIndices = matrix
                .map((_, i) => i)
                .sort((a, b) => matrix[b].prob - matrix[a].prob);
        }
        return StructuralBlueprints._sortedIndices.map(i => matrix[i]);
    }
}
