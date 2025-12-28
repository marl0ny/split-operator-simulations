import {get2DFrom3DDimensions,
        IVec3, Vec3,
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


function reverseBitSortOutermostIndex3D(arr, texDimensions2D, texDimensions3D) {
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

function transposeXYInplaceCube(arr, size, indices) {
    
}

function reverseBitSort3D(arr, nx, ny, nz) {
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
    // reverseBitSortOutermostIndex3D();
    // reverseBitSortZIndex();
}