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

    /**
     * Picks a structural blueprint for one wall cell. Null means build a plain wall.
     * Proxied here so callers keep going through TheArchitect rather than reaching past it.
     */
    static selectStructure(matrix, roll) {
        return StructuralBlueprints.select(matrix, roll);
    }

    static getSectorMatrix(ctx) {
        return SectorBlueprints.getSectorMatrix.call(this, ctx);
    }
}