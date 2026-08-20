import {RandomPillarProfile} from './blueprints/RandomPillar.js';
import {PipeClusterProfile} from './blueprints/PipeCluster.js';
import {WideHeaderGapProfile} from './blueprints/WideHeaderGap.js';
import {PartitionHeaderProfile} from './blueprints/PartitionHeader.js';
import {HingedDoorwayProfile} from './blueprints/HingedDoorway.js';
import {NarrowHeaderGapProfile} from './blueprints/NarrowHeaderGap.js';
import {LCornerNookProfile} from './blueprints/LCornerNook.js';
import {AlcoveCornerProfile} from './blueprints/AlcoveCorner.js';
import {CratesProfile} from './blueprints/Crates.js';
import {ElevatorProfile} from './blueprints/Elevator.js';
import {DuctProfile} from './blueprints/Duct.js';
import {VentProfile} from './blueprints/Vent.js';
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
            CratesProfile(this, ctx),
            ElevatorProfile(this, ctx),
            DuctProfile(this, ctx),
            VentProfile(this, ctx),
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
            RoundAlcoveProfile(this, ctx)
        ];
        if (!StructuralBlueprints._validated) {
            StructuralBlueprints._validated = true;
            const total = matrix.reduce((sum, s) => sum + s.prob, 0);
            if (total > 1.0 + 1e-6) {
                console.warn(
                    `[StructuralBlueprints] prob values sum to ${total.toFixed(4)}, over 1.0. ` +
                    `Blueprints past the crossover point can never be selected.`
                );
            }
        }
        return matrix;
    }

    static select(matrix, roll) {
        let acc = 0;
        for (let i = 0; i < matrix.length; i++) {
            acc += matrix[i].prob;
            if (roll < acc) return matrix[i];
        }
        return null;
    }
}
