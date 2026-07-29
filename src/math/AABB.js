import Vec3 from './Vec3.js';

/**
 * AABB (Axis-Aligned Bounding Box)
 * A lightweight 3D bounding box class used for fast collision detection.
 *
 * "Axis-Aligned" means the box cannot rotate; its edges are always
 * perfectly parallel to the X, Y, and Z axes. This makes intersection math incredibly fast
 * and simple, allowing the engine to test hundreds of collisions per frame without dropping FPS.
 */
export default class AABB {
    constructor(min = new Vec3(Infinity, Infinity, Infinity), max = new Vec3(-Infinity, -Infinity, -Infinity)) {
        this.min = new Vec3(min.x, min.y, min.z);
        this.max = new Vec3(max.x, max.y, max.z);
    }

    set(min, max) {
        this.min.copy(min);
        this.max.copy(max);
        return this;
    }

    copy(box) {
        this.min.copy(box.min);
        this.max.copy(box.max);
        return this;
    }

    makeEmpty() {
        this.min.set(Infinity, Infinity, Infinity);
        this.max.set(-Infinity, -Infinity, -Infinity);
        return this;
    }

    isEmpty() {
        return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z;
    }

    intersectsBox(box) {
        return box.max.x >= this.min.x && box.min.x <= this.max.x &&
            box.max.y >= this.min.y && box.min.y <= this.max.y &&
            box.max.z >= this.min.z && box.min.z <= this.max.z;
    }

    /**
     * Ray-Box Intersection using the "Slab Method".
     *
     * This algorithm treats the AABB as three pairs of parallel planes (slabs).
     * A ray is fired and we calculate where it enters and exits each slab. If the ray's entry
     * into the *last* slab happens *before* its exit out of the *first* slab, the ray has
     * passed through the box. This is highly optimized and avoids square roots.
     *
     * @param {Vec3} origin - The starting point of the ray.
     * @param {Vec3} direction - The normalized direction vector of the ray.
     * @param {AABB} box - The bounding box to test against.
     * @param {Vec3} [target] - Optional target vector to store the exact impact point.
     * @returns {boolean} True if the ray hits the box, false otherwise.
     */
    static rayIntersectsBox(origin, direction, box, target) {
        let tmin = -Infinity;
        let tmax = Infinity;
        if (Math.abs(direction.x) < 1e-12) {
            if (origin.x < box.min.x || origin.x > box.max.x) return false;
        } else {
            let t1 = (box.min.x - origin.x) / direction.x;
            let t2 = (box.max.x - origin.x) / direction.x;
            if (t1 > t2) {
                const tmp = t1;
                t1 = t2;
                t2 = tmp;
            }
            tmin = Math.max(tmin, t1);
            tmax = Math.min(tmax, t2);
            if (tmin > tmax) return false;
        }
        if (Math.abs(direction.y) < 1e-12) {
            if (origin.y < box.min.y || origin.y > box.max.y) return false;
        } else {
            let t1 = (box.min.y - origin.y) / direction.y;
            let t2 = (box.max.y - origin.y) / direction.y;
            if (t1 > t2) {
                const tmp = t1;
                t1 = t2;
                t2 = tmp;
            }
            tmin = Math.max(tmin, t1);
            tmax = Math.min(tmax, t2);
            if (tmin > tmax) return false;
        }
        if (Math.abs(direction.z) < 1e-12) {
            if (origin.z < box.min.z || origin.z > box.max.z) return false;
        } else {
            let t1 = (box.min.z - origin.z) / direction.z;
            let t2 = (box.max.z - origin.z) / direction.z;
            if (t1 > t2) {
                const tmp = t1;
                t1 = t2;
                t2 = tmp;
            }
            tmin = Math.max(tmin, t1);
            tmax = Math.min(tmax, t2);
            if (tmin > tmax) return false;
        }
        if (tmax < 0) return false;
        const t = tmin >= 0 ? tmin : tmax;
        if (target) target.set(origin.x + direction.x * t, origin.y + direction.y * t, origin.z + direction.z * t);
        return true;
    }
}