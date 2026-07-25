// EntityManager.js
// Level 0 Engine: The Entity Manager

import Anomaly from './Anomaly.js';
import ArchivistEntity from './ArchivistEntity.js';
import WardenEntity from './WardenEntity.js';
import IncineratorEntity from './IncineratorEntity.js';

/**
 * Orchestrates the spawning, despawning, and updating of all active entities
 * based on the player's current sector. Ensures only one entity type is active at a time.
 */
export default class EntityManager {
    /**
     * Initializes the entity manager and instantiates all unique entity types.
     * @param {THREE.Scene} scene - The main Three.js scene.
     * @param {THREE.PerspectiveCamera} camera - The main camera.
     * @param {Player} player - The player controller instance.
     * @param {Environment} environment - The main environment instance.
     */
    constructor(scene, camera, player, environment) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;
        this.environment = environment;
        this.entities = {
            'DEFAULT': new Anomaly(scene, camera, player, environment),
            'ARCHIVE': new ArchivistEntity(scene, camera, player, environment),
            'IMPOUND': new WardenEntity(scene, camera, player, environment),
            'INCINERATOR': new IncineratorEntity(scene, camera, player, environment)
        };
        for (let key in this.entities) {
            if (this.entities[key].group) {
                this.entities[key].group.visible = false;
            }
        }
        this.activeType = null;
        this.activeEntity = null;
    }

    /**
     * Updates the active entity and handles sector-based entity transitions.
     * @param {number} delta - Time elapsed since the last frame (in seconds).
     * @param {number} time - Total elapsed time.
     * @param {string} activeSector - The player's current sector identifier.
     * @returns {Object|null} Any UI state or jump scare state triggered by the active entity.
     */
    update(delta, time, activeSector) {
        let targetType = 'DEFAULT';
        if (activeSector === 'ARCHIVE') {
            targetType = 'ARCHIVE';
        } else if (activeSector === 'IMPOUND') {
            targetType = 'IMPOUND';
        } else if (activeSector === 'INCINERATOR') {
            targetType = 'INCINERATOR';
        }
        if (this.activeType !== targetType) {
            if (this.activeEntity) {
                this.activeEntity.isActive = false;
                if (this.activeEntity.group) this.activeEntity.group.visible = false;
            }
            this.activeType = targetType;
            this.activeEntity = this.entities[targetType];
            if (this.activeEntity) {
                this.activeEntity.isActive = true;
                const spawnAngle = Math.random() * Math.PI * 2;
                this.activeEntity.reset(
                    this.camera.position.x + Math.cos(spawnAngle) * 50,
                    0,
                    this.camera.position.z + Math.sin(spawnAngle) * 50
                );
            }
        }
        if (this.activeEntity) {
            return this.activeEntity.update(delta, time);
        }
        return null;
    }
}