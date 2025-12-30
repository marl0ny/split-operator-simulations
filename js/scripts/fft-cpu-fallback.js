import {get2DFrom3DDimensions, IVec3, Vec2, Vec3,
        get2DFrom3DTextureCoordinates} from "./gl-wrappers.js";


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

function complexTranspose(arr, w, h) {
    let arr2 = new Float32Array(2*w*h);
    let w2 = h;
    for (let i = 0; i < h; i++) {
        for (let j = 0; j < w; j++) {
            arr2[2*(j*w2 + i)] = arr[2*(i*w + j)];
            arr2[2*(j*w2 + i) + 1] = arr[2*(i*w + j) + 1];
        }
    }
    return arr2;
}

function writeComplexTranspose(dst, src, srcW, srcH) {
    let dstW = srcH;
    for (let i = 0; i < srcH; i++) {
        for (let j = 0; j < srcW; j++) {
            dst[2*(j*dstW + i)] = src[2*(i*srcW + j)];
            dst[2*(j*dstW + i) + 1] = src[2*(i*srcW + j) + 1];
        }
    }
}

function squareComplexTransposeInPlace(arr, size) {
    for (let i = 0; i < size; i++) {
        for (let j = i + 1; j < size; j++) {
            let tmpRe = arr[2*(j*size + i)];
            let tmpIm = arr[2*(j*size + i) + 1];
            arr[2*(j*size + i)] = arr[2*(i*size + j)];
            arr[2*(j*size + i) + 1] = arr[2*(i*size + j) + 1];
            arr[2*(i*size + j)] = tmpRe;
            arr[2*(i*size + j) + 1] = tmpIm;
        }
    }
}

export function reverseBitSortSquareCPU(arr, size) {
    for (let i = 0; i < size*size; i += size)
        reverseBitSortInnermostIndex(arr, i, size);
    squareComplexTransposeInPlace(arr, size);
    for (let i = 0; i < size*size; i += size)
        reverseBitSortInnermostIndex(arr, i, size);
    squareComplexTransposeInPlace(arr, size);
}

export function reverseBitSort2DDomainCPU(arr, w, h) {
    for (let i = 0; i < w*h; i += w)
        reverseBitSortInnermostIndex(arr, i, w);
    let arrT = complexTranspose(arr, w, h);
    let wT = h, hT = w;
    for (let i = 0; i < wT*hT; i += wT)
        reverseBitSortInnermostIndex(arrT, i, wT);
    writeComplexTranspose(arr, arrT, wT, hT);
}


function radix2FFT1D(arr, startOffset, n, isInverse) {
    reverseBitSortInnermostIndex(arr, startOffset, n);
    for (let blockSize = 2; blockSize <= n; blockSize *= 2) {
        for (let j = 0; j < n; j += blockSize) {
            for (let i = 0; i < blockSize/2; i++) {
                let sgn = (isInverse)? 1.0: -1.0;
                let reEven = arr[2*(j + i + startOffset)];
                let imEven = arr[2*(j + i + startOffset) + 1];
                let reOdd = arr[2*(j + i + blockSize/2 + startOffset)];
                let imOdd = arr[2*(j + i + blockSize/2 + startOffset) + 1];
                let c = Math.cos(sgn*2.0*Math.PI*i/blockSize);
                let s = Math.sin(sgn*2.0*Math.PI*i/blockSize);
                let scale = (isInverse && blockSize == n)? 1.0/n: 1.0;
                arr[2*(i + j + startOffset)] 
                    = scale*(reEven + c*reOdd - s*imOdd);
                arr[2*(i + j + startOffset) + 1] 
                    = scale*(imEven + c*imOdd + s*reOdd);
                arr[2*(i + j + blockSize/2 + startOffset)] 
                    = scale*(reEven - (c*reOdd - s*imOdd));
                arr[2*(i + j + blockSize/2 + startOffset) + 1] 
                    = scale*(imEven - (c*imOdd + s*reOdd));
            }
        }
    }
}

export function radix2FFTSquareCPU(arr, size, isInverse) {
    for (let i = 0; i < size*size; i += size)
        radix2FFT1D(arr, i, size, isInverse);
    squareComplexTransposeInPlace(arr, size);
    for (let i = 0; i < size*size; i += size)
        radix2FFT1D(arr, i, size, isInverse);
    squareComplexTransposeInPlace(arr, size);
}

export function radix2FFT2DDomainCPU(arr, w, h, isInverse) {
    for (let i = 0; i < w*h; i += w)
        radix2FFT1D(arr, i, w, isInverse);
    let arrT = complexTranspose(arr, w, h);
    let wT = h, hT = w;
    for (let i = 0; i < wT*hT; i += wT)
        radix2FFT1D(arrT, i, wT, isInverse);
    writeComplexTranspose(arr, arrT, wT, hT);
}

function cubeComplexTransposeTwoIndicesInPlace(
    arr, size, texDimensions2D, texDimensions3D,
    transposeIndex1, transposeIndex2) {
    let fixedIndex = [0, 1, 2].filter(
        e => [transposeIndex1, transposeIndex2].every(e2 => e2 !== e))[0];
    // console.log('Transposed indices: ', transposeIndex1, transposeIndex2);
    // console.log('Fixed index: ', fixedIndex);
    let uvwIndex1 = new Vec3(0.0, 0.0, 0.0);
    let uvwIndex2 = new Vec3(0.0, 0.0, 0.0);
    let width2D = texDimensions2D.ind[0], height2D = texDimensions2D.ind[1];
    for (let k = 0; k < size; k++) {
        for (let i = 0; i < size; i++) {
            for (let j = i + 1; j < size; j++) {
                uvwIndex1.ind[transposeIndex1] = (i + 0.5)/size;
                uvwIndex1.ind[transposeIndex2] = (j + 0.5)/size;
                uvwIndex1.ind[fixedIndex] = (k + 0.5)/size;
                uvwIndex2.ind[transposeIndex1] = (j + 0.5)/size;
                uvwIndex2.ind[transposeIndex2] = (i + 0.5)/size;
                uvwIndex2.ind[fixedIndex] = (k + 0.5)/size;
                // console.log(k, i, j);
                // console.log(uvwIndex1.x, uvwIndex1.y, uvwIndex1.z);
                // console.log(uvwIndex2.x, uvwIndex2.y, uvwIndex2.z);
                let uvIndex1 = get2DFrom3DTextureCoordinates(
                    uvwIndex1, texDimensions2D, texDimensions3D
                );
                let uvIndex2 = get2DFrom3DTextureCoordinates(
                    uvwIndex2, texDimensions2D, texDimensions3D
                );
                let xyInd1 = new Vec2(
                    uvIndex1.ind[0]*width2D - 0.5,
                    uvIndex1.ind[1]*height2D - 0.5
                );
                let xyInd2 = new Vec2(
                    uvIndex2.ind[0]*width2D - 0.5,
                    uvIndex2.ind[1]*height2D - 0.5
                );
                // console.log(xyInd1.x, xyInd1.y);
                // console.log(xyInd2.x, xyInd2.y);
                let tmpRe = arr[2*(xyInd1.ind[1]*width2D + xyInd1.ind[0])];
                let tmpIm 
                    = arr[2*(xyInd1.ind[1]*width2D + xyInd1.ind[0]) + 1];
                arr[2*(xyInd1.ind[1]*width2D + xyInd1.ind[0])]
                    = arr[2*(xyInd2.ind[1]*width2D + xyInd2.ind[0])];
                arr[2*(xyInd1.ind[1]*width2D + xyInd1.ind[0]) + 1]
                    = arr[2*(xyInd2.ind[1]*width2D + xyInd2.ind[0]) + 1];
                arr[2*(xyInd2.ind[1]*width2D + xyInd2.ind[0])] = tmpRe;
                arr[2*(xyInd2.ind[1]*width2D + xyInd2.ind[0]) + 1] = tmpIm;
            }
        }
    }
}

/* function complexTransposeTwoIndicesInPlace(
    arr, size, texDimensions2D, texDimensions3D,
    transposeIndex1, transposeIndex2) {
    let arr2 = new Float32Array(
        2*texDimensions2D.ind[0]*texDimensions2D.ind[1]);
    let fixedIndex = [0, 1, 2].filter(
        e => [transposeIndex1, transposeIndex2].every(e2 => e2 !== e))[0];
    // console.log('Transposed indices: ', transposeIndex1, transposeIndex2);
    // console.log('Fixed index: ', fixedIndex);
    let uvwIndex1 = new Vec3(0.0, 0.0, 0.0);
    let uvwIndex2 = new Vec3(0.0, 0.0, 0.0);
    let width2D = texDimensions2D.ind[0], height2D = texDimensions2D.ind[1];
    let tD1 = texDimensions3D[transposeIndex1];
    let tD2 = texDimensions3D[transposeIndex2];
    let fD = texDimensions3D[fixedIndex];
    for (let k = 0; k < fD; k++) {
        for (let i = 0; i < tD1; i++) {
            for (let j = 0; j < tD2; j++) {
                uvwIndex1.ind[transposeIndex1] = (i + 0.5)/tD1;
                uvwIndex1.ind[transposeIndex2] = (j + 0.5)/tD2;
                uvwIndex1.ind[fixedIndex] = (k + 0.5)/fD;
                uvwIndex2.ind[transposeIndex1] = (j + 0.5)/tD2;
                uvwIndex2.ind[transposeIndex2] = (i + 0.5)/tD1;
                uvwIndex2.ind[fixedIndex] = (k + 0.5)/fD;
                // console.log(k, i, j);
                // console.log(uvwIndex1.x, uvwIndex1.y, uvwIndex1.z);
                // console.log(uvwIndex2.x, uvwIndex2.y, uvwIndex2.z);
                let uvIndex1 = get2DFrom3DTextureCoordinates(
                    uvwIndex1, texDimensions2D, texDimensions3D
                );
                let uvIndex2 = get2DFrom3DTextureCoordinates(
                    uvwIndex2, texDimensions2D, texDimensions3D
                );
                let xyInd1 = new Vec2(
                    uvIndex1.ind[0]*width2D - 0.5,
                    uvIndex1.ind[1]*height2D - 0.5
                );
                let xyInd2 = new Vec2(
                    uvIndex2.ind[0]*width2D - 0.5,
                    uvIndex2.ind[1]*height2D - 0.5
                );
                // console.log(xyInd1.x, xyInd1.y);
                // console.log(xyInd2.x, xyInd2.y);
                let tmpRe = arr[2*(xyInd1.ind[1]*width2D + xyInd1.ind[0])];
                let tmpIm 
                    = arr[2*(xyInd1.ind[1]*width2D + xyInd1.ind[0]) + 1];
                arr[2*(xyInd1.ind[1]*width2D + xyInd1.ind[0])]
                    = arr[2*(xyInd2.ind[1]*width2D + xyInd2.ind[0])];
                arr[2*(xyInd1.ind[1]*width2D + xyInd1.ind[0]) + 1]
                    = arr[2*(xyInd2.ind[1]*width2D + xyInd2.ind[0]) + 1];
                arr[2*(xyInd2.ind[1]*width2D + xyInd2.ind[0])] = tmpRe;
                arr[2*(xyInd2.ind[1]*width2D + xyInd2.ind[0]) + 1] = tmpIm;
            }
        }
    }
} */

export function reverseBitSortCubeCPU(arr, size) {
    let d3D = new IVec3(size, size, size);
    let d2D = get2DFrom3DDimensions(d3D);
    for (let i = 0; i < size*size*size; i += size)
        reverseBitSortInnermostIndex(arr, i, size);
    cubeComplexTransposeTwoIndicesInPlace(arr, size, d2D, d3D, 0, 1);
    // 1, 0, 2
    for (let i = 0; i < size*size*size; i += size)
        reverseBitSortInnermostIndex(arr, i, size);
    cubeComplexTransposeTwoIndicesInPlace(arr, size, d2D, d3D, 0, 2);
    // 2, 0, 1
    for (let i = 0; i < size*size*size; i += size)
        reverseBitSortInnermostIndex(arr, i, size);
    cubeComplexTransposeTwoIndicesInPlace(arr, size, d2D, d3D, 0, 2);
    // 1, 0, 2
    cubeComplexTransposeTwoIndicesInPlace(arr, size, d2D, d3D, 0, 1);
}

export function radix2FFTCubeCPU(arr, size, isInverse) {
    let d3D = new IVec3(size, size, size);
    let d2D = get2DFrom3DDimensions(d3D);
    for (let i = 0; i < size*size*size; i += size)
        radix2FFT1D(arr, i, size, isInverse);
    cubeComplexTransposeTwoIndicesInPlace(arr, size, d2D, d3D, 0, 1);
    // 1, 0, 2
    for (let i = 0; i < size*size*size; i += size)
        radix2FFT1D(arr, i, size, isInverse);
    cubeComplexTransposeTwoIndicesInPlace(arr, size, d2D, d3D, 0, 2);
    // 2, 0, 1
    for (let i = 0; i < size*size*size; i += size)
        radix2FFT1D(arr, i, size, isInverse);
    cubeComplexTransposeTwoIndicesInPlace(arr, size, d2D, d3D, 0, 2);
    // 1, 0, 2
    cubeComplexTransposeTwoIndicesInPlace(arr, size, d2D, d3D, 0, 1);
}