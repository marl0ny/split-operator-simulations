/* This file manages the GLSL FFT programs.

References:

Wikipedia - Cooley–Tukey FFT algorithm
https://en.wikipedia.org/wiki/Cooley%E2%80%93Tukey_FFT_algorithm

MathWorld Wolfram - Fast Fourier Transform:
http://mathworld.wolfram.com/FastFourierTransform.html 

William Press et al.
12.2 Fast Fourier Transform (FFT) - Numerical Recipes
https://websites.pmc.ucsc.edu/~fnimmo/eart290c_17/NumericalRecipesinF77.pdf

*/
import {gl, TextureParams, IScalar, Quad} from "./gl-wrappers.js";
import SHADERS, { getShader } from "./shaders.js";

let gPrograms = {
    fftIter: Quad.makeProgramFromSource(
        SHADERS['./shaders/fft/fft-iter.frag']),
    fftIterSquare: Quad.makeProgramFromSource(
        SHADERS['./shaders/fft/fft-iter-square.frag']),
    revBitSort2: 
        Quad.makeProgramFromSource(
            SHADERS['./shaders/fft/rev-bit-sort2.frag']),
    fftShift: Quad.makeProgramFromSource(
        SHADERS['./shaders/fft/fftshift.frag']),
    copy: Quad.makeProgramFromSource(
        getShader('./shaders/util/copy.frag')),
};


let gCosTable = {
    use: true,
    ind: (gl.version === 2)? 
        new Float32Array(1024): new Float32Array(4096),
    quad: null,
    length: 0,

};

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

function fftIterSquare(iterQuads, isInverse) {
    let size = iterQuads[0].width;
    refreshCosTable(size);
    for (let blockSize = 2; blockSize <= size; blockSize *= 2) {
        iterQuads[1].draw(
            gPrograms.fftIterSquare,
            {
                tex: iterQuads[0],
                blockSize: blockSize/size,
                angleSign: (isInverse)? 1.0: -1.0,
                scale: (isInverse && blockSize === size)? 1.0/size: 1.0,
                size: size,
                useCosTable: true,
                cosTableTex: gCosTable.quad,
            }
        );
        let tmp = iterQuads[0];
        iterQuads[0] = iterQuads[1];
        iterQuads[1] = tmp;
    }
    return iterQuads;
}

function fftIter(iterQuads, isVertical, isInverse) {
    let width = iterQuads[0].width, height = iterQuads[0].height;
    let size = (isVertical)? height: width;
    refreshCosTable(size);
    for (let blockSize = 2; blockSize <= size; blockSize *= 2) {
        iterQuads[1].draw(
            gPrograms.fftIter,
            {
                tex: iterQuads[0],
                isVertical: isVertical,
                blockSize: blockSize/size,
                angleSign: (isInverse)? 1.0: -1.0,
                scale: (isInverse && blockSize === size)? 1.0/size: 1.0,
                size: size,
                useCosTable: false,
                cosTableTex: gCosTable.quad,
            }
        );
        let tmp = iterQuads[0];
        iterQuads[0] = iterQuads[1];
        iterQuads[1] = tmp;
    }
    return iterQuads;
}

function revBitSort2(dst, src) {
    // console.log('Reverse bit sorting array elements');
    let width = new IScalar(dst.width); 
    let height = new IScalar(dst.height);
    dst.draw(gPrograms.revBitSort2, {tex: src, width: width, height: height});
    // console.log('Finished reverse bit sorting the array.');
}

let gIterQuads = [];
function refreshIterQuads(format, width, height) {
    if (gIterQuads.length === 0 
        || gIterQuads[0].format !== format
        || gIterQuads[0].width !== width 
        || gIterQuads[0].height !== height) {
        // console.log('Refreshing fft iteration quads...')
        let texParams = new TextureParams(
            format, 
            width, height, true, 
            gl.REPEAT, gl.REPEAT, gl.LINEAR, gl.LINEAR);
        // let texParams = new TextureParams(
        //     gl.RGBA32F, width, height, false, 
        //     gl.REPEAT, gl.REPEAT, gl.NEAREST, gl.NEAREST);
        if (gIterQuads.length !== 0) {
            gIterQuads[0].recycle();
            gIterQuads[1].recycle();
        }
        gIterQuads = [new Quad(texParams), new Quad(texParams)];
        // console.log('Finished refreshing fft iteration quads.');
    }
}

export function fft2D(dst, src) {
    // console.log('fft2D...');
    refreshIterQuads(src.format, src.width, src.height);
    let iterQuads1 = [gIterQuads[0], gIterQuads[1]];
    revBitSort2(iterQuads1[0], src);
    if (src.width === src.height) {
        // console.log('Using square fft.');
        let iterQuads2 = fftIterSquare(iterQuads1, false);
        dst.draw(gPrograms.copy, {tex: iterQuads2[0]});
        return;
    }
    let iterQuads2 = fftIter(iterQuads1, false, false);
    let iterQuads3 = fftIter(iterQuads2, true , false);
    dst.draw(gPrograms.copy, {tex: iterQuads3[0]});
    // console.log('finished fft2d');
}

export function ifft2D(dst, src) {
    refreshIterQuads(src.format, src.width, src.height);
    let iterQuads1 = [gIterQuads[0], gIterQuads[1]];
    revBitSort2(iterQuads1[0], src);
    if (src.width === src.height) {
        let iterQuads2 = fftIterSquare(iterQuads1, true);
        dst.draw(gPrograms.copy, {tex: iterQuads2[0]});
        return;
    }
    let iterQuads2 = fftIter(iterQuads1, false, true);
    let iterQuads3 = fftIter(iterQuads2, true , true);
    dst.draw(gPrograms.copy, {tex: iterQuads3[0]});
}

export function fftShift(dst, src) {
    dst.draw(gPrograms.fftShift, {tex: src});
}
