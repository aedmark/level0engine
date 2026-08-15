/**
 * [ROLE] Aggregates structural blueprint profiles (architectural variants) and picks one per wall cell.
 * [WHY] To randomly but consistently select different architectural configurations for world generation.
 * [HISTORY] `prob` used to be a threshold, not a probability: the matrix was sorted descending and
 *           selection was `find(roll >= s.prob)`, so a blueprint's real chance was the gap to the
 *           entry above it rather than its own number. Nothing read that way, so the values were
 *           authored as if they were probabilities and every one of them was wrong -- The Observer
 *           declared 0.035 and fired at 6.5%, seven set pieces were squeezed into 0.1-0.45% bands,
 *           and The Oasis declared 0.00 yet took 2% of all cells. Worse, a trailing 0.00 entry made
 *           `find` always match, so the plain-wall fallback in ChunkManager could never run and the
 *           `isDefaultWall` metadata it attaches never existed -- which in turn left setWall's
 *           fast-path removal permanently dead. `prob` is now a real probability and selection walks
 *           a cumulative sum. The values were rewritten to the windows each blueprint had before,
 *           so the world is unchanged; only the numbers are now honest.
 * [STATE] Stateless apart from a one-time validation warning.
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

    /**
     * Picks a blueprint for one wall cell by walking a cumulative sum.
     *
     * Returns null when the roll falls past the end of the table, which is the signal to build a
     * plain wall. That remainder is deliberate headroom: probabilities summing to less than 1.0
     * mean "the rest of the time, nothing special happens here".
     *
     * @param {Array} matrix - profiles from getStructuralMatrix
     * @param {number} roll - uniform random in [0, 1)
     * @returns {Object|null} the chosen profile, or null for a plain wall
     */
    static select(matrix, roll) {
        let acc = 0;
        for (let i = 0; i < matrix.length; i++) {
            acc += matrix[i].prob;
            if (roll < acc) return matrix[i];
        }
        return null;
    }
}
