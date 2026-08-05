/**
 * [ROLE] Manages and delegates to sector-specific entities.
 * [WHY] Coordinates which entity is spawned based on the active sector, isolating lifecycle logic from the main game loop.
 * [STATE] Stateful. Instantiates and holds references to all entity types.
 * [DEPENDS] All entity classes, environment data.
 */
import Anomaly from './Anomaly.js';
import ArchivistEntity from './ArchivistEntity.js';
import WardenEntity from './WardenEntity.js';
import IncineratorEntity from './IncineratorEntity.js';
import BackupDaemonEntity from './BackupDaemonEntity.js';
import ClawEntity from './ClawEntity.js';

export default class EntityManager {
    constructor(scene, camera, player, environment) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;
        this.environment = environment;
        this.entities = {
            'DEFAULT': new Anomaly(scene, camera, player, environment),
            'ARCHIVE': new ArchivistEntity(scene, camera, player, environment),
            'IMPOUND': new WardenEntity(scene, camera, player, environment),
            'INCINERATOR': new IncineratorEntity(scene, camera, player, environment),
            'SERVER': new BackupDaemonEntity(scene, camera, player, environment),
            'ATRIUM': new ClawEntity(scene, camera, player, environment)
        };
        for (let key in this.entities) {
            const entity = this.entities[key];
            if (typeof entity.deactivate === 'function') {
                entity.deactivate();
            } else if (entity.group) {
                entity.group.visible = false;
            }
        }
        this.activeType = null;
        this.activeEntity = null;
    }

    update(delta, time, activeSector) {
        let targetType = 'DEFAULT';
        if (activeSector === 'ARCHIVE') {
            targetType = 'ARCHIVE';
        } else if (activeSector === 'IMPOUND') {
            targetType = 'IMPOUND';
        } else if (activeSector === 'INCINERATOR') {
            targetType = 'INCINERATOR';
        } else if (activeSector === 'SERVER') {
            targetType = 'SERVER';
        } else if (activeSector === 'ATRIUM') {
            targetType = 'ATRIUM';
        }
        if (this.activeType !== targetType) {
            if (this.activeEntity) {
                if (typeof this.activeEntity.deactivate === 'function') {
                    this.activeEntity.deactivate();
                } else {
                    this.activeEntity.isActive = false;
                    if (this.activeEntity.group) this.activeEntity.group.visible = false;
                }
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
            return this.activeEntity.update(delta, time, activeSector);
        }
        return null;
    }
}