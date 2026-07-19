// EngineScenegraph.js
// LEVEL 0 NATIVE SCENE GRAPH

import { Vector3, Euler, Matrix4, Color } from './EngineMath.js';

export class Node3D {
    constructor(hardwareBridge = null) {
        this.position = new Vector3();
        this.rotation = new Euler();
        this.scale = new Vector3(1, 1, 1);

        this.matrix = new Matrix4();
        this.matrixWorld = new Matrix4();
        this.matrixAutoUpdate = true;
        this.matrixWorldNeedsUpdate = false;

        this.parent = null;
        this.children = [];
        this.userData = {};

        // The Dumb Rasterizer Bridge
        this._hardwareBridge = hardwareBridge || (typeof THREE !== 'undefined' ? new THREE.Object3D() : null);
        if (this._hardwareBridge) {
            this._hardwareBridge.matrixAutoUpdate = false; // Lobotomize Three.js matrix math
        }
    }

    get visible() { return this._hardwareBridge ? this._hardwareBridge.visible : true; }
    set visible(v) { if (this._hardwareBridge) this._hardwareBridge.visible = v; }

    get quaternion() { return this._hardwareBridge ? this._hardwareBridge.quaternion : null; }

    add(child) {
        if (child === this) return;

        if (child._hardwareBridge !== undefined) {
            if (child.parent) child.parent.remove(child);
            child.parent = this;
            this.children.push(child);
            if (this._hardwareBridge && child._hardwareBridge) {
                this._hardwareBridge.add(child._hardwareBridge);
            }
        } else {
            // Accommodate raw hardware primitives (like Cameras and Lights) during the transition
            if (this._hardwareBridge) this._hardwareBridge.add(child);
        }
    }

    remove(child) {
        if (child._hardwareBridge !== undefined) {
            const index = this.children.indexOf(child);
            if (index !== -1) {
                child.parent = null;
                this.children.splice(index, 1);
                if (this._hardwareBridge && child._hardwareBridge) {
                    this._hardwareBridge.remove(child._hardwareBridge);
                }
            }
        } else {
            if (this._hardwareBridge) this._hardwareBridge.remove(child);
        }
    }

    removeFromParent() {
        if (this.parent) this.parent.remove(this);
    }

    traverse(callback) {
        callback(this);
        for (let i = 0, l = this.children.length; i < l; i++) {
            this.children[i].traverse(callback);
        }
    }

    lookAt(x, y, z) {
        if (this._hardwareBridge) {
            this._hardwareBridge.position.set(this.position.x, this.position.y, this.position.z);
            if (x.isVector3) {
                this._hardwareBridge.lookAt(x.x, x.y, x.z);
            } else {
                this._hardwareBridge.lookAt(x, y, z);
            }
            this.rotation.x = this._hardwareBridge.rotation.x;
            this.rotation.y = this._hardwareBridge.rotation.y;
            this.rotation.z = this._hardwareBridge.rotation.z;
            this.updateMatrix();
        }
    }

    _multiplyMatrices(a, b, target) {
        const ae = a.elements;
        const be = b.elements;
        const te = target.elements;

        const a11 = ae[0], a12 = ae[4], a13 = ae[8], a14 = ae[12];
        const a21 = ae[1], a22 = ae[5], a23 = ae[9], a24 = ae[13];
        const a31 = ae[2], a32 = ae[6], a33 = ae[10], a34 = ae[14];
        const a41 = ae[3], a42 = ae[7], a43 = ae[11], a44 = ae[15];

        const b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12];
        const b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13];
        const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
        const b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];

        te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
        te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
        te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
        te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;

        te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
        te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
        te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
        te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;

        te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
        te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
        te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
        te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;

        te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
        te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
        te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
        te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
    }

    updateMatrix() {
        const te = this.matrix.elements;
        const pos = this.position;
        const rot = this.rotation;
        const scale = this.scale;

        // YXZ Euler rotation composition (Mathematically matched to hardware expectations)
        const c1 = Math.cos(rot.x), s1 = Math.sin(rot.x);
        const c2 = Math.cos(rot.y), s2 = Math.sin(rot.y);
        const c3 = Math.cos(rot.z), s3 = Math.sin(rot.z);

        te[ 0 ] = ( c2 * c3 + s2 * s1 * s3 ) * scale.x;
        te[ 4 ] = ( -c2 * s3 + s2 * s1 * c3 ) * scale.y;
        te[ 8 ] = ( s2 * c1 ) * scale.z;
        te[ 12 ] = pos.x;

        te[ 1 ] = ( c1 * s3 ) * scale.x;
        te[ 5 ] = ( c1 * c3 ) * scale.y;
        te[ 9 ] = ( -s1 ) * scale.z;
        te[ 13 ] = pos.y;

        te[ 2 ] = ( -s2 * c3 + c2 * s1 * s3 ) * scale.x;
        te[ 6 ] = ( s2 * s3 + c2 * s1 * c3 ) * scale.y;
        te[ 10 ] = ( c2 * c1 ) * scale.z;
        te[ 14 ] = pos.z;

        te[ 3 ] = 0; te[ 7 ] = 0; te[ 11 ] = 0; te[ 15 ] = 1;

        this.matrixWorldNeedsUpdate = true;
    }

    updateMatrixWorld(force = false) {
        if (this.matrixAutoUpdate) this.updateMatrix();

        if (this.matrixWorldNeedsUpdate || force) {
            if (this.parent === null) {
                for (let i = 0; i < 16; i++) this.matrixWorld.elements[i] = this.matrix.elements[i];
            } else {
                this._multiplyMatrices(this.parent.matrixWorld, this.matrix, this.matrixWorld);
            }
            this.matrixWorldNeedsUpdate = false;
            force = true;

            // Push the mathematically pure vectors directly into the silenced rendering bridge
            if (this._hardwareBridge) {
                const hwe = this._hardwareBridge.matrixWorld.elements;
                const mwe = this.matrixWorld.elements;
                const hwm = this._hardwareBridge.matrix.elements;
                const lwm = this.matrix.elements;
                for (let i = 0; i < 16; i++) {
                    hwe[i] = mwe[i];
                    hwm[i] = lwm[i];
                }
            }
        }

        for (let i = 0, l = this.children.length; i < l; i++) {
            this.children[i].updateMatrixWorld(force);
        }
    }

    copy(source, recursive = true) {
        this.position.copy(source.position);
        this.rotation.copy(source.rotation);
        this.scale.copy(source.scale);
        this.userData = JSON.parse(JSON.stringify(source.userData));
        if (recursive) {
            for (let i = 0; i < source.children.length; i++) {
                this.add(source.children[i].clone());
            }
        }
        return this;
    }

    clone(recursive = true) {
        const clone = new this.constructor();
        if (this._hardwareBridge) clone._hardwareBridge = this._hardwareBridge.clone(false);
        clone.copy(this, recursive);
        return clone;
    }
}

export class Group extends Node3D {
    constructor() {
        super(typeof THREE !== 'undefined' ? new THREE.Group() : null);
        this.isGroup = true;
    }
    clone(recursive = true) {
        const clone = new Group();
        if (this._hardwareBridge) clone._hardwareBridge = this._hardwareBridge.clone(false);
        clone.copy(this, recursive);
        return clone;
    }
}

export class Mesh extends Node3D {
    constructor(geometry, material) {
        const hwGeom = geometry ? (geometry._hardwareBridge || geometry) : undefined;
        const hwMat = Array.isArray(material)
            ? material.map(m => m._hardwareBridge || m)
            : (material ? (material._hardwareBridge || material) : undefined);

        // Strip the native wrapper to feed the raw buffer to the hardware rasterizer
        super(typeof THREE !== 'undefined' ? new THREE.Mesh(hwGeom, hwMat) : null);
        this.isMesh = true;
        this.geometry = geometry;
        this.material = material;
    }

    get castShadow() { return this._hardwareBridge ? this._hardwareBridge.castShadow : false; }
    set castShadow(v) { if (this._hardwareBridge) this._hardwareBridge.castShadow = v; }

    get receiveShadow() { return this._hardwareBridge ? this._hardwareBridge.receiveShadow : false; }
    set receiveShadow(v) { if (this._hardwareBridge) this._hardwareBridge.receiveShadow = v; }

    clone(recursive = true) {
        const clone = new Mesh(this.geometry, this.material);
        if (this._hardwareBridge) clone._hardwareBridge = this._hardwareBridge.clone(false);
        clone.copy(this, recursive);
        return clone;
    }
}

export class InstancedMesh extends Mesh {
    constructor(geometry, material, count) {
        super(geometry, material);
        const hwGeom = geometry ? (geometry._hardwareBridge || geometry) : undefined;
        const hwMat = Array.isArray(material)
            ? material.map(m => m._hardwareBridge || m)
            : (material ? (material._hardwareBridge || material) : undefined);

        // Override the default Mesh bridge with an InstancedMesh bridge
        this._hardwareBridge = typeof THREE !== 'undefined' ? new THREE.InstancedMesh(hwGeom, hwMat, count) : null;
        if (this._hardwareBridge) this._hardwareBridge.matrixAutoUpdate = false;
        this.isInstancedMesh = true;
    }

    setMatrixAt(index, matrix) {
        if (this._hardwareBridge) this._hardwareBridge.setMatrixAt(index, matrix);
    }

    setColorAt(index, color) {
        if (this._hardwareBridge) {
            if (!this._hwColor) this._hwColor = new THREE.Color();
            this._hwColor.setRGB(color.r, color.g, color.b);
            this._hardwareBridge.setColorAt(index, this._hwColor);
        }
    }

    dispose() {
        if (this._hardwareBridge && this._hardwareBridge.dispose) this._hardwareBridge.dispose();
    }

    get instanceMatrix() { return this._hardwareBridge ? this._hardwareBridge.instanceMatrix : null; }
    get instanceColor() { return this._hardwareBridge ? this._hardwareBridge.instanceColor : null; }
}

export class Scene extends Node3D {
    constructor() {
        super(typeof THREE !== 'undefined' ? new THREE.Scene() : null);
        this.isScene = true;
        if (this._hardwareBridge) {
            this._hardwareBridge.autoUpdate = false; // Prevent WebGLRenderer from overwriting custom matrices
        }
    }

    get background() { return this._hardwareBridge ? this._hardwareBridge.background : null; }
    set background(v) {
        if (this._hardwareBridge) {
            if (v && typeof v.getHex === 'function' && typeof THREE !== 'undefined') {
                if (!this._hardwareBridge.background) this._hardwareBridge.background = new THREE.Color();
                this._hardwareBridge.background.setHex(v.getHex());
            } else {
                this._hardwareBridge.background = v;
            }
        }
    }

    get fog() { return this._hardwareBridge ? this._hardwareBridge.fog : null; }
    set fog(v) {
        if (this._hardwareBridge) {
            this._hardwareBridge.fog = v._hardwareBridge || v;
        }
    }
}

export class BufferAttribute {
    constructor(array, itemSize, bridgeAttribute = null) {
        this.array = array;
        this.itemSize = itemSize;
        this.count = array.length / itemSize;
        this.bridgeAttribute = bridgeAttribute; // Live-tether to the hardware buffer
    }
    getX(index) { return this.array[index * this.itemSize]; }
    setX(index, value) {
        this.array[index * this.itemSize] = value;
        if (this.bridgeAttribute) {
            this.bridgeAttribute.setX(index, value);
            this.bridgeAttribute.needsUpdate = true;
        }
    }
    getY(index) { return this.array[index * this.itemSize + 1]; }
    setY(index, value) {
        this.array[index * this.itemSize + 1] = value;
        if (this.bridgeAttribute) {
            this.bridgeAttribute.setY(index, value);
            this.bridgeAttribute.needsUpdate = true;
        }
    }
    getZ(index) { return this.array[index * this.itemSize + 2]; }
    setZ(index, value) {
        this.array[index * this.itemSize + 2] = value;
        if (this.bridgeAttribute) {
            this.bridgeAttribute.setZ(index, value);
            this.bridgeAttribute.needsUpdate = true;
        }
    }
}

export class BoxGeometry {
    constructor(width = 1, height = 1, depth = 1) {
        this.uuid = 'geom_' + Math.random().toString(36).substr(2, 9);
        this.type = 'BoxGeometry';
        this.isGeometry = true;
        this.parameters = { width, height, depth };
        this.boundingBox = null;
        this.attributes = {};

        const hw = width / 2, hh = height / 2, hd = depth / 2;
        const positions = new Float32Array([
            hw, hh, hd,   hw, hh, -hd,   hw, -hh, hd,   hw, -hh, -hd,  // px (Right)
            -hw, hh, -hd, -hw, hh, hd,   -hw, -hh, -hd, -hw, -hh, hd,  // nx (Left)
            -hw, hh, -hd, hw, hh, -hd,   -hw, hh, hd,   hw, hh, hd,    // py (Top)
            -hw, -hh, hd, hw, -hh, hd,   -hw, -hh, -hd, hw, -hh, -hd,  // ny (Bottom)
            -hw, hh, hd,  hw, hh, hd,    -hw, -hh, hd,  hw, -hh, hd,   // pz (Front)
            hw, hh, -hd,  -hw, hh, -hd,  hw, -hh, -hd,  -hw, -hh, -hd  // nz (Back)
        ]);

        const normals = new Float32Array([
            1,0,0,   1,0,0,   1,0,0,   1,0,0,
            -1,0,0, -1,0,0,  -1,0,0,  -1,0,0,
            0,1,0,   0,1,0,   0,1,0,   0,1,0,
            0,-1,0,  0,-1,0,  0,-1,0,  0,-1,0,
            0,0,1,   0,0,1,   0,0,1,   0,0,1,
            0,0,-1,  0,0,-1,  0,0,-1,  0,0,-1
        ]);

        const uvs = new Float32Array([
            0,1, 1,1, 0,0, 1,0,
            0,1, 1,1, 0,0, 1,0,
            0,1, 1,1, 0,0, 1,0,
            0,1, 1,1, 0,0, 1,0,
            0,1, 1,1, 0,0, 1,0,
            0,1, 1,1, 0,0, 1,0
        ]);

        const indices = new Uint16Array([
            0,2,1, 2,3,1,       // px
            4,6,5, 6,7,5,       // nx
            8,10,9, 10,11,9,    // py
            12,14,13, 14,15,13, // ny
            16,18,17, 18,19,17, // pz
            20,22,21, 22,23,21  // nz
        ]);

        this._hardwareBridge = typeof THREE !== 'undefined' ? new THREE.BufferGeometry() : null;

        if (this._hardwareBridge) {
            const hwPos = new THREE.BufferAttribute(positions, 3);
            const hwNorm = new THREE.BufferAttribute(normals, 3);
            const hwUv = new THREE.BufferAttribute(uvs, 2);
            this._hardwareBridge.setAttribute('position', hwPos);
            this._hardwareBridge.setAttribute('normal', hwNorm);
            this._hardwareBridge.setAttribute('uv', hwUv);
            this._hardwareBridge.setIndex(new THREE.BufferAttribute(indices, 1));

            // Map the 6 faces to material indices to support Multi-Material Arrays
            this._hardwareBridge.addGroup(0, 6, 0);  // px (Right)
            this._hardwareBridge.addGroup(6, 6, 1);  // nx (Left)
            this._hardwareBridge.addGroup(12, 6, 2); // py (Top)
            this._hardwareBridge.addGroup(18, 6, 3); // ny (Bottom)
            this._hardwareBridge.addGroup(24, 6, 4); // pz (Front)
            this._hardwareBridge.addGroup(30, 6, 5); // nz (Back)

            this.attributes.position = new BufferAttribute(positions, 3, hwPos);
            this.attributes.normal = new BufferAttribute(normals, 3, hwNorm);
            this.attributes.uv = new BufferAttribute(uvs, 2, hwUv);
        } else {
            this.attributes.position = new BufferAttribute(positions, 3);
            this.attributes.normal = new BufferAttribute(normals, 3);
            this.attributes.uv = new BufferAttribute(uvs, 2);
        }
    }

    translate(x, y, z) {
        const pos = this.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
            pos[i] += x;
            pos[i+1] += y;
            pos[i+2] += z;
        }
        this.attributes.position.setX(0, pos[0]); // Trigger physical bridge sync
        if (this.boundingBox) this.boundingBox = null;
        return this;
    }

    computeBoundingBox() {
        const pos = this.attributes.position.array;
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        for (let i = 0; i < pos.length; i += 3) {
            if (pos[i] < minX) minX = pos[i];
            if (pos[i] > maxX) maxX = pos[i];
            if (pos[i+1] < minY) minY = pos[i+1];
            if (pos[i+1] > maxY) maxY = pos[i+1];
            if (pos[i+2] < minZ) minZ = pos[i+2];
            if (pos[i+2] > maxZ) maxZ = pos[i+2];
        }
        if (typeof THREE !== 'undefined') {
            this.boundingBox = new THREE.Box3(new THREE.Vector3(minX, minY, minZ), new THREE.Vector3(maxX, maxY, maxZ));
        } else {
            this.boundingBox = { min: {x: minX, y: minY, z: minZ}, max: {x: maxX, y: maxY, z: maxZ} };
        }
    }

    dispose() {
        if (this._hardwareBridge) this._hardwareBridge.dispose();
    }
}

export class Material {
    constructor(hardwareBridge = null) {
        this.uuid = 'mat_' + Math.random().toString(36).substr(2, 9);
        this.isMaterial = true;
        this._hardwareBridge = hardwareBridge;
    }

    dispose() {
    }

    clone() {
        return new this.constructor();
    }
}

export class MeshBasicMaterial extends Material {
    constructor(parameters = {}) {
        let hwParams = {};
        if (typeof THREE !== 'undefined') {
            hwParams = { ...parameters };
            if (parameters.map) hwParams.map = parameters.map._hardwareBridge;
        }
        super(typeof THREE !== 'undefined' ? new THREE.MeshBasicMaterial(hwParams) : null);
        this.type = 'MeshBasicMaterial';

        this.map = parameters.map || null;
        this.color = new Color(parameters.color !== undefined ? parameters.color : 0xffffff, this._hardwareBridge ? this._hardwareBridge.color : null);

        Object.defineProperties(this, {
            opacity: { get: () => this._hardwareBridge.opacity, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.opacity = v; } },
            transparent: { get: () => this._hardwareBridge.transparent, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.transparent = v; } },
            depthWrite: { get: () => this._hardwareBridge.depthWrite, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.depthWrite = v; } },
            blending: { get: () => this._hardwareBridge.blending, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.blending = v; } },
            polygonOffset: { get: () => this._hardwareBridge.polygonOffset, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.polygonOffset = v; } },
            polygonOffsetFactor: { get: () => this._hardwareBridge.polygonOffsetFactor, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.polygonOffsetFactor = v; } }
        });

        this.opacity = parameters.opacity !== undefined ? parameters.opacity : 1.0;
        this.transparent = parameters.transparent || false;
        this.depthWrite = parameters.depthWrite !== undefined ? parameters.depthWrite : true;
        this.blending = parameters.blending !== undefined ? parameters.blending : 1;
        this.polygonOffset = parameters.polygonOffset || false;
        this.polygonOffsetFactor = parameters.polygonOffsetFactor || 0;
    }

    clone() {
        const cloneMat = super.clone();
        cloneMat.map = this.map;
        // Clone the color object properly
        cloneMat.color = this.color.clone();
        cloneMat.opacity = this.opacity;
        cloneMat.transparent = this.transparent;
        cloneMat.depthWrite = this.depthWrite;
        cloneMat.blending = this.blending;
        cloneMat.polygonOffset = this.polygonOffset;
        cloneMat.polygonOffsetFactor = this.polygonOffsetFactor;
        return cloneMat;
    }
}

export class Texture {
    constructor(hardwareBridge = null) {
        this.uuid = 'tex_' + Math.random().toString(36).substr(2, 9);
        this.isTexture = true;
        this._hardwareBridge = hardwareBridge;
    }

    dispose() {
    }
}

export class CanvasTexture extends Texture {
    constructor(canvas) {
        super(typeof THREE !== 'undefined' ? new THREE.CanvasTexture(canvas) : null);
        this.canvas = canvas;

        Object.defineProperties(this, {
            wrapS: { get: () => this._hardwareBridge.wrapS, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.wrapS = v; } },
            wrapT: { get: () => this._hardwareBridge.wrapT, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.wrapT = v; } },
            magFilter: { get: () => this._hardwareBridge.magFilter, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.magFilter = v; } },
            minFilter: { get: () => this._hardwareBridge.minFilter, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.minFilter = v; } },
            anisotropy: { get: () => this._hardwareBridge.anisotropy, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.anisotropy = v; } },
            colorSpace: { get: () => this._hardwareBridge.colorSpace, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.colorSpace = v; } },
        });

        this.repeat = {
            x: 1, y: 1,
            set: (x, y) => {
                this.repeat.x = x; this.repeat.y = y;
                if(this._hardwareBridge) this._hardwareBridge.repeat.set(x, y);
            }
        };
        this.offset = {
            x: 0, y: 0,
            set: (x, y) => {
                this.offset.x = x; this.offset.y = y;
                if(this._hardwareBridge) this._hardwareBridge.offset.set(x, y);
            }
        };

        this.wrapS = 1001;
        this.wrapT = 1001;
        this.magFilter = 1006;
        this.minFilter = 1008;
        this.anisotropy = 1;
        this.colorSpace = '';
    }

    clone() {
        const cloneTex = new CanvasTexture(this.canvas);
        cloneTex.wrapS = this.wrapS;
        cloneTex.wrapT = this.wrapT;
        cloneTex.magFilter = this.magFilter;
        cloneTex.minFilter = this.minFilter;
        cloneTex.anisotropy = this.anisotropy;
        cloneTex.colorSpace = this.colorSpace;
        cloneTex.repeat.set(this.repeat.x, this.repeat.y);
        cloneTex.offset.set(this.offset.x, this.offset.y);
        return cloneTex;
    }
}

export class MeshStandardMaterial extends Material {
    constructor(parameters = {}) {
        let hwParams = {};
        if (typeof THREE !== 'undefined') {
            hwParams = { ...parameters };
            if (parameters.map) hwParams.map = parameters.map._hardwareBridge;
            if (parameters.emissiveMap) hwParams.emissiveMap = parameters.emissiveMap._hardwareBridge;
            if (parameters.bumpMap) hwParams.bumpMap = parameters.bumpMap._hardwareBridge;
        }
        super(typeof THREE !== 'undefined' ? new THREE.MeshStandardMaterial(hwParams) : null);
        this.type = 'MeshStandardMaterial';

        this.map = parameters.map || null;
        this.emissiveMap = parameters.emissiveMap || null;
        this.bumpMap = parameters.bumpMap || null;

        this.color = new Color(parameters.color !== undefined ? parameters.color : 0xffffff, this._hardwareBridge ? this._hardwareBridge.color : null);
        this.emissive = new Color(parameters.emissive !== undefined ? parameters.emissive : 0x000000, this._hardwareBridge ? this._hardwareBridge.emissive : null);

        Object.defineProperties(this, {
            emissiveIntensity: { get: () => this._hardwareBridge.emissiveIntensity, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.emissiveIntensity = v; } },
            roughness: { get: () => this._hardwareBridge.roughness, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.roughness = v; } },
            metalness: { get: () => this._hardwareBridge.metalness, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.metalness = v; } },
            opacity: { get: () => this._hardwareBridge.opacity, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.opacity = v; } },
            transparent: { get: () => this._hardwareBridge.transparent, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.transparent = v; } },
            depthWrite: { get: () => this._hardwareBridge.depthWrite, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.depthWrite = v; } },
            alphaTest: { get: () => this._hardwareBridge.alphaTest, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.alphaTest = v; } },
            side: { get: () => this._hardwareBridge.side, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.side = v; } },
            polygonOffset: { get: () => this._hardwareBridge.polygonOffset, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.polygonOffset = v; } },
            polygonOffsetFactor: { get: () => this._hardwareBridge.polygonOffsetFactor, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.polygonOffsetFactor = v; } },
            bumpScale: { get: () => this._hardwareBridge.bumpScale, set: (v) => { if(this._hardwareBridge) this._hardwareBridge.bumpScale = v; } },
        });

        this.bumpScale = parameters.bumpScale !== undefined ? parameters.bumpScale : 1;
        this.emissiveIntensity = parameters.emissiveIntensity !== undefined ? parameters.emissiveIntensity : 1.0;
        this.roughness = parameters.roughness !== undefined ? parameters.roughness : 1.0;
        this.metalness = parameters.metalness !== undefined ? parameters.metalness : 0.0;
        this.opacity = parameters.opacity !== undefined ? parameters.opacity : 1.0;
        this.transparent = parameters.transparent || false;
        this.depthWrite = parameters.depthWrite !== undefined ? parameters.depthWrite : true;
        this.alphaTest = parameters.alphaTest !== undefined ? parameters.alphaTest : 0;
        this.side = parameters.side !== undefined ? parameters.side : 0;
        this.polygonOffset = parameters.polygonOffset || false;
        this.polygonOffsetFactor = parameters.polygonOffsetFactor || 0;
    }

    clone() {
        const cloneMat = super.clone();
        cloneMat.map = this.map;
        cloneMat.emissiveMap = this.emissiveMap;
        cloneMat.bumpMap = this.bumpMap;
        cloneMat.bumpScale = this.bumpScale;

        // Clone the color objects properly without breaking the hardware bridge proxy
        cloneMat.color.copy(this.color);
        cloneMat.emissive.copy(this.emissive);
        cloneMat.emissiveIntensity = this.emissiveIntensity;

        cloneMat.roughness = this.roughness;
        cloneMat.metalness = this.metalness;
        cloneMat.opacity = this.opacity;
        cloneMat.transparent = this.transparent;
        cloneMat.depthWrite = this.depthWrite;
        cloneMat.alphaTest = this.alphaTest;
        cloneMat.side = this.side;
        cloneMat.polygonOffset = this.polygonOffset;
        cloneMat.polygonOffsetFactor = this.polygonOffsetFactor;
        return cloneMat;
    }
}

export class Camera extends Node3D {
    constructor(hardwareBridge) {
        super(hardwareBridge);
        this.isCamera = true;
    }

    updateMatrixWorld(force = false) {
        super.updateMatrixWorld(force);
        if (this._hardwareBridge) {
            this._hardwareBridge.matrixWorldInverse.copy(this._hardwareBridge.matrixWorld).invert();
            // Cascade update to native children attached to the camera (e.g. SpotLight Targets)
            const hwChildren = this._hardwareBridge.children;
            for (let i = 0; i < hwChildren.length; i++) {
                hwChildren[i].updateMatrixWorld(true);
            }
        }
    }
}

export class PerspectiveCamera extends Camera {
    constructor(fov, aspect, near, far) {
        super(typeof THREE !== 'undefined' ? new THREE.PerspectiveCamera(fov, aspect, near, far) : null);
        this.type = 'PerspectiveCamera';
    }
    get fov() { return this._hardwareBridge ? this._hardwareBridge.fov : 75; }
    set fov(v) { if (this._hardwareBridge) this._hardwareBridge.fov = v; }
    get aspect() { return this._hardwareBridge ? this._hardwareBridge.aspect : 1; }
    set aspect(v) { if (this._hardwareBridge) this._hardwareBridge.aspect = v; }
    get near() { return this._hardwareBridge ? this._hardwareBridge.near : 0.1; }
    set near(v) { if (this._hardwareBridge) this._hardwareBridge.near = v; }
    get far() { return this._hardwareBridge ? this._hardwareBridge.far : 1000; }
    set far(v) { if (this._hardwareBridge) this._hardwareBridge.far = v; }
    updateProjectionMatrix() { if (this._hardwareBridge) this._hardwareBridge.updateProjectionMatrix(); }
}

export class OrthographicCamera extends Camera {
    constructor(left, right, top, bottom, near, far) {
        super(typeof THREE !== 'undefined' ? new THREE.OrthographicCamera(left, right, top, bottom, near, far) : null);
        this.type = 'OrthographicCamera';
    }
    updateProjectionMatrix() { if (this._hardwareBridge) this._hardwareBridge.updateProjectionMatrix(); }
}

export class Light extends Node3D {
    constructor(hardwareBridge) {
        super(hardwareBridge);
        this.isLight = true;
    }
    get intensity() { return this._hardwareBridge ? this._hardwareBridge.intensity : 1; }
    set intensity(v) { if (this._hardwareBridge) this._hardwareBridge.intensity = v; }
    get color() { return this._hardwareBridge ? this._hardwareBridge.color : null; }
    get castShadow() { return this._hardwareBridge ? this._hardwareBridge.castShadow : false; }
    set castShadow(v) { if (this._hardwareBridge) this._hardwareBridge.castShadow = v; }
    get shadow() { return this._hardwareBridge ? this._hardwareBridge.shadow : null; }
}

export class PointLight extends Light {
    constructor(color, intensity, distance, decay) {
        super(typeof THREE !== 'undefined' ? new THREE.PointLight(color, intensity, distance, decay) : null);
        this.type = 'PointLight';
    }
}

export class SpotLight extends Light {
    constructor(color, intensity, distance, angle, penumbra, decay) {
        super(typeof THREE !== 'undefined' ? new THREE.SpotLight(color, intensity, distance, angle, penumbra, decay) : null);
        this.type = 'SpotLight';
    }
    get target() { return this._hardwareBridge ? this._hardwareBridge.target : null; }
}

export class HemisphereLight extends Light {
    constructor(skyColor, groundColor, intensity) {
        super(typeof THREE !== 'undefined' ? new THREE.HemisphereLight(skyColor, groundColor, intensity) : null);
        this.type = 'HemisphereLight';
        this.position.set(0, 1, 0); // Prevent structural NaN collapse
    }
}

export const PCFShadowMap = 1;
export const ACESFilmicToneMapping = 4;
export const SRGBColorSpace = 'srgb';
export const NearestFilter = 1003;

export class FogExp2 {
    constructor(color, density) {
        this.isFog = true;
        const hwColor = color && typeof color.getHex === 'function' ? color.getHex() : color;
        this._hardwareBridge = typeof THREE !== 'undefined' ? new THREE.FogExp2(hwColor, density) : null;
    }
    get color() { return this._hardwareBridge ? this._hardwareBridge.color : null; }
    get density() { return this._hardwareBridge ? this._hardwareBridge.density : 0; }
    set density(v) { if (this._hardwareBridge) this._hardwareBridge.density = v; }
}

export class WebGLRenderer {
    constructor(params) {
        this._hardwareBridge = typeof THREE !== 'undefined' ? new THREE.WebGLRenderer(params) : null;
    }
    get domElement() { return this._hardwareBridge ? this._hardwareBridge.domElement : null; }
    setPixelRatio(v) { if (this._hardwareBridge) this._hardwareBridge.setPixelRatio(v); }
    setSize(w, h, updateStyle) { if (this._hardwareBridge) this._hardwareBridge.setSize(w, h, updateStyle); }
    get shadowMap() { return this._hardwareBridge ? this._hardwareBridge.shadowMap : {}; }
    get toneMapping() { return this._hardwareBridge ? this._hardwareBridge.toneMapping : 0; }
    set toneMapping(v) { if (this._hardwareBridge) this._hardwareBridge.toneMapping = v; }
    get toneMappingExposure() { return this._hardwareBridge ? this._hardwareBridge.toneMappingExposure : 1; }
    set toneMappingExposure(v) { if (this._hardwareBridge) this._hardwareBridge.toneMappingExposure = v; }
    get outputColorSpace() { return this._hardwareBridge ? this._hardwareBridge.outputColorSpace : ''; }
    set outputColorSpace(v) { if (this._hardwareBridge) this._hardwareBridge.outputColorSpace = v; }
    setRenderTarget(target) {
        if (this._hardwareBridge) this._hardwareBridge.setRenderTarget(target ? target._hardwareBridge : null);
    }
    render(scene, camera) {
        if (this._hardwareBridge) {
            this._hardwareBridge.render(scene._hardwareBridge || scene, camera._hardwareBridge || camera);
        }
    }
}

export class WebGLRenderTarget {
    constructor(width, height, options) {
        this._hardwareBridge = typeof THREE !== 'undefined' ? new THREE.WebGLRenderTarget(width, height, options) : null;
    }
    setSize(w, h) { if (this._hardwareBridge) this._hardwareBridge.setSize(w, h); }
    get texture() { return this._hardwareBridge ? this._hardwareBridge.texture : null; }
}

export class PlaneGeometry extends Node3D {
    constructor(w, h) {
        super(typeof THREE !== 'undefined' ? new THREE.PlaneGeometry(w, h) : null);
        this.isGeometry = true;
    }
}

export class ShaderMaterial extends Material {
    constructor(params) {
        super();
        this._hardwareBridge = typeof THREE !== 'undefined' ? new THREE.ShaderMaterial(params) : null;
    }
    get uniforms() { return this._hardwareBridge ? this._hardwareBridge.uniforms : {}; }
}