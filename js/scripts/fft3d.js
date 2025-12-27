/* This script manages the 3D GLSL FFT programs.

References:

Wikipedia - Cooley–Tukey FFT algorithm
https://en.wikipedia.org/wiki/Cooley%E2%80%93Tukey_FFT_algorithm

MathWorld Wolfram - Fast Fourier Transform:
http://mathworld.wolfram.com/FastFourierTransform.html 

William Press et al.
12.2 Fast Fourier Transform (FFT) - Numerical Recipes
https://websites.pmc.ucsc.edu/~fnimmo/eart290c_17/NumericalRecipesinF77.pdf

*/
import {gl, TextureParams, 
        IScalar, MultidimensionalDataQuad, Quad,
        get2DFrom3DDimensions,
        DEFAULT_MIN_FILTER, DEFAULT_MAG_FILTER,
        isOnAndroid, IVec3, Vec3,
        get2DFrom3DTextureCoordinates} from "./gl-wrappers.js";
import SHADERS, { getShader } from "./shaders.js";

let gPrograms = {
    fftIter: 
        MultidimensionalDataQuad.makeProgramFromSource(
            SHADERS['./shaders/fft/fft-iter3d.frag']),
    fftIterCube:
        MultidimensionalDataQuad.makeProgramFromSource(
            SHADERS['./shaders/fft/fft-iter-cube.frag']
        ),
    revBitSort2: 
        MultidimensionalDataQuad.makeProgramFromSource(
            SHADERS['./shaders/fft/rev-bit-sort2-3d.frag']),
    fftShift: 
        MultidimensionalDataQuad.makeProgramFromSource(
            SHADERS['./shaders/fft/fftshift3d.frag']),
    copy: 
        MultidimensionalDataQuad.makeProgramFromSource(
        getShader('./shaders/util/copy.frag')),
};


let gCosTable = {
    use: true,
    ind: (gl.version === 2)? 
        new Float32Array(1024): new Float32Array(4096),
    quad: null,
    length: 0,

};


class ComplexArray3D {
    _data;
    _nx;
    _ny;
    _nz;
    _dimensions2D;
    _dimensions3D;
    constructor(data, nx, ny, nz) {
        this._dimensions3D = new IVec3(nx, ny, nz);
        this._dimensions2D = get2DFrom3DDimensions(new IVec3(nx, ny, nz));
        this._nz = nz;
        this._ny = ny;
        this._nx = nx;
        this._data = data;
    }
    at(i, j, k) {
        return [
            this._data[2*(i*this._ny*this._nx + j*this._nx + k)],
            this._data[2*(i*this._ny*this._nx + j*this._nx + k) + 1],
        ];
    }
    set(i, j, k, reVal, imVal) {
        this._data[2*(i*this._ny*this._nx + j*this._nx + k)] = reVal;
        this._data[2*(i*this._ny*this._nx + j*this._nx + k) + 1] = imVal;
    }
    getRawArray() {
        return this._data;
    }
}

function swapOutermostBlock(arr, i, j, texDimensions2D, texDimensions3D) {
    let uvwIndexI = new Vec3((i + 0.5)/nz, 0.0, 0.0);
    let uvIndexI = get2DFrom3DTextureCoordinates(uvwIndexI);
    let xyIndexI = new Vec2(
        uvIndexI.ind[0]*texDimensions2D.ind[0],
        uvIndexI.ind[1]*texDimensions2D.ind[1]);
    let uvwIndexJ = new Vec3((j + 0.5)/nz, 0.0, 0.0);
    let uvIndexJ = get2DFrom3DTextureCoordinates(uvwIndexJ);
    let xyIndexJ = new Vec2(
        uvIndexJ.ind[0]*texDimensions2D.ind[0],
        uvIndexJ.ind[1]*texDimensions2D.ind[1]);
    for (let ind_x = 0; ind_x < texDimensions3D.ind[0]; ind_x++) {
        for (let ind_y = 0; ind_y < texDimensions3D.ind[1]; ind_y++) {
            let ind_i = xyIndexI.ind[1]*texDimensions2D[0] + xyIndexI.ind[0]
                + ind_x + ind_y;
            let ind_j = xyIndexJ.ind[1]*texDimensions2D[0] + xyIndexJ.ind[0];
        }
    }
}

function reverseBitSortOutermostIndex(arr, texDimensions2D, texDimensions3D) {
    let n = texDimensions3D.ind[2];
    for (let i = 0; i < n; i++) {
        let u = 1;
        let d = n >> 1;
        let rev = 0;
        while (u < n) {
            rev += d*((i&u)/u);
            u <<= 1;
            d >>= 1;
        }
        if (rev >= i) {
            swapOutermostBlock(arr, i, rev, texDimensions2D, texDimensions3D);
            let uvwIndex = new Vec3((i + 0.5)/nz, 0.0, 0.0);
            let uvIndex = get2DFrom3DTextureCoordinates(uvwIndex);
            let xyIndex = new Vec2(
                uvIndex.ind[0]*texDimensions2D.ind[0],
                uvIndex.ind[1]*texDimensions2D.ind[1]
            );
            for (let i = 0; i < texDimensions3D.ind[1]; i++) {
                for (let j = 0; j < texDimensions3D.ind[2]; j++) {

                }
            }
            let tmpRe = arr[2*(i + startOffset)];
            let tmpIm = arr[2*(i + startOffset) + 1];
            arr[2*(i + startOffset)] = arr[2*(rev + startOffset)];
            arr[2*(i + startOffset) + 1] = arr[2*(rev + startOffset) + 1];
            arr[2*(rev + startOffset)] = tmpRe;
            arr[2*(rev + startOffset) + 1] = tmpIm;
        }

    }
}

function reverseBitSortInnermostIndex(arr, startOffset, n) {
    for (let i = 0; i < n; i++) {
        let u = 1;
        let d = n >> 1;
        let rev = 0;
        while (u < n) {
            rev += d*((i&u)/u);
            u <<= 1;
            d >>= 1;
        }
        if (rev >= i) {
            let tmpRe = arr[2*(i + startOffset)];
            let tmpIm = arr[2*(i + startOffset) + 1];
            arr[2*(i + startOffset)] = arr[2*(rev + startOffset)];
            arr[2*(i + startOffset) + 1] = arr[2*(rev + startOffset) + 1];
            arr[2*(rev + startOffset)] = tmpRe;
            arr[2*(rev + startOffset) + 1] = tmpIm;
        }

    }
}

function reverseBitSort3(arr, nx, ny, nz) {
    let texDimensions3D = new IVec3(nx, ny, nz);
    let texDimensions2D = get2DFrom3DDimensions(texDimensions3D);
    for (let i = 0; i < nz; i++) {
        // reverseBitSortYIndex();
        for (let j = 0; j < ny; j++) {
            let uvwIndex = new Vec3((i + 0.5)/nz, (j + 0.5)/ny, 0.0);
            let uvIndex = get2DFrom3DTextureCoordinates(
                uvwIndex, texDimensions2D, texDimensions3D
            );
            let xyIndex = new Vec2(
                uvIndex.ind[0]*texDimensions2D.ind[0],
                uvIndex.ind[1]*texDimensions2D.ind[1]
            );
            let startOffset 
                = xyIndex.ind[0] + xyIndex.ind[1]*texDimensions2D.ind[0];
            reverseBitSortInnermostIndex(arr, startOffset, nx);
        }
    }
    reverseBitSortOutermostIndex();
    // reverseBitSortZIndex();
}

function refreshCosTable(n) {
    if (n != gCosTable.length && n/2 <= 1024) {
        // console.log('Refreshing cos table...');
        gCosTable.length = n;
        if (gl.version === 2) {
            gCosTable.ind[0] = 1.0;
            gCosTable.ind[Math.floor(n/8)] = 1.0/Math.sqrt(2.0);
            gCosTable.ind[Math.floor(n/4)] = 0.0;
            gCosTable.ind[Math.floor((3*n)/8)] = -1.0/Math.sqrt(2.0);
        } else {
            for (let j = 0; j < 4; j++) {
                gCosTable.ind[j] = 1.0;
                gCosTable.ind[4*Math.floor(n/8) + j] = 1.0/Math.sqrt(2.0);
                gCosTable.ind[4*Math.floor(n/4) + j] = 0.0;
                gCosTable.ind[4*Math.floor((3*n)/8) + j] 
                    = -1.0/Math.sqrt(2.0);
            }
        }
        for (let i = 1; i < n/8; i++) {
            let c = Math.cos(i*2.0*Math.PI/n);
            let s = Math.sin(i*2.0*Math.PI/n);
            if (gl.version === 2) {
                gCosTable.ind[i] = c;
                gCosTable.ind[n/4 - i] = s;
                gCosTable.ind[n/4 + i] = -s;
                gCosTable.ind[n/2 - i] = -c;
            } else {
                for (let j = 0; j < 4; j++) {
                    gCosTable.ind[4*i + j] = c;
                    gCosTable.ind[4*(n/4 - i) + j] = s;
                    gCosTable.ind[4*(n/4 + i) + j] = -s;
                    gCosTable.ind[4*(n/2 - i) + j] = -c;
                }
            }
        }
        let textureParams = (gl.version === 2)? 
        new TextureParams(
            gl.R32F, n/2, 1, false,
            gl.REPEAT, gl.REPEAT,
            gl.NEAREST, gl.NEAREST
        ) :
        new TextureParams(
            gl.RGBA32F, n/2, 1, false,
            gl.REPEAT, gl.REPEAT,
            gl.NEAREST, gl.NEAREST
        ); 
        if (gCosTable.quad !== null)
            gCosTable.quad.reset(textureParams);
        else
            gCosTable.quad = new Quad(textureParams);
        gCosTable.quad.substituteArray(gCosTable.ind);
        // console.log('Finished refreshing cos table.');
    }
}

function fftIterCube(iterQuads, isInverse) {
    let texDimensions2D = iterQuads[1].textureDimensions;
    let texDimensions3D = iterQuads[1].dimensions3D;
    let size = texDimensions3D.ind[0];
    refreshCosTable(size);
    for (let blockSize = 2; blockSize <= size; blockSize *= 2) {
        iterQuads[1].draw(
            gPrograms.fftIterCube,
            {
                tex: iterQuads[0],
                blockSize: blockSize/size,
                angleSign: (isInverse)? 1.0: -1.0,
                scale: (isInverse && blockSize === size)? 1.0/size: 1.0,
                size: size,
                useCosTable: true,
                cosTableTex: gCosTable.quad,
                texelDimensions2D: texDimensions2D,
                texelDimensions3D: texDimensions3D
            }
        );
        let tmp = iterQuads[0];
        iterQuads[0] = iterQuads[1];
        iterQuads[1] = tmp;
    }
    return iterQuads;
}


function fftIter(iterQuads, orientation, isInverse) {
    let texDimensions2D = iterQuads[1].textureDimensions;
    let texDimensions3D = iterQuads[1].dimensions3D;
    let size = texDimensions3D.ind[orientation];
    refreshCosTable(size);
    for (let blockSize = 2; blockSize <= size; blockSize *= 2) {
        iterQuads[1].draw(
            gPrograms.fftIter,
            {
                tex: iterQuads[0],
                orientation: new IScalar(orientation),
                blockSize: blockSize/size,
                angleSign: (isInverse)? 1.0: -1.0,
                scale: (isInverse && blockSize === size)? 1.0/size: 1.0,
                size: size,
                useCosTable: true,
                cosTableTex: gCosTable.quad,
                texelDimensions2D: texDimensions2D,
                texelDimensions3D: texDimensions3D,
            }
        );
        let tmp = iterQuads[0];
        iterQuads[0] = iterQuads[1];
        iterQuads[1] = tmp;
    }
    return iterQuads;
}

function revBitSort2(dst, src) {
    dst.draw(gPrograms.revBitSort2,
        {tex: src,
         texelDimensions2D: dst.textureDimensions,
         texelDimensions3D: dst.dimensions3D});
}

let gIterQuads = [];
function refreshIterQuads(format, texDimensions3D) {
    if (gIterQuads.length === 0 || 
        !gIterQuads[0].dimensions3D.ind.every(
            (e, i) => texDimensions3D.ind[i] === e)
        ) {
        // console.log('refreshing iteration quads.');
        let dimensions2D = get2DFrom3DDimensions(texDimensions3D);
        let texParams = new TextureParams(
            format, 
            dimensions2D.ind[0], dimensions2D.ind[1], true, 
            gl.REPEAT, gl.REPEAT, DEFAULT_MIN_FILTER, DEFAULT_MAG_FILTER);
        if (gIterQuads.length !== 0) {
            // console.log('Resetting dimensions of fft iteration quads');
            gIterQuads[0].reset([...texDimensions3D.ind], texParams);
            gIterQuads[1].reset([...texDimensions3D.ind], texParams);
            return;
        }
        gIterQuads = [
            new MultidimensionalDataQuad(
                [...texDimensions3D.ind], texParams),
            new MultidimensionalDataQuad(
                [...texDimensions3D.ind], texParams)
        ];

    }
}

export function fft3D(dst, src) {
    refreshIterQuads(src.format, src.dimensions3D);
    let iterQuads1 = [gIterQuads[0], gIterQuads[1]];
    revBitSort2(iterQuads1[0], src);
    if (src.dimensions3D.ind[0] === src.dimensions3D.ind[1]
        && src.dimensions3D.ind[1] === src.dimensions3D.ind[2]) {
        // console.log('Using fft cube.');
        let iterQuads2 = fftIterCube(iterQuads1, false);
        dst.draw(gPrograms.copy, {tex: iterQuads2[0]});
        return;
    }
    let iterQuads2 = fftIter(iterQuads1, 0, false);
    let iterQuads3 = fftIter(iterQuads2, 1, false);
    let iterQuads4 = fftIter(iterQuads3, 2, false);
    dst.draw(gPrograms.copy, {tex: iterQuads4[0]});
}

export function ifft3D(dst, src) {
    refreshIterQuads(src.format, src.dimensions3D);
    let iterQuads1 = [gIterQuads[0], gIterQuads[1]];
    revBitSort2(iterQuads1[0], src);
    if (src.dimensions3D.ind[0] === src.dimensions3D.ind[1]
        && src.dimensions3D.ind[1] === src.dimensions3D.ind[2]) {
        let iterQuads2 = fftIterCube(iterQuads1, true);
        dst.draw(gPrograms.copy, {tex: iterQuads2[0]});
        return;
    }
    let iterQuads2 = fftIter(iterQuads1, 0, true);
    let iterQuads3 = fftIter(iterQuads2, 1, true);
    let iterQuads4 = fftIter(iterQuads3, 2, true);
    dst.draw(gPrograms.copy, {tex: iterQuads4[0]});
}

export function fftShift3D(dst, src) {
    dst.draw(gPrograms.fftShift, 
        {
            tex: src,
            texelDimensions2D: dst.textureDimensions,
            texelDimensions3D: dst.dimensions3D

        });
}
