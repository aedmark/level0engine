// EngineMath.js
// LEVEL 0 NATIVE MATHEMATICS PRIMITIVES

export class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    lengthSq() {
        return (this.x * this.x) + (this.y * this.y) + (this.z * this.z);
    }

    length() {
        return Math.sqrt(this.lengthSq());
    }

    subVectors(a, b) {
        this.x = a.x - b.x;
        this.y = a.y - b.y;
        this.z = a.z - b.z;
        return this;
    }

    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    normalize() {
        let lenSq = this.lengthSq();
        if (lenSq > 0) {
            let invLen = 1.0 / Math.sqrt(lenSq);
            this.x *= invLen;
            this.y *= invLen;
            this.z *= invLen;
        } else {
            this.x = 0;
            this.y = 0;
            this.z = 0;
        }
        return this;
    }

    copy(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }

    multiplyScalar(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    lerp(v, alpha) {
        this.x += (v.x - this.x) * alpha;
        this.y += (v.y - this.y) * alpha;
        this.z += (v.z - this.z) * alpha;
        return this;
    }
}

export class Box3 {
    constructor(min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity)) {
        this.min = min;
        this.max = max;
    }

    set(min, max) {
        // Direct assignment to prevent object reallocation overhead
        this.min.x = min.x;
        this.min.y = min.y;
        this.min.z = min.z;

        this.max.x = max.x;
        this.max.y = max.y;
        this.max.z = max.z;

        return this;
    }

    intersectsBox(box) {
        // Standard AABB intersection evaluation
        return box.max.x >= this.min.x && box.min.x <= this.max.x &&
            box.max.y >= this.min.y && box.min.y <= this.max.y &&
            box.max.z >= this.min.z && box.min.z <= this.max.z;
    }

    copy(box) {
        this.min.copy(box.min);
        this.max.copy(box.max);
        return this;
    }
}

export class Euler {
    constructor(x = 0, y = 0, z = 0, order = 'YXZ') {
        this.x = x;
        this.y = y;
        this.z = z;
        this.order = order;
    }

    set(x, y, z, order = this.order) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.order = order;
        return this;
    }
}