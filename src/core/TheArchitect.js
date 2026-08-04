import StructuralBlueprints from '../world/StructuralBlueprints.js';
import SectorBlueprints from '../world/SectorBlueprints.js';

/**
 * [ROLE] Facade for accessing blueprint matrices.
 * [WHY] Provides a unified, static entry point for various world generation blueprints, isolating consumers from the underlying blueprint modules.
 * [STATE] Stateless static utility.
 * [DEPENDS] SectorBlueprints, StructuralBlueprints.
 */
export default class TheArchitect {
    static getStructuralMatrix(ctx) {
        return StructuralBlueprints.getStructuralMatrix.call(this, ctx);
    }

    static getSectorMatrix(ctx) {
        return SectorBlueprints.getSectorMatrix.call(this, ctx);
    }
}