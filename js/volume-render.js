/* Script for managing the volume render.

The volume render works by first sampling the 3D volume data along separate
translucent planar slices which are stacked parallel and equal distance
to each other, then rendering each slice in order from back to front.
With enough slices the illusion of presenting a 3D object is maintained.
Wikipedia page explaining this process:

Volume ray casting - Wikipedia
https://en.wikipedia.org/wiki/Volume_ray_casting

*/
import { gl, IVec2, IVec3, Vec3, Vec4, Attribute, Quad, TrianglesFrame,
    RenderTarget, Quaternion, TextureParams,
    makeProgramFromSources, 
    get2DFrom3DTextureCoordinates,
    get2DFrom3DDimensions,
    IScalar, MultidimensionalDataQuad, LinesFrame,
    get3DFrom2DTextureCoordinates, withConfig} from "./gl-wrappers.js";
import { getShader } from "./shaders.js"

function getCubeOutlineVerticesAndElements() {
    let vertices = new Float32Array([
        -1.0, -1.0, -1.0, // 0 - bottom left
        1.0, -1.0, -1.0, // 1 - bottom right
        1.0, 1.0, -1.0, // 2 - upper right
        -1.0, 1.0, -1.0, // 3 - upper left
        -1.0, -1.0, 1.0, // 4
        1.0, -1.0, 1.0, // 5
        1.0, 1.0, 1.0, // 6
        -1.0, 1.0, 1.0, // 7
    ]);
    let elements = [0, 1, 1, 2, 2, 3, 3, 0,
                    0, 4, 3, 7, 2, 6, 1, 5,
                    4, 5, 5, 6, 6, 7, 7, 4];
    return [vertices, 
            (gl.version === 2)?
            new Int32Array(elements): new Uint16Array(elements)];


}

function getVolumeRenderVerticesAndElements(
    volumeTexelDimensions2D, volumeTexelDimensions3D) {
    let width = volumeTexelDimensions3D.ind[0];
    let height = volumeTexelDimensions3D.ind[1];
    let length = volumeTexelDimensions3D.ind[2];
    let elementSize = 4;
    let vertices = new Float32Array(2*elementSize*length);
    let elements = [];
    for (let i = 0; i < length; i++) {
        let j = length - i - 1;
        // uvw denotes the 3D texture coordinate
        let uvwBottomLeft = new Vec3(
            0.5/width, 0.5/height, (i + 0.5)/length
        );
        let uvwBottomRight = new Vec3(
            (width - 0.5)/width, 0.5/height, (i + 0.5)/length
        );
        let uvwUpperRight = new Vec3(
            (width - 0.5)/width, (height - 0.5)/height, (i + 0.5)/length
        );
        let uvwUpperLeft = new Vec3(
            0.5/width, (height - 0.5)/height, (i + 0.5)/length
        );
        let uvBottomLeft = get2DFrom3DTextureCoordinates(
            uvwBottomLeft, volumeTexelDimensions2D, volumeTexelDimensions3D);
        let uvBottomRight = get2DFrom3DTextureCoordinates(
            uvwBottomRight, volumeTexelDimensions2D, volumeTexelDimensions3D);
        let uvUpperRight = get2DFrom3DTextureCoordinates(
            uvwUpperRight, volumeTexelDimensions2D, volumeTexelDimensions3D);
        let uvUpperLeft = get2DFrom3DTextureCoordinates(
            uvwUpperLeft, volumeTexelDimensions2D, volumeTexelDimensions3D);
        const X = 0, Y = 1;
        vertices[2*(elementSize*j) + X] = uvBottomLeft.x;
        vertices[2*(elementSize*j) + Y] = uvBottomLeft.y;
        vertices[2*(elementSize*j + 1) + X] = uvBottomRight.x;
        vertices[2*(elementSize*j + 1) + Y] = uvBottomRight.y;
        vertices[2*(elementSize*j + 2) + X] = uvUpperRight.x;
        vertices[2*(elementSize*j + 2) + Y] = uvUpperRight.y;
        vertices[2*(elementSize*j + 3) + X] = uvUpperLeft.x;
        vertices[2*(elementSize*j + 3) + Y] = uvUpperLeft.y;
        elements.push(elementSize*j); // bottom left
        elements.push(elementSize*j + 1); // bottom right
        elements.push(elementSize*j + 2); // upper right
        elements.push(elementSize*j + 2); // upper right
        elements.push(elementSize*j + 3); // upper left
        elements.push(elementSize*j); // bottom left
    }
    return [vertices, 
            (gl.version === 2)?
            new Int32Array(elements): new Uint16Array(elements)];
}

class Programs {
    gradient;
    sampleData;
    showVolume;
    sampleDataShowVolume;
    cubeOutline;
    zeroBoundaries;
    constructor() {
        this.copy = Quad.makeProgramFromSource(
            getShader("./shaders/util/copy.frag")
        );
        this.sampleData = Quad.makeProgramFromSource(
            getShader("./shaders/vol-render/sample.frag")
        );
        this.gradient = Quad.makeProgramFromSource(
            getShader("./shaders/gradient/gradient3d.frag")
        );
        this.showVolume = makeProgramFromSources(
            getShader("./shaders/vol-render/display.vert"),
            getShader("./shaders/vol-render/display.frag")
        );
        this.sampleDataShowVolume = makeProgramFromSources(
            getShader("./shaders/vol-render/display.vert"),
            getShader("./shaders/vol-render/sample-display.frag")
        );
        this.cubeOutline = makeProgramFromSources(
            getShader("./shaders/vol-render/cube-outline.vert"),
            getShader("./shaders/util/uniform-color.frag"),
        );
        this.zeroBoundaries
            = Quad.makeProgramFromSource(
                getShader("./shaders/util/zero-boundaries-3d.frag")
            );
    }
}


class Frames {
    data;
    gradientData;
    dataHalfPrecision;
    gradientDataHalfPrecision;
    volume;
    volumeGrad;
    view;
    constructor() {
        this.data = null;
        this.gradientData = null;
        this.dataHalfPrecision = null;
        this.gradientDataHalfPrecision = null;
        this.volume = null;
        this.volumeGrad = null;
        this.view = null;
    }
    createVolumeFrames(volumeTexelDimensions2D) {
        if (this.volume !== null &&
            this.volume.width === volumeTexelDimensions2D.ind[0] &&
            this.volume.height === volumeTexelDimensions2D.ind[1]) {
            return;
        }
        const TEX_PARAMS_VOLUME_F16 = new TextureParams(
            gl.RGBA16F,
            volumeTexelDimensions2D.ind[0],
            volumeTexelDimensions2D.ind[1],
            true,
            gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE,
            gl.LINEAR, gl.LINEAR
        );
        const TEX_PARAMS_VOLUME_U8 = new TextureParams(
            gl.RGBA8,
            volumeTexelDimensions2D.ind[0],
            volumeTexelDimensions2D.ind[1],
            true,
            gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE,
            gl.LINEAR, gl.LINEAR
        );
        const TEX_PARAMS_VOLUME_F32 = new TextureParams(
            gl.RGBA32F,
            volumeTexelDimensions2D.ind[0],
            volumeTexelDimensions2D.ind[1],
            true,
            gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE,
            gl.LINEAR, gl.LINEAR
        );
        if (this.volume === null && this.volumeGrad === null) {
            this.volume = new Quad(TEX_PARAMS_VOLUME_F16);
            this.volumeGrad = new Quad(TEX_PARAMS_VOLUME_F32);
            return;
        }
        this.volume.reset(TEX_PARAMS_VOLUME_F16);
        this.volumeGrad.reset(TEX_PARAMS_VOLUME_F32);
    }
    createDataFrames(dataTexelDimensions2D) {
        if (this.gradientData !== null && 
            this.gradientData.width === dataTexelDimensions2D.ind[0] &&
            this.gradientData.height === dataTexelDimensions2D.ind[1])
            return;
        const TEX_PARAMS_DATA_F32 = new TextureParams(
            gl.RGBA32F,
            dataTexelDimensions2D.ind[0],
            dataTexelDimensions2D.ind[1],
            true,
            gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE,
            gl.LINEAR, gl.LINEAR
        );
        const TEX_PARAMS_DATA_F16 = new TextureParams(
            gl.RGBA16F,
            dataTexelDimensions2D.ind[0],
            dataTexelDimensions2D.ind[1],
            true,
            gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE,
            gl.LINEAR, gl.LINEAR
        );
        const TEX_PARAMS_DATA_U8 = new TextureParams(
            gl.RGBA8,
            dataTexelDimensions2D.ind[0],
            dataTexelDimensions2D.ind[1],
            true,
            gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE,
            gl.LINEAR, gl.LINEAR
        );
        if (this.data === null || 
            this.gradientData === null || 
            this.dataHalfPrecision === null || 
            this.gradientDataHalfPrecision === null) {
            this.data = new Quad(TEX_PARAMS_DATA_F32);
            this.gradientData = new Quad(TEX_PARAMS_DATA_F32);
            this.dataHalfPrecision = new Quad(TEX_PARAMS_DATA_F16);
            this.gradientDataHalfPrecision = new Quad(TEX_PARAMS_DATA_F16);
            return;
        }
        // let texelDimensions3D = get2DFrom3DDimensions(dataTexelDimensions2D);
        this.data.reset(TEX_PARAMS_DATA_F32);
        this.gradientData.reset(TEX_PARAMS_DATA_F32);
        this.dataHalfPrecision.reset(TEX_PARAMS_DATA_F16);
        this.gradientDataHalfPrecision.reset(TEX_PARAMS_DATA_F16);
    }
    createView(viewDimensions) {
        const TEX_PARAMS_VIEW_F16_MIPMAP_FILTER = new TextureParams(
            gl.RGBA16F,
            viewDimensions.ind[0],
            viewDimensions.ind[1],
            true,
            gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE,
            gl.LINEAR, gl.LINEAR
        );
        /*const TEX_PARAMS_VIEW_UI8_MIPMAP_FILTER = new TextureParams(
            gl.RGBA8,
            viewDimensions.width,
            viewDimensions.height,
            true,
            gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE,
            gl.LINEAR, gl.LINEAR
        );*/
        this.view = new RenderTarget(TEX_PARAMS_VIEW_F16_MIPMAP_FILTER);
    }
}

const ORIENTATION = {
    Z: 0, X: 1, Y: 2
};

const BOUNDARY_TYPE = {
    USE_TEXTURE_WRAPPING: 0,
    DIRICHLET: 1, DIRICHLET_MASK: 2,
};

function gradient(dst, volumeData, boundaryMask, 
                  gradientProgram, orderOfAccuracy, boundaryType,
                  staggeredMode, index,
                  texelDimensions3D, texelDimensions2D) {
    dst.draw(
        gradientProgram,
        {
            tex: volumeData,
            orderOfAccuracy: new IScalar(orderOfAccuracy),
            boundaryType: new IScalar(boundaryType),
            // boundaryMask: boundaryMask,
            staggeredMode: new IScalar(staggeredMode),
            index: new IScalar(index),
            texelDimensions2D: texelDimensions2D,
            texelDimensions3D: texelDimensions3D,
            dr: new Vec3(1.0, 1.0, 1.0),
            dimensions3D: new Vec3(
                texelDimensions3D.ind[0],
                texelDimensions3D.ind[1],
                texelDimensions3D.ind[2]
            ),
        }
    );
}

function sampleData(
    dst, srcData, sampleDataProgram,
    viewScale,
    rotation,
    volumeTexelDimensions3D, volumeTexelDimensions2D,
    dataTexelDimensions3D, dataTexelDimensions2D
) {
    dst.draw(
        sampleDataProgram,
        {
            tex: srcData,
            viewScale: viewScale,
            rotation: rotation,
            volumeTexelDimensions3D: volumeTexelDimensions3D,
            volumeTexelDimensions2D: volumeTexelDimensions2D,
            dataTexelDimensions3D: dataTexelDimensions3D,
            dataTexelDimensions2D: dataTexelDimensions2D
        }
    );
}

function displayVolume(
    renderTarget, displayVolumeProgram, uniforms, 
    volumeRenderTrianglesFrame
) {
    withConfig({
        enable: gl.DEPTH_TEST, depthFunc: gl.LESS,
        width: renderTarget.textureDimensions.ind[0],
        height: renderTarget.textureDimensions.ind[1]}, 
    () => {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        // renderTarget.clear();
        renderTarget.draw(
            displayVolumeProgram, uniforms,
            volumeRenderTrianglesFrame
        );
        gl.disable(gl.BLEND);
    });
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
}



export class VolumeRender {
    debugRotation;
    viewDimensions;

    // 2D texture dimensions
    // 2D dimensions of the initial volume data texture
    dataTexelDimensions2D;
    // 2D dimensions of the texture used in the volume render frame
    volumeTexelDimensions2D;

    // 3D texture dimensions
    // 3D dimensions of the initial volume data texture
    dataTexelDimensions3D;
    // 3D dimensions of the texture used in the volume render frame
    volumeTexelDimensions3D;
    cubeOutline;
    cubeOutlineVertices;
    programs;
    _triangles;
    _frames;
    constructor(viewDimensions, volumeDimensions3D) {
        this.debugRotation = new Quaternion(1.0);
        this.programs = new Programs();
        this.viewDimensions = viewDimensions;
        this.volumeTexelDimensions3D = volumeDimensions3D;
        this.volumeTexelDimensions2D 
            = get2DFrom3DDimensions(volumeDimensions3D);
        // this.dataTexelDimensions3D = dataDimensions3D;
        // this.dataTexelDimensions2D 
        //     = get2DFrom3DDimensions(dataDimensions3D);
        let [vertices, elements] 
            = getVolumeRenderVerticesAndElements(
                this.volumeTexelDimensions2D, this.volumeTexelDimensions3D);
        this._triangles = new TrianglesFrame(
            {"uvIndex": new Attribute(2, gl.FLOAT, false)},
            vertices, elements);
        this._frames = new Frames();
        this._frames.createVolumeFrames(this.volumeTexelDimensions2D);
        this._frames.createView(viewDimensions);

        let [cubeVertices, cubeElements] = getCubeOutlineVerticesAndElements();
        this.cubeOutline = new LinesFrame(
            {"position": new Attribute(3, gl.FLOAT, false)},
            cubeVertices, cubeElements);
        this.cubeOutlineVertices = [];
        for (let i = 0; i < 8; i++)
            this.cubeOutlineVertices.push(
                new Quaternion(
                    1.0,
                    cubeVertices[3*i], 
                    cubeVertices[3*i+1],
                    cubeVertices[3*i+2])
            );
    }
    resetVolumeDimensions(volumeDimensions3D) {
        this.volumeTexelDimensions3D = volumeDimensions3D;
        this.volumeTexelDimensions2D 
            = get2DFrom3DDimensions(volumeDimensions3D);
        let [vertices, elements] 
            = getVolumeRenderVerticesAndElements(
                this.volumeTexelDimensions2D, this.volumeTexelDimensions3D);
        this._triangles = new TrianglesFrame(
            {"uvIndex": new Attribute(2, gl.FLOAT, false)},
            vertices, elements);
        this._frames.createVolumeFrames(this.volumeTexelDimensions2D);
        // this._frames.createView(viewDimensions);
    }

    view(srcData, scale, rotation, additionalUniforms=null) {
        if (!(srcData instanceof MultidimensionalDataQuad)) {
            console.error('Input for VolumeRender method view '
                            + 'must be a MultidimensionalDataQuad.');
            return;
        }
        let maxX = 0.0, maxY = 0.0, maxZ = 0.0;
        for (let i = 0; i < this.cubeOutlineVertices.length; i++) {
            let v
                = Quaternion.rotate(this.cubeOutlineVertices[i], rotation);
            let x = v.i, y = v.j, z = v.k;
            maxX = (x > maxX)? x: maxX;
            maxY = (y > maxY)? y: maxY;
            maxZ = (z > maxZ)? z: maxZ;
        }
        let rotScale = (scale > 1.0)? scale: 1.0/Math.max(maxX, maxY, maxZ);
        // let rotScale = 1.0;
        let dataTexelDimensions2D = new IVec2(srcData.width, srcData.height);
        let dataTexelDimensions3D = new IVec3(
            ...srcData.dataDimensions);
        this._frames.createDataFrames(dataTexelDimensions2D);
        this._frames.dataHalfPrecision.draw(
            this.programs.zeroBoundaries, 
            {tex: srcData,
             texelDimensions2D: dataTexelDimensions2D,
             texelDimensions3D: dataTexelDimensions3D,
            });
        /* this._frames.dataHalfPrecision.draw(
            this.programs.copy, {tex: srcData}
        );*/
        /* gradient(this._frames.gradientDataHalfPrecision,
                 this._frames.data, 0,
                 this.programs.gradient, 2, 
                 BOUNDARY_TYPE.USE_TEXTURE_WRAPPING,
                 0, 3,
                 dataTexelDimensions3D, dataTexelDimensions2D);*/
        gradient(this._frames.gradientData,
                this._frames.dataHalfPrecision, 0,
                this.programs.gradient, 2, 
                BOUNDARY_TYPE.USE_TEXTURE_WRAPPING,
                0, 3,
                dataTexelDimensions3D, dataTexelDimensions2D);
                this._frames.volume.clear();
                this._frames.volumeGrad.clear();
        sampleData(
            this._frames.volume, this._frames.dataHalfPrecision,
            this.programs.sampleData,
            rotScale, rotation,
            this.volumeTexelDimensions3D, this.volumeTexelDimensions2D,
            dataTexelDimensions3D, dataTexelDimensions2D);
        sampleData(
            this._frames.volumeGrad, this._frames.gradientData,
            this.programs.sampleData,
            rotScale, rotation,
            this.volumeTexelDimensions3D, this.volumeTexelDimensions2D,
            dataTexelDimensions3D, dataTexelDimensions2D);

        this._frames.view.clear();

        withConfig({
            enable: gl.DEPTH_TEST, depthFunc: gl.LESS,
            width: this._frames.view.textureDimensions.ind[0],
            height: this._frames.view.textureDimensions.ind[1]}, 
        () => {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            this._frames.view.draw(
                this.programs.cubeOutline, {
                    rotation: rotation,
                    viewScale: scale,
                    color: new Vec4(1.0, 1.0, 1.0, 0.5)
                },
                this.cubeOutline
            );
        });
        let viewUniforms = (additionalUniforms === null)?
            {colorBrightness: 1.0, alphaBrightness: 1.0}: additionalUniforms
        displayVolume(this._frames.view,
            this.programs.showVolume, {
                ...viewUniforms,
                rotation: rotation,
                gradientTex: this._frames.volumeGrad,
                densityTex: this._frames.volume,
                fragmentTexelDimensions3D: this.volumeTexelDimensions3D,
                fragmentTexelDimensions2D: this.volumeTexelDimensions2D,
                texelDimensions2D: this.volumeTexelDimensions2D,
                texelDimensions3D: this.volumeTexelDimensions3D,
                debugRotation: this.debugRotation,
                debugShow2DTexture: false,
                scale: scale/rotScale,
            },
            this._triangles
        );
        return this._frames.view;
    }
    get gradientHalfPrecision() {
        return this._frames.gradientDataHalfPrecision;
    }
    get volumeQuad() {
        return this._frames.volume;
    }
    get volumeGradientQuad() {
        return this._frames.volumeGrad;
    }
}