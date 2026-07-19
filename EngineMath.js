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

    clone() {
        return new Vector3(this.x, this.y, this.z);
    }

    lengthSq() {
        return (this.x * this.x) + (this.y * this.y) + (this.z * this.z);
    }

    length() {
        return Math.sqrt(this.lengthSq());
    }

    distanceToSquared(v) {
        const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;
        return dx * dx + dy * dy + dz * dz;
    }

    distanceTo(v) {
        return Math.sqrt(this.distanceToSquared(v));
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

    applyMatrix4(m) {
        const e = m.elements || m;
        const x = this.x, y = this.y, z = this.z;
        const w = 1.0 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
        this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
        this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
        this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
        return this;
    }

    applyMatrix3(m) {
        const e = m.elements || m;
        const x = this.x, y = this.y, z = this.z;
        this.x = e[0] * x + e[3] * y + e[6] * z;
        this.y = e[1] * x + e[4] * y + e[7] * z;
        this.z = e[2] * x + e[5] * y + e[8] * z;
        return this;
    }

    applyQuaternion(q) {
        const x = this.x, y = this.y, z = this.z;
        const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
        const ix = qw * x + qy * z - qz * y;
        const iy = qw * y + qz * x - qx * z;
        const iz = qw * z + qx * y - qy * x;
        const iw = -qx * x - qy * y - qz * z;
        this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
        this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
        this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
        return this;
    }

    toArray(array = [], offset = 0) {
        array[offset] = this.x;
        array[offset + 1] = this.y;
        array[offset + 2] = this.z;
        return array;
    }
}

export class Box3 {
    constructor(min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity)) {
        this.min = min;
        this.max = max;
    }

    set(min, max) {
        this.min.copy(min);
        this.max.copy(max);
        return this;
    }

    makeEmpty() {
        this.min.x = this.min.y = this.min.z = Infinity;
        this.max.x = this.max.y = this.max.z = -Infinity;
        return this;
    }

    isEmpty() {
        return (this.max.x < this.min.x) || (this.max.y < this.min.y) || (this.max.z < this.min.z);
    }

    clone() {
        return new Box3().copy(this);
    }

    intersectsBox(box) {
        return box.max.x >= this.min.x && box.min.x <= this.max.x &&
            box.max.y >= this.min.y && box.min.y <= this.max.y &&
            box.max.z >= this.min.z && box.min.z <= this.max.z;
    }

    copy(box) {
        this.min.copy(box.min);
        this.max.copy(box.max);
        return this;
    }

    applyMatrix4(m) {
        if (this.isEmpty()) return this;
        const points = [
            new Vector3(this.min.x, this.min.y, this.min.z),
            new Vector3(this.min.x, this.min.y, this.max.z),
            new Vector3(this.min.x, this.max.y, this.min.z),
            new Vector3(this.min.x, this.max.y, this.max.z),
            new Vector3(this.max.x, this.min.y, this.min.z),
            new Vector3(this.max.x, this.min.y, this.max.z),
            new Vector3(this.max.x, this.max.y, this.min.z),
            new Vector3(this.max.x, this.max.y, this.max.z)
        ];
        this.makeEmpty();
        for (let i = 0; i < 8; i++) {
            points[i].applyMatrix4(m);
            if (points[i].x < this.min.x) this.min.x = points[i].x;
            if (points[i].y < this.min.y) this.min.y = points[i].y;
            if (points[i].z < this.min.z) this.min.z = points[i].z;
            if (points[i].x > this.max.x) this.max.x = points[i].x;
            if (points[i].y > this.max.y) this.max.y = points[i].y;
            if (points[i].z > this.max.z) this.max.z = points[i].z;
        }
        return this;
    }

    setFromObject(object) {
        this.makeEmpty();
        object.updateMatrixWorld(true);
        const geometry = object.geometry;

        if (geometry && geometry.attributes && geometry.attributes.position) {
            const position = geometry.attributes.position;
            const v = new Vector3();
            for (let i = 0, l = position.count; i < l; i++) {
                v.set(position.getX(i), position.getY(i), position.getZ(i));
                v.applyMatrix4(object.matrixWorld);
                if (v.x < this.min.x) this.min.x = v.x;
                if (v.y < this.min.y) this.min.y = v.y;
                if (v.z < this.min.z) this.min.z = v.z;
                if (v.x > this.max.x) this.max.x = v.x;
                if (v.y > this.max.y) this.max.y = v.y;
                if (v.z > this.max.z) this.max.z = v.z;
            }
        } else {
            object.traverse((child) => {
                if (child.geometry && child.geometry.attributes && child.geometry.attributes.position) {
                    const position = child.geometry.attributes.position;
                    const v = new Vector3();
                    for (let i = 0, l = position.count; i < l; i++) {
                        v.set(position.getX(i), position.getY(i), position.getZ(i));
                        v.applyMatrix4(child.matrixWorld);
                        if (v.x < this.min.x) this.min.x = v.x;
                        if (v.y < this.min.y) this.min.y = v.y;
                        if (v.z < this.min.z) this.min.z = v.z;
                        if (v.x > this.max.x) this.max.x = v.x;
                        if (v.y > this.max.y) this.max.y = v.y;
                        if (v.z > this.max.z) this.max.z = v.z;
                    }
                }
            });
        }
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

    copy(e) {
        this.x = e.x;
        this.y = e.y;
        this.z = e.z;
        this.order = e.order;
        return this;
    }

    toArray(array = [], offset = 0) {
        array[offset] = this.x;
        array[offset + 1] = this.y;
        array[offset + 2] = this.z;
        array[offset + 3] = this.order;
        return array;
    }
}

export class Matrix4 {
    constructor() {
        this.elements = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
    }

    toArray(array = [], offset = 0) {
        const te = this.elements;
        for (let i = 0; i < 16; i++) {
            array[offset + i] = te[i];
        }
        return array;
    }
}

export class Matrix3 {
    constructor() {
        this.elements = [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ];
    }

    set(n11, n12, n13, n21, n22, n23, n31, n32, n33) {
        const te = this.elements;
        te[0] = n11; te[1] = n21; te[2] = n31;
        te[3] = n12; te[4] = n22; te[5] = n32;
        te[6] = n13; te[7] = n23; te[8] = n33;
        return this;
    }

    getNormalMatrix(matrix4) {
        const me = matrix4.elements || matrix4;
        const te = this.elements;
        const n11 = me[0], n21 = me[1], n31 = me[2];
        const n12 = me[4], n22 = me[5], n32 = me[6];
        const n13 = me[8], n23 = me[9], n33 = me[10];

        const t11 = n22 * n33 - n32 * n23;
        const t21 = n31 * n23 - n21 * n33;
        const t31 = n21 * n32 - n31 * n22;
        const t12 = n32 * n13 - n12 * n33;
        const t22 = n11 * n33 - n31 * n13;
        const t32 = n31 * n12 - n11 * n32;
        const t13 = n12 * n23 - n22 * n13;
        const t23 = n21 * n13 - n11 * n23;
        const t33 = n11 * n22 - n21 * n12;

        const det = n11 * t11 + n21 * t12 + n31 * t13;
        if (det === 0) return this.set(1, 0, 0, 0, 1, 0, 0, 0, 1);

        const detInv = 1.0 / det;
        te[0] = t11 * detInv;
        te[1] = t12 * detInv;
        te[2] = t13 * detInv;
        te[3] = t21 * detInv;
        te[4] = t22 * detInv;
        te[5] = t23 * detInv;
        te[6] = t31 * detInv;
        te[7] = t32 * detInv;
        te[8] = t33 * detInv;

        return this;
    }

    toArray(array = [], offset = 0) {
        const te = this.elements;
        for (let i = 0; i < 9; i++) {
            array[offset + i] = te[i];
        }
        return array;
    }
}

export class Color {
    constructor(r = 1, g = 1, b = 1, bridgeColor = null) {
        this._hardwareBridge = bridgeColor;
        if (arguments.length === 1 && typeof r === 'number') {
            this.setHex(r);
        } else {
            this.r = r; this.g = g; this.b = b;
        }
    }

    setRGB(r, g, b) {
        this.r = r; this.g = g; this.b = b;
        if (this._hardwareBridge) this._hardwareBridge.setRGB(r, g, b);
        return this;
    }

    setHex(hex) {
        this.r = (hex >> 16 & 255) / 255;
        this.g = (hex >> 8 & 255) / 255;
        this.b = (hex & 255) / 255;
        if (this._hardwareBridge) this._hardwareBridge.setHex(hex);
        return this;
    }

    getHex() {
        return Math.max(0, Math.min(255, this.r * 255)) << 16 ^
            Math.max(0, Math.min(255, this.g * 255)) << 8 ^
            Math.max(0, Math.min(255, this.b * 255));
    }

    clone() {
        return new Color(this.r, this.g, this.b);
    }

    copy(color) {
        this.r = color.r; this.g = color.g; this.b = color.b;
        if (this._hardwareBridge) this._hardwareBridge.setRGB(this.r, this.g, this.b);
        return this;
    }

    lerp(color, alpha) {
        this.r += (color.r - this.r) * alpha;
        this.g += (color.g - this.g) * alpha;
        this.b += (color.b - this.b) * alpha;
        if (this._hardwareBridge) this._hardwareBridge.setRGB(this.r, this.g, this.b);
        return this;
    }

    toArray(array = [], offset = 0) {
        array[offset] = this.r;
        array[offset + 1] = this.g;
        array[offset + 2] = this.b;
        return array;
    }
}

class Ray {
    constructor(origin = new Vector3(), direction = new Vector3(0, 0, -1)) {
        this.origin = origin;
        this.direction = direction;
    }

    intersectBox(box, target) {
        let tmin, tmax, tymin, tymax, tzmin, tzmax;
        const invdirx = 1 / this.direction.x,
            invdiry = 1 / this.direction.y,
            invdirz = 1 / this.direction.z;
        const origin = this.origin;

        if (invdirx >= 0) {
            tmin = (box.min.x - origin.x) * invdirx;
            tmax = (box.max.x - origin.x) * invdirx;
        } else {
            tmin = (box.max.x - origin.x) * invdirx;
            tmax = (box.min.x - origin.x) * invdirx;
        }
        if (invdiry >= 0) {
            tymin = (box.min.y - origin.y) * invdiry;
            tymax = (box.max.y - origin.y) * invdiry;
        } else {
            tymin = (box.max.y - origin.y) * invdiry;
            tymax = (box.min.y - origin.y) * invdiry;
        }
        if ((tmin > tymax) || (tymin > tmax)) return null;
        if (tymin > tmin || isNaN(tmin)) tmin = tymin;
        if (tymax < tmax || isNaN(tmax)) tmax = tymax;

        if (invdirz >= 0) {
            tzmin = (box.min.z - origin.z) * invdirz;
            tzmax = (box.max.z - origin.z) * invdirz;
        } else {
            tzmin = (box.max.z - origin.z) * invdirz;
            tzmax = (box.min.z - origin.z) * invdirz;
        }
        if ((tmin > tzmax) || (tzmin > tmax)) return null;
        if (tzmin > tmin || tmin !== tmin) tmin = tzmin;
        if (tzmax < tmax || tmax !== tmax) tmax = tzmax;

        if (tmax < 0) return null;
        if (target) {
            target.copy(this.direction).multiplyScalar(tmin >= 0 ? tmin : tmax).add(this.origin);
        }
        return target || new Vector3();
    }

    intersectTriangle(a, b, c, backfaceCulling, target) {
        const edge1 = new Vector3().subVectors(b, a);
        const edge2 = new Vector3().subVectors(c, a);
        const pvec = new Vector3().set(
            this.direction.y * edge2.z - this.direction.z * edge2.y,
            this.direction.z * edge2.x - this.direction.x * edge2.z,
            this.direction.x * edge2.y - this.direction.y * edge2.x
        );
        const det = edge1.dot(pvec);

        if (backfaceCulling && det < 0) return null;
        if (Math.abs(det) < 0.00001) return null;

        const invDet = 1.0 / det;
        const tvec = new Vector3().subVectors(this.origin, a);
        const u = tvec.dot(pvec) * invDet;
        if (u < 0 || u > 1) return null;

        const qvec = new Vector3().set(
            tvec.y * edge1.z - tvec.z * edge1.y,
            tvec.z * edge1.x - tvec.x * edge1.z,
            tvec.x * edge1.y - tvec.y * edge1.x
        );
        const v = this.direction.dot(qvec) * invDet;
        if (v < 0 || u + v > 1) return null;

        const t = edge2.dot(qvec) * invDet;
        if (t < 0) return null;

        if (target) {
            target.copy(this.direction).multiplyScalar(t).add(this.origin);
            return target;
        }
        return new Vector3().copy(this.direction).multiplyScalar(t).add(this.origin);
    }
}

export class Raycaster {
    constructor() {
        this.ray = new Ray();
    }

    set(origin, direction) {
        this.ray.origin.copy(origin);
        this.ray.direction.copy(direction);
    }

    intersectObjects(objects, recursive = false) {
        const intersections = [];
        const target = new Vector3();

        for (let i = 0; i < objects.length; i++) {
            const obj = objects[i];
            let hitBox = null;

            if (obj.userData && obj.userData.box && !obj.userData.box.isEmpty()) {
                hitBox = obj.userData.box;
            } else if (obj.geometry && obj.geometry.boundingBox) {
                hitBox = obj.geometry.boundingBox.clone().applyMatrix4(obj.matrixWorld);
            }

            if (hitBox) {
                const hit = this.ray.intersectBox(hitBox, target);
                if (hit) {
                    if (obj.geometry && obj.geometry.attributes && obj.geometry.attributes.position) {
                        this._intersectGeometry(obj, intersections);
                    } else {
                        // Raw volume hit for non-rendered bounding volumes
                        const dist = this.ray.origin.distanceTo(target);
                        intersections.push({
                            distance: dist,
                            point: target.clone(),
                            object: obj,
                            face: null
                        });
                    }
                }
            }
        }

        intersections.sort((a, b) => a.distance - b.distance);
        return intersections;
    }

    _intersectGeometry(obj, intersections) {
        const positions = obj.geometry.attributes.position;
        const a = new Vector3();
        const b = new Vector3();
        const c = new Vector3();
        const target = new Vector3();

        for (let i = 0; i < positions.count; i += 3) {
            a.set(positions.getX(i), positions.getY(i), positions.getZ(i)).applyMatrix4(obj.matrixWorld);
            b.set(positions.getX(i+1), positions.getY(i+1), positions.getZ(i+1)).applyMatrix4(obj.matrixWorld);
            c.set(positions.getX(i+2), positions.getY(i+2), positions.getZ(i+2)).applyMatrix4(obj.matrixWorld);

            const hit = this.ray.intersectTriangle(a, b, c, false, target);
            if (hit) {
                intersections.push({
                    distance: this.ray.origin.distanceTo(target),
                    point: target.clone(),
                    object: obj,
                    face: null
                });
            }
        }
    }
}