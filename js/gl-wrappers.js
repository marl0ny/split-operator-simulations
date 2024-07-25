import gCanvas from "./canvas.js";

function initializeWebGL1(gl) {
    gl.version = 1;
    defineExtraTextureTypes(gl);
    if (gl === null) {
        let msg = "Your browser does not support WebGL.";
        alert(msg);
        throw msg;
    }
    let ext1 = gl.getExtension('OES_texture_float');
    let ext2 = gl.getExtension('OES_texture_float_linear');
    let ext3 = gl.getExtension('WEBGL_color_buffer_float');
    // let ext4 = gl.getExtension('EXT_float_blend');
    if (ext1 === null || ext2 === null || ext3 === null 
        //|| ext4 === null

    ) {
        let msg = "Your browser does not support "
                    + "the necessary WebGL extensions.";
        alert(msg);
        throw msg;
    }
    return gl;
}

function initializeWebGL2(gl) {
    gl.version = 2;
    let ext1 = gl.getExtension('EXT_color_buffer_float');
    let ext2 = gl.getExtension('OES_texture_float_linear');
    if (ext1 === null || ext2 === null) {
        let msg = "Your browser does not support "
                    + "the necessary WebGL extensions.";
        alert(msg);
        throw msg;
    }
    return gl;
}

export const gl = ((canvas) => {
    // return initializeWebGL1(canvas.getContext("webgl"));
    let gl = canvas.getContext("webgl2");
    if (gl === null) {
        console.warn(`Your browser does not support WebGL2. `
                      + `Trying WebGL1 instead...`);
        gl = canvas.getContext("webgl");
        initializeWebGL1(gl);
    } else {
        initializeWebGL2(gl);
    }
    return gl;
})(gCanvas);

function defineExtraTextureTypes(gl) {
    gl.RGBA32F = gl.RGBA;
}

class Scalar {
    value;
    constructor(value) {
        this.value = value;
    }
}

export class IScalar extends Scalar {}
export class FScalar extends Scalar {}

class AbstractVec {
    ind;
    get x() { return this.ind[0]; }
    get y() { return this.ind[1]; }
    get z() { return this.ind[2]; }
    get w() { return this.ind[3]; }
    get r() { return this.ind[0]; }
    get g() { return this.ind[1]; }
    get b() { return this.ind[2]; }
    get a() { return this.ind[3]; }
    set x(x) { this.ind[0] = x; }
    set y(y) { this.ind[1] = y; }
    set z(z) { this.ind[2] = z; }
    set w(w) { this.ind[3] = w; }
    set r(r) { this.ind[0] = r; }
    set g(g) { this.ind[1] = g; }
    set b(b) { this.ind[2] = b; }
    set a(a) { this.ind[3] = a; }
    lengthSquared() {
        let sum = 0.0;
        for (let i = 0; i < this.ind.length; i++)
            sum += this.ind[i]*this.ind[i];
        return sum;
    }
    length() {
        return Math.sqrt(this.lengthSquared());
    }
}

export class Vec2 extends AbstractVec {
    constructor(...args) {
        super();
        this.ind = new Float32Array(2);
        if (args.length !== 2)
            throw "Two elements required.";
        for (let i = 0; i < this.ind.length; i++) {
            this.ind[i] = parseFloat(args[i]);
        }
    }
}

export class Vec3 extends AbstractVec {
    constructor(...args) {
        super();
        this.ind = new Float32Array(3);
        if (args.length !== 3)
            throw "Three elements required.";
        for (let i = 0; i < this.ind.length; i++) {
            this.ind[i] = parseFloat(args[i]);
        }
    }
    static crossProd(a, b) {
        return new Vec3(
            a.y*b.z - a.z*b.y, a.z*b.x - a.x*b.z, a.x*b.y - a.y*b.x
        );
    }
}

export class Vec4 extends AbstractVec {
    constructor(...args) {
        super();
        this.ind = new Float32Array(4);
        if (args.length !== 4)
            throw "Four elements required.";
        for (let i = 0; i < this.ind.length; i++) {
            this.ind[i] = parseFloat(args[i]);
        }
    }
}


export class IVec2 extends AbstractVec {
    constructor(...args) {
        super();
        this.ind = new Int32Array(2);
        if (args.length !== 2)
            throw "Two elements required.";
        for (let i = 0; i < this.ind.length; i++) {
            this.ind[i] = parseInt(args[i]);
        }
    }
}

export class IVec3 extends AbstractVec {
    constructor(...args) {
        super();
        this.ind = new Int32Array(3);
        if (args.length !== 3)
            throw "Three elements required.";
        for (let i = 0; i < this.ind.length; i++) {
            this.ind[i] = parseInt(args[i]);
        }
    }
}

export class IVec4 extends AbstractVec {
    constructor(...args) {
        super();
        this.ind = new Int32Array(4);
        if (args.length !== 4)
            throw "Four elements required.";
        for (let i = 0; i < this.ind.length; i++) {
            this.ind[i] = parseInt(args[i]);
        }
    }
}

export class Complex {
    real;
    imag;
    constructor(real, imag) {
        this.real = real;
        this.imag = imag;
    }
    conj() {
        return new Complex(this.real, -this.imag);
    }
    get abs2() {
        return this.real*this.real + this.imag*this.imag;
    }
    get abs() {
        return Math.sqrt(this.abs2);
    }
    get arg() {
        if (this.real === 0.0) {
            if (this.imag >= 0.0) {
                return Math.PI/2.0;
            } else {
                return -Math.PI/2.0;
            }
        } else {
            let val = Math.atan(this.imag/this.real);
            if (this.real < 0.0) {
                if (this.imag >= 0.0) {
                    return Math.PI + val;
                } else {
                    return -Math.PI + val;
                }
            }
            return val;
        }
    }
    static real(r) {
        return new Complex(r, 0.0);
    }
    static imag(i) {
        return new Complex(0.0, i);
    }
}

const real = r => new Complex(r, 0.0);

const imag = r => new Complex(0.0, r);

export const abs = (z) => {
    if (z instanceof Complex)
        return z.abs;
    else if (typeof(z) === 'number')
        return Math.abs(z);
};


const complexAdd = (z, w) => new Complex(z.real + w.real, z.imag + w.imag);

const complexSub = (z, w) => new Complex(z.real - w.real, z.imag - w.imag);

const complexMul = (z, w) => new Complex(z.real*w.real - z.imag*w.imag,
                                         z.real*w.imag + z.imag*w.real);

const complexDiv = (z, w) => {
    let invW = mul(real(1.0/w.abs2), w.conj());
    return complexMul(z, invW);
}

const complexPow = (z, w) => {
    if (z.imag === 0.0 && w.imag === 0.0)
        return new Complex(Math.pow(z.real, w.real), 0.0);
    else
        return exp(mul(log(z), w));
}

export class Quaternion {
    ind;
    constructor(...args) {
        this.ind = new Float32Array(4);
        for (let [i, e] of args.entries()) {
            this.ind[i] = e;
        }
    }
    get i() {return this.ind[1]; }
    get j() {return this.ind[2]; }
    get k() {return this.ind[3]; }
    get real() {return this.ind[0]; }
    set i(i) { this.ind[1] = i; }
    set j(j) { this.ind[2] = j; }
    set k(k) { this.ind[3] = k; }
    set real(real) { this.ind[0] = real; }
    conj() {
        return new Quaternion(this.real, -this.i, -this.j, -this.k);
    }
    lengthSquared() {
        return (this.real*this.real 
                + this.i*this.i + this.j*this.j + this.k*this.k);
    }
    length() {
        return Math.sqrt(this.lengthSquared());
    }
    scalarProd(a) {
        return new Quaternion(a*this.real, a*this.i, a*this.j, a*this.k);
    }
    inverse() {
        return this.conj().scalarProd(1.0/this.lengthSquared());
    }
    static rotator(angle, x, y, z) {
        let norm = Math.sqrt(x*x + y*y + z*z);
        if (norm === 0.0)
            return new Quaternion(1.0);
        let c = Math.cos(angle/2.0);
        let s = Math.sin(angle/2.0);
        return new Quaternion(c, s*x/norm, s*y/norm, s*z/norm);
    }
}

export function dot(a, b) {
    for (let VecType of [Vec2, Vec3, Vec4, IVec2, IVec3, IVec4]) {
        if (a instanceof VecType && b instanceof VecType) {
            let sum = 0.0;
            for (let i = 0; i < a.ind.length; i++) {
                sum += a.ind[i]*b.ind[i];
            }
            return sum;
        }
    }
    throw `dot unsupported between ${a} and ${b}`;
}

function vectorOrScalarBinOp(a, b, opFunc) {
    let vals = [0.0, 0.0];
    for (let VecType of [Vec2, Vec3, Vec4, IVec2, IVec3, IVec4]) {
        let v = new VecType(...vals);
        if (a instanceof VecType && b instanceof VecType) {
            for (let i = 0; i < v.ind.length; i++)
                v.ind[i] = opFunc(a.ind[i], b.ind[i]);
            return v;
        } else if (a instanceof VecType && typeof(b) === 'number') {
            for (let i = 0; i < v.ind.length; i++)
                v.ind[i] = opFunc(a.ind[i], b);
            return v;
        } else if (b instanceof VecType && typeof(a) === 'number') {
            for (let i = 0; i < v.ind.length; i++)
                v.ind[i] = opFunc(a, b.ind[i]);
            return v;
        }
        vals.push(0.0);
    }
    throw `Unsupported operation between ${a} and ${b}.`;
}

export function add(a, b) {
    if (typeof(a) === 'number' && typeof(b) === 'number')
        return a + b;
    else if (a instanceof AbstractVec || b instanceof AbstractVec)
        return vectorOrScalarBinOp(a, b, add);
    else if (typeof(a) === 'number' && b instanceof Complex)
        return complexAdd(real(a), b);
    else if (a instanceof Complex && typeof(b) === 'number')
        return complexAdd(a, real(b));
    else if ((a instanceof Complex) && b instanceof Complex)
        return complexAdd(a, b);
    else if (typeof(a) === 'number' && b instanceof Quaternion)
        return new Quaternion(a + b.real, b.i, b.j, b.k);
    else if (a instanceof Quaternion && typeof(b) === 'number')
        return new Quaternion(a.real + b, a.i, a.j, a.k);
    else if (a instanceof Quaternion && b instanceof Quaternion)
        return new Quaternion(a.real + b.real,
                              a.i + b.i, a.j + b.j, a.k + b.k);
    throw `Unsupported add between ${a} and ${b}`;
}

export function sub(a, b) {
    if (typeof(a) === 'number' && typeof(b) === 'number')
        return a - b;
    else if (a instanceof AbstractVec || b instanceof AbstractVec)
        return vectorOrScalarBinOp(a, b, sub);
    else if (typeof(a) === 'number' && b instanceof Complex)
        return complexSub(real(a), b);
    else if (a instanceof Complex && typeof(b) === 'number')
        return complexSub(a, real(b));
    else if (a instanceof Complex && b instanceof Complex)
        return complexSub(a, b);
    else if (typeof(a) === 'number' && b instanceof Quaternion)
        return new Quaternion(a - b.real, -b.i, -b.j, -b.k);
    else if (a instanceof Quaternion && typeof(b) === 'number')
        return new Quaternion(a.real - b, a.i, a.j, a.k);
    else if (a instanceof Quaternion && b instanceof Quaternion)
        return new Quaternion(a.real - b.real, 
                              a.i - b.i, a.j - b.j, a.k - b.k);
    throw `Unsupported subtraction between ${a} and ${b}`;
}

export function div(a, b) {
    if (typeof(a) === 'number' && typeof(b) === 'number')
        return a / b;
    else if (a instanceof AbstractVec || b instanceof AbstractVec)
        return vectorOrScalarBinOp(a, b, div);
    else if (typeof(a) === 'number' && b instanceof Complex)
        return complexDiv(real(a), b);
    else if (a instanceof Complex && typeof(b) === 'number')
        return complexDiv(a, real(b));
    else if (a instanceof Complex && b instanceof Complex)
        return complexDiv(a, b);
    else if (a instanceof Quaternion && typeof(b) === 'number')
        return new Quaternion(a.real/b, a.i/b, a.j/b, a.k/b);
    else if ((a instanceof Quaternion && b instanceof Quaternion) || 
                (typeof(a) === 'number' && b instanceof Quaternion))
        return mul(a, b.inverse());
    throw `Unsupported divide between ${a} and ${b}`;
}

export function mul(a, b) {
    if (typeof(a) === 'number' && typeof(b) === 'number')
        return a*b;
    else if (a instanceof AbstractVec || b instanceof AbstractVec)
        return vectorOrScalarBinOp(a, b, mul);
    else if (a === 'number' && b instanceof Complex)
        return complexMul(real(a), b);
    else if (a instanceof Complex && typeof(b) === 'number')
        return complexMul(a, real(b));
    else if (a instanceof Complex && b instanceof Complex)
        return complexMul(a, b);
    else if (typeof(a) === 'number' && b instanceof Quaternion)
        return new Quaternion(a*b.real, a*b.i, a*b.j, a*b.k);
    else if (a instanceof Quaternion && typeof(b) === 'number')
        return new Quaternion(a.real*b, a.i*b, a.j*b, a.k*b);
    else if (a instanceof Quaternion && b instanceof Quaternion)
        return new Quaternion(
            a.real*b.real - a.i*b.i - a.j*b.j - a.k*b.k, // real part
            a.real*b.i + a.i*b.real + a.j*b.k - a.k*b.j, // i
            a.real*b.j + a.j*b.real + a.k*b.i - a.i*b.k, // j
            a.real*b.k + a.k*b.real + a.i*b.j - a.j*b.i, // k
        );
    throw `Unsupported multiply between ${a} and ${b}`;
}

export function pow(a, b) {
    if (typeof(a) === 'number' && typeof(b) === 'number') {
        return Math.pow(a, b);
    } else if (typeof(a) === 'number' && b instanceof Complex) {
        return complexPow(real(a), b);
    } else if (a instanceof Complex && typeof(b) === 'number') {
        return complexPow(a, real(b));
    } else if (a instanceof Complex && b instanceof Complex) {
        return complexPow(a, b);
    }
}

export class TextureParams {
    format;
    width;
    height;
    generateMipmap;
    wrapS;
    wrapT;
    minFilter;
    magFilter;
    constructor(
        format, 
        width, height, 
        generateMipmap=true,
        wrapS=gl.REPEAT, wrapT=gl.REPEAT,
        minFilter=gl.NEAREST, magFilter=gl.NEAREST) {
        this.format = format;
        this.width = width;
        this.height = height;
        this.generateMipmap = generateMipmap;
        this.wrapS = wrapS;
        this.wrapT = wrapT;
        this.minFilter = minFilter;
        this.magFilter = magFilter;
    }
    equals(other) {
        return Object.keys(this).every(e => this[e] === other[e]);
    }
}

export class Attribute {
    size;
    type;
    normalized;
    stride;
    pointerOffset;
    constructor(size, type, 
                normalized=false, stride=0, pointerOffset=0) {
        this.size = size;
        this.type = type;
        this.normalized = normalized;
        this.stride = stride;
        this.pointerOffset = pointerOffset;
    }
}

let gFramesCount = 0;

export function acquireNewFrame() {
    let frame_id = gFramesCount;
    gFramesCount++;
    return frame_id;
}

function toBase(sized) {
    if (gl.version === 1) {
        return gl.RGBA;
    }
    switch (sized) {
        case gl.RGBA32F: case gl.RGBA32I: case gl.RGBA32UI: case gl.RGBA16F:
        case gl.RGBA16I: case gl.RGBA16UI: case gl.RGBA8I: case gl.RGBA8UI:
        case gl.RGBA8:
            return gl.RGBA;
        case gl.RGB32F: case gl.RGB32I: case gl.RGB32UI: case gl.RGB16F:
        case gl.RGB16I: case gl.RGB16UI: case gl.RGB8I: case gl.RGB8UI:
        case gl.RGB8:
            return gl.RGB;
        case gl.RG32F: case gl.RG32I: case gl.RG32UI: case gl.RG16F:
        case gl.RG16I: case gl.RG16UI: case gl.RG8I: case gl.RG8UI:
            return gl.RG;
        case gl.R32F: case gl.R32I: case gl.R32UI: case gl.R16F: case gl.R16I:
        case gl.R16UI: case gl.R8: case gl.R8UI:
            return gl.RED;
    }
    return 0;
}

function toType(sized) {
    if (gl.version === 1) {
        return gl.FLOAT;
    }
    switch (sized) {
        case gl.RGBA32F: case gl.RGB32F: case gl.RG32F: case gl.R32F:
            return gl.FLOAT;
        case gl.RGBA32I: case gl.RGB32I: case gl.RG32I: case gl.R32I:
            return gl.INT;
        case gl.RGBA32UI: case gl.RGB32UI: case gl.RG32UI: case gl.R32UI:
            return gl.UNSIGNED_INT;
        case gl.RGBA16F: case gl.RGB16F: case gl.RG16F: case gl.R16F:
            return gl.HALF_FLOAT;
        case gl.RGBA16I: case gl.RGB16I: case gl.RG16I: case gl.R16I:
            return gl.SHORT;
        case gl.RGBA16UI: case gl.RGB16UI: case gl.RG16UI: case gl.R16UI:
            return gl.UNSIGNED_SHORT;
        case gl.RGBA8: case gl.RGB8: case gl.RG8: case gl.R8:
            return gl.UNSIGNED_BYTE;
        case gl.RGBA8UI: case gl.RGB8UI: case gl.RG8UI: case gl.R8UI:
            return gl.UNSIGNED_BYTE;
    }
    return 0;
}

export function compileShader(ref, source) {
    let source2 = ((gl.version === 2)? "#version 300 es\n": "") + source;
    gl.shaderSource(ref, source2);
    gl.compileShader(ref)
    // let status = gl.getShaderiv(ref, gl.COMPILE_STATUS);
    let infoLog = gl.getShaderInfoLog(ref);
    if (infoLog !== null && infoLog !== '')
        console.log(infoLog);
    /* if (status == false) {
        console.err(`Shader compilation failed ${infoLog}`);
    }*/
}

export function shaderFromSource(source, type) {
    const reference = gl.createShader(type)
    if (reference === 0) {
        console.error(
            `Unable to create shader (error code ${gl.getError()})`);
        return 0;
    }
    compileShader(reference, source);
    return reference;
}

export function makeProgramFromSources(vertexSource, fragmentSource) {
    let vertexRef = shaderFromSource(vertexSource, gl.VERTEX_SHADER);
    let fragmentRef = shaderFromSource(fragmentSource, gl.FRAGMENT_SHADER);
    let program = gl.createProgram();
    if (program === 0) {
        console.error("Unable to create program.");
    }
    gl.attachShader(program, vertexRef);
    gl.attachShader(program, fragmentRef);
    // gl.GetProgramiv(program, gl.LINK_STATUS, &status)
    gl.linkProgram(program);
    let infoLog = gl.getProgramInfoLog(program);
    if (infoLog !== null && infoLog !== '')
        console.error(infoLog);
    gl.useProgram(program);
    return program;

}

function unbind() {
    if (gl.version === 2)
        gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
}

const QUAD_VERTEX_SHADER = `
#if __VERSION__ <= 120
attribute vec3 position;
varying vec2 UV;
#else
in vec3 position;
out highp vec2 UV;
#endif
void main() {
    gl_Position = vec4(position.xyz, 1.0);
    UV = position.xy/2.0 + vec2(0.5, 0.5);
}
`

const QUAD_FRAG_COPY_SHADER = `
#if (__VERSION__ >= 330) || (defined(GL_ES) && __VERSION__ >= 300)
#define texture2D texture
#else
#define texture texture2D
#endif

#if (__VERSION__ > 120) || defined(GL_ES)
precision highp float;
#endif
    
#if __VERSION__ <= 120
varying vec2 UV;
#define fragColor gl_FragColor
#else
in vec2 UV;
out vec4 fragColor;
#endif

uniform sampler2D tex;

void main() {
    fragColor = texture2D(tex, UV);
}
`

const getQuadVertices = () => new Float32Array(
    [-1.0, -1.0, 0.0, -1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, -1.0, 0.0]);

const getQuadElements = () => (gl.version === 2)? 
    new Int32Array([0, 1, 2, 0, 2, 3]): new Uint16Array([0, 1, 2, 0, 2, 3]);

class AbstractWireFrame {
    _attributes;
    _vertices;
    _elements;
    _vao;
    _vbo;
    _ebo;
    constructor(attributes, vertices, elements=null) {
        this._attributes = attributes;
        this._vertices = vertices;
        this._elements = elements;
        console.log(vertices);
        this._vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._vbo);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        // Initialize element buffer object
        if (elements !== null) {
            this._ebo = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._ebo);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elements, gl.STATIC_DRAW);
        }
    }
    draw(program) {
        // gl.BindVertexArray(this._vao)
        gl.bindBuffer(gl.ARRAY_BUFFER, this._vbo);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._ebo);
        /* if (this_.vao === 0) {
            let vertices = this._vertices;
            let elements = this._elements;
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elements, gl.STATIC_DRAW);
        }*/
        for (let k of Object.keys(this._attributes)) {
            let attribute = this._attributes[k];
            // console.log(program, k, attribute);
            let id = gl.getAttribLocation(program, k);
            gl.enableVertexAttribArray(id);
            gl.vertexAttribPointer(id, attribute.size, attribute.type, 
                                   attribute.normalized, attribute.stride, 
                                   attribute.pointerOffset);
        }
    }

}

export class TrianglesFrame extends AbstractWireFrame {
    draw(program) {
        super.draw(program);
        if (this._elements === null || this._elements.length === 0)
            gl.drawArrays(gl.TRIANGLES, 0, this._vertices.length);
        else
            gl.drawElements(gl.TRIANGLES, this._elements.length,
                            (gl.version === 2)? 
                            gl.UNSIGNED_INT: gl.UNSIGNED_SHORT,
                            null);
    }
}

export class LinesFrame extends AbstractWireFrame {
    draw(program) {
        super.draw(program);
        if (this._elements === null || this._elements.length === 0) {
            gl.drawArrays(gl.LINES, 0, this._vertices.length);
        } else {
            gl.drawElements(gl.LINES, this._elements.length,
                            (gl.version === 2)? 
                            gl.UNSIGNED_INT: gl.UNSIGNED_SHORT, null);
        }
    }
}

export class RenderTarget {
    _id;
    _params;
    _texture;
    _fbo;
    _rbo;
    constructor(textureParams) {
        this._id = acquireNewFrame();
        this._params = textureParams;
        this._initTexture();
        this._initBuffer();
        unbind();
    }
    get id() {
        return this._id;
    }
    get width() {
        return this._params.width;
    }
    get height() {
        return this._params.height;
    }
    _initTexture() {
        if (this._id === 0) {
            // this._texture = gl.createTexture();
            // gl.activeTexture(gl.TEXTURE0);
            // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            return;
        }
        console.log(this._id);
        gl.activeTexture(gl.TEXTURE0 + this._id);
        this._texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this._texture);
        let params = this._params;
        console.log(this._texture);
        console.log(params.format, toBase(params.format), toType(params.format));
        console.log(gl.RGBA32F, gl.RGBA, gl.FLOAT);
        gl.texImage2D(gl.TEXTURE_2D, 0, params.format, 
            params.width, params.height, 0,
            toBase(params.format), toType(params.format), null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, params.wrapS);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, params.wrapT);
        gl.texParameteri(gl.TEXTURE_2D, 
            gl.TEXTURE_MIN_FILTER, params.minFilter);
        gl.texParameteri(gl.TEXTURE_2D, 
            gl.TEXTURE_MAG_FILTER, params.magFilter);
        if (params.generateMipmap) {
            gl.generateMipmap(gl.TEXTURE_2D);
        }
    }
    _initBuffer() {
        if (this._id !== 0) {
            this._fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                                    gl.TEXTURE_2D, this._texture, 0);
            this._rbo = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, this._rbo);
            gl.renderbufferStorage(
                gl.RENDERBUFFER, gl.DEPTH_STENCIL,
                this._params.width, this._params.height);
            gl.framebufferRenderbuffer(
                gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT,
                gl.RENDERBUFFER, this._rbo);
        }
    }
    clear() {
        if (this._id !== 0) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
            gl.bindRenderbuffer(gl.RENDERBUFFER, this._rbo);
            gl.clear(gl.COLOR_BUFFER_BIT| gl.DEPTH_BUFFER_BIT);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        }
    }
    _adjust_viewport_before_drawing(config) {
        if (config !== null
            && keys.includes('width') && keys.includes('height'))
            gl.viewport(0, 0, config.width, config.height);
        else if (config !== null && keys.includes('viewport'))
            gl.viewport(config['viewport'][0], config['viewport'][1],
                        config['viewport'][2], config['viewport'][3])
        else
            gl.viewport(0, 0, this.width, this.height);
    }
    draw(program, uniforms, wireFrame, config=null) {
        let originalViewport = gl.getParameter(gl.VIEWPORT);
        this._adjust_viewport_before_drawing(config);
        gl.useProgram(program);
        if (this._id !== 0) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
            gl.bindRenderbuffer(gl.RENDERBUFFER, this._rbo);
        }
        for (let name of Object.keys(uniforms)) {
            let loc = gl.getUniformLocation(program, name);
            let val = uniforms[name];
            if (typeof(val) === 'number') {
                gl.uniform1f(loc, val);
            } else if (val instanceof IScalar) {
                gl.uniform1i(loc, val.value);
            } else if (typeof(val) === 'boolean') {
                gl.uniform1i(loc, (val === true)? 1: 0);
            } else if (val instanceof Vec4) {
                gl.uniform4f(loc, val.x, val.y, val.z, val.w);
            } else if (val instanceof Vec2) {
                gl.uniform2f(loc, val.x, val.y);
            } else if (val instanceof IVec2) {
                gl.uniform2i(loc, val.x, val.y);
            } else if (val instanceof IVec4) {
                gl.uniform4i(loc, val.x, val.y, val.z, val.w);
            } else if (val instanceof Quaternion) {
                gl.uniform4f(loc, val.i, val.j, val.k, val.real);
            } else if (val instanceof Complex) {
                gl.uniform2f(loc, val.real, val.imag);
            } else if (val instanceof Vec3) {
                // console.log(name, loc, val.x, val.y, val.z);
                gl.uniform3f(loc, val.x, val.y, val.z);
            } else if (val instanceof IVec3) {
                gl.uniform3i(loc, val.x, val.y, val.z);
            } else if (val instanceof Quad) {
                gl.uniform1i(loc, val.id);
            } else if (val instanceof RenderTarget) {
                gl.uniform1i(loc, val.id);
            }
        }
        wireFrame.draw(program);
        gl.viewport(originalViewport[0], originalViewport[1],
                    originalViewport[2], originalViewport[3]);
        unbind();
    }
}


let gQuadObjects = {
    isInitialized: false, vao: 0, vbo: 0, ebo: 0
};

gQuadObjects.init = () => {
    if (!gQuadObjects.isInitialized) {
        // TODO: Initialize vertex array object, if possible.
        // Initialize vertex buffer object
        gQuadObjects.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, gQuadObjects.vbo);
        let vertices = getQuadVertices();
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        // Initialize element buffer object
        gQuadObjects.ebo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gQuadObjects.ebo);
        let elements = getQuadElements();
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elements, gl.STATIC_DRAW);
        gQuadObjects.isInitialized = true;
        Object.freeze(gQuadObjects);
    }
}

let gRecycledQuads = {};

export class Quad {
    _id;
    _params;
    _texture;
    _fbo;
    constructor(textureParams) {
        for (let id of Object.keys(gRecycledQuads)) {
            if (gRecycledQuads[id].params.equals(textureParams)) {
                this._id = id;
                this._params = gRecycledQuads[id].params;
                this._texture = gRecycledQuads[id].texture;
                this._fbo = gRecycledQuads[id].fbo;
                delete gRecycledQuads[id];
                // console.log(this._id, this._params, this._texture, this._fbo);
                return;
            }
        }
        this._id = acquireNewFrame();
        this._params = textureParams;
        this._initTexture();
        this._initBuffer();
        unbind();
    }
    recycle() {
        gRecycledQuads[this.id] 
            = {params: 
                new TextureParams(
                    this._params.format, 
                    this._params.width, this._params.height,
                    this._params.generateMipmap, 
                    this._params.wrapS, this._params.wrapT,
                    this._params.minFilter, this._params.magFilter
               ), 
               texture: this._texture, fbo: this._fbo};
    }
    reset(newTexParams) {
        if (this._id !== 0) {
            gl.deleteTexture(this._texture);
            gl.deleteFramebuffer(this._fbo);
            this._params.format = newTexParams.format;
            this._params.width = newTexParams.width;
            this._params.height = newTexParams.height;
            this._params.generateMipmap = newTexParams.generateMipmap;
            this._params.wrapS = newTexParams.wrapS;
            this._params.wrapT = newTexParams.wrapT;
            this._params.minFilter = newTexParams.minFilter;
            this._params.magFilter = newTexParams.magFilter;
            gl.activeTexture(gl.TEXTURE0 + this._id);
            this._texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this._texture);
            let params = this._params;
            console.log(this._texture);
            console.log(params.format, toBase(params.format),
                        toType(params.format));
            console.log(gl.RGBA32F, gl.RGBA, gl.FLOAT);
            gl.texImage2D(gl.TEXTURE_2D, 0, params.format, 
                params.width, params.height, 0,
                toBase(params.format), toType(params.format), null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, params.wrapS);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, params.wrapT);
            gl.texParameteri(gl.TEXTURE_2D, 
                gl.TEXTURE_MIN_FILTER, params.minFilter);
            gl.texParameteri(gl.TEXTURE_2D, 
                gl.TEXTURE_MAG_FILTER, params.magFilter);
            if (params.generateMipmap) {
                gl.generateMipmap(gl.TEXTURE_2D);
            }
            this._fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                                    gl.TEXTURE_2D, this._texture, 0);
        } 

    }
    get id() {
        return this._id;
    }
    get width() {
        return this._params.width;
    }
    get height() {
        return this._params.height;
    }
    get format() {
        return this._params.format;
    }
    channelCount() {
        let base = toBase(this._params.format);
        let baseToPixelSize = {};
        baseToPixelSize[gl.RGBA] = 4;
        baseToPixelSize[gl.RGB] = 3;
        if (gl.version === 2) {
            baseToPixelSize[gl.RG] = 2;
            baseToPixelSize[gl.RED] = 1;
        }
        return baseToPixelSize[base];
    }
    static makeProgramFromPath(fragmentShaderPath) {
        console.log(`Compiling ${fragmentShaderPath}.\n`); // TODO!
    }
    static makeProgramFromSource(fragmentShaderSource) {
        let vsRef = shaderFromSource(QUAD_VERTEX_SHADER, gl.VERTEX_SHADER);
        let fsRef = shaderFromSource(fragmentShaderSource, gl.FRAGMENT_SHADER);
        let program = gl.createProgram();
        if (program === 0) {
            console.err("Unable to create program.");
        }
        gl.attachShader(program, vsRef);
        gl.attachShader(program, fsRef);
        // gl.GetProgramiv(program, gl.LINK_STATUS, &status)
        gl.linkProgram(program);
        let infoLog = gl.getProgramInfoLog(program);
        if (infoLog !== null && infoLog !== '')
            console.log(infoLog);
        gl.useProgram(program);
        return program;

    }
    static makeProgramAndGetInfoLog(fragmentShaderSource) {
        let vsRef = shaderFromSource(QUAD_VERTEX_SHADER, gl.VERTEX_SHADER);
        let fsRef
            = shaderFromSource(fragmentShaderSource, gl.FRAGMENT_SHADER);
        let program = gl.createProgram();
        if (program === 0) {
            console.err("Unable to create program.");
        }
        gl.attachShader(program, vsRef);
        gl.attachShader(program, fsRef);
        // gl.GetProgramiv(program, gl.LINK_STATUS, &status)
        gl.linkProgram(program);
        let infoLog = gl.getProgramInfoLog(program);
        if (infoLog !== null && infoLog !== '')
            console.log(infoLog);
        else
            gl.useProgram(program);
        return [program, infoLog];

    }
    _initTexture() {
        if (this._id === 0) {
            // this._texture = gl.createTexture();
            // gl.activeTexture(gl.TEXTURE0);
            // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            return;
        }
        /* console.log(
            "Number of texture units: ",
            gl.getParameter(gl.COMBINED_TEXTURE_IMAGE_UNITS),
            "Texture id: ",
            this._id
        );*/
        gl.activeTexture(gl.TEXTURE0 + this._id);
        this._texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this._texture);
        let params = this._params;
        console.log(this._texture);
        console.log(params.format, toBase(params.format), toType(params.format));
        console.log(gl.RGBA32F, gl.RGBA, gl.FLOAT);
        gl.texImage2D(gl.TEXTURE_2D, 0, params.format, 
            params.width, params.height, 0,
            toBase(params.format), toType(params.format), null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, params.wrapS);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, params.wrapT);
        gl.texParameteri(gl.TEXTURE_2D, 
            gl.TEXTURE_MIN_FILTER, params.minFilter);
        gl.texParameteri(gl.TEXTURE_2D, 
            gl.TEXTURE_MAG_FILTER, params.magFilter);
        if (params.generateMipmap) {
            gl.generateMipmap(gl.TEXTURE_2D);
        }
    }
    _initBuffer() {
        gQuadObjects.init();
        if (this._id !== 0) {
            this._fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                                    gl.TEXTURE_2D, this._texture, 0);
        } 
    }
    _bind(program) {
        gl.useProgram(program);
        // gl.BindVertexArray(s_quad_objects.vao)
        gl.bindBuffer(gl.ARRAY_BUFFER, gQuadObjects.vbo);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gQuadObjects.ebo);
        if (gQuadObjects.vao === 0) {
            let vertices = getQuadVertices();
            let elements = getQuadElements();
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elements, gl.STATIC_DRAW);
        }
        if (this._id !== 0) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
            // gl.clear(gl.COLOR_BUFFER_BIT);
        }
        let attrib = gl.getAttribLocation(program, "position");
        gl.enableVertexAttribArray(attrib);
        gl.vertexAttribPointer(attrib, 3, gl.FLOAT, false, 12, 0);
    }
    _adjust_viewport_before_drawing(config) {
        if (config === null) {
            gl.viewport(0, 0, this.width, this.height);
            return;
        }
        let keys = Object.keys(config);
        if (config !== null
            && keys.includes('width') && keys.includes('height'))
            gl.viewport(0, 0, config.width, config.height);
        else if (config !== null && keys.includes('viewport'))
            gl.viewport(config['viewport'][0], config['viewport'][1],
                        config['viewport'][2], config['viewport'][3])
    }
    draw(program, uniforms, config=null) {
        let originalViewport = gl.getParameter(gl.VIEWPORT);
        this._adjust_viewport_before_drawing(config);
        this._bind(program);
        for (let name of Object.keys(uniforms)) {
            let loc = gl.getUniformLocation(program, name);
            let val = uniforms[name];
            if (typeof(val) === 'number') {
                gl.uniform1f(loc, val);
            } else if (val instanceof IScalar) {
                gl.uniform1i(loc, val.value);
            } else if (typeof(val) === 'boolean') {
                gl.uniform1i(loc, (val === true)? 1: 0);
            } else if (val instanceof Vec4) {
                gl.uniform4f(loc, val.x, val.y, val.z, val.w);
            } else if (val instanceof Vec2) {
                gl.uniform2f(loc, val.x, val.y);
            } else if (val instanceof IVec2) {
                gl.uniform2i(loc, val.x, val.y);
            } else if (val instanceof IVec4) {
                gl.uniform4i(loc, val.x, val.y, val.z, val.w);
            } else if (val instanceof Vec3) {
                console.log(name, loc, val.x, val.y, val.z);
                gl.uniform3f(loc, val.x, val.y, val.z);
            } else if (val instanceof IVec3) {
                gl.uniform3i(loc, val.x, val.y, val.z);
            } else if (val instanceof Complex) {
                gl.uniform2f(loc, val.real, val.imag);
            } else if (val instanceof Quaternion) {
                gl.uniform4f(loc, val.i, val.j, val.k, val.real);
            } else if (val instanceof Quad) {
                gl.uniform1i(loc, val.id);
            } else if (val instanceof RenderTarget) {
                gl.uniform1i(loc, val.id);
            }
        }
        gl.drawElements(gl.TRIANGLES, 6, 
                        (gl.version === 2)? 
                        gl.UNSIGNED_INT: gl.UNSIGNED_SHORT,
                        null);
        gl.viewport(originalViewport[0], originalViewport[1],
                    originalViewport[2], originalViewport[3]);
        unbind();
    }
    substituteArray(arr) {
        let originalViewport = gl.getParameter(gl.VIEWPORT);
        gl.viewport(0, 0, this.width, this.height);
        if (self.id !== 0)
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);   
        gl.activeTexture(gl.TEXTURE0 + this.id);
        // gl.bindTexture(gl.TEXTURE_2D, this._texture);    
        gl.texSubImage2D(
            gl.TEXTURE_2D, 0, 0, 0, 
            this.width, this.height,
            toBase(this._params.format), toType(this._params.format), 
            arr);
        gl.viewport(originalViewport[0], originalViewport[1],
                    originalViewport[2], originalViewport[3]);
        unbind();
    }
    asFloat32Array() {
        if (self.id !== 0)
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
        let pixelSize = this.channelCount();
        let size = pixelSize*this.width*this.height;
        let arr = new Float32Array(size);
        gl.readPixels(
            0, 0, this.width, this.height,
            toBase(this._params.format), gl.FLOAT, arr);
        // gl.activeTexture(gl.TEXTURE0);
        // gl.bindTexture(gl.TEXTURE_2D, null);
        unbind();
        return arr;
    }

}

export const gMainRenderWindow = new Quad(
    new TextureParams(gl.RGBA, gCanvas.width, gCanvas.height, 
    gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, gl.LINEAR, gl.LINEAR));


export function withConfig(config, closure) {
    let keys = Object.keys(config);
    if (keys.includes('width') && keys.includes('height')) {
        gl.viewport(0, 0, config.width, config.height);
    } else if (keys.includes('viewport')) {
        gl.viewport(...config.viewport);
    }
    if (keys.includes('clear'))
        gl.clear(config.clear);
    if (keys.includes('depthFunc'))
        gl.depthFunc(config.depthFunc);
    if (keys.includes('enable'))
        gl.enable(config.enable);
    closure();
}

/* If n is a perfect square, return its square root,
else return those values closest to making it a square.
Although this is implemented using brute force iteration,
for the problem that this function is meant to solve
the value of n shouldn't be too large (n < 1000).
*/
function decompose(n) {
    let i = 1;
    for (; i*i < n; i++);
    for (; n % i; i--);
    return new IVec2(
        ((n / i) > i)? (n / i): i,
        ((n / i) < i)? (n / i): i
    );
}

export function get2DFrom3DDimensions(dimensions3D) {
    let width = dimensions3D.ind[0];
    let height = dimensions3D.ind[1];
    let length = dimensions3D.ind[2];
    let d = decompose(length);
    let maxTextureSize = 10000;
    let texDimensions2D = new IVec2(0.0, 0.0);
    if (d.ind[0]*width < maxTextureSize &&
        d.ind[1]*height < maxTextureSize) {
        texDimensions2D.ind[0] = width*d.ind[0];
        texDimensions2D.ind[1] = height*d.ind[1];
    } else if (d.ind[1]*width < maxTextureSize &&
               d.ind[0]*height < maxTextureSize) {
        texDimensions2D.ind[0] = width*d.ind[1];
        texDimensions2D.ind[1] = height*d.ind[0];
    } else {
        console.error(
            `3D texture dimensions ${width}, ${height}, ${length} `
             + `with possible 2D representations `
             + `${width*d.ind[0]}, ${height*d.ind[1]} `
             + `or ${width*d.ind[1]}, ${height*d.ind[0]} exceed maximum `
             + `texture size. The maximum 2D texture side length `
             + `is ${maxTextureSize}.`);
    }
    return texDimensions2D;

}

export function get2DFromWidthHeightLength(
    width, height, length
) {
    return get2DFrom3DDimensions(new IVec3(
        width, height, length
    ));
}

export function get2DFrom3DTextureCoordinates(
    uvw, texDimensions2D, dimensions3D
) {
    let width2D = texDimensions2D.ind[0];
    let height2D = texDimensions2D.ind[1];
    let width3D = dimensions3D.ind[0];
    let height3D = dimensions3D.ind[1];
    let length3D = dimensions3D.ind[2];
    let wStack = width2D/width3D;
    let xIndex = width3D*(uvw.ind[0] % 1.0);
    let yIndex = height3D*(uvw.ind[1] % 1.0);
    let zIndex = Math.floor(length3D*uvw.ind[2]) % length3D;
    let uIndex = (zIndex % wStack)*width3D + xIndex;
    let vIndex = Math.floor(zIndex / wStack)*height3D + yIndex;
    return new Vec2(uIndex/width2D, vIndex/height2D);
}

export function get3DFrom2DTextureCoordinates(
    uv, texDimensions2D, dimensions3D
) {
    let width2D = texDimensions2D.ind[0];
    let height2D = texDimensions2D.ind[1];
    let width3D = dimensions3D.ind[0];
    let height3D = dimensions3D.ind[1];
    let length3D = dimensions3D.ind[2];
    let wStack = width2D/width3D;
    let hStack = height2D/height3D;
    let u = uv.ind[0]*wStack % 1.0;
    let v = uv.ind[1]*hStack % 1.0;
    let w = (Math.floor(uv.ind[1]*hStack)*wStack
                + Math.floor(uv.ind[0]*wStack) + 0.5)/length3D;
    return new Vec3(u, v, w)
}
