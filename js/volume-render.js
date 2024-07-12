import { Vec3, Attribute, Quad, TrianglesFrame, RenderTarget, Quaternion, TextureParams,
    makeProgramFromSources, 
    get2DFrom3DTextureCoordinates} from "./gl-wrappers.js";
import getShader from "./shaders.js"

export function getVerticesAndElements(
    renderTexelDimensions2D, renderTexelDimensions3D) {
    let width = renderTexelDimensions3D.ind[0];
    let height = renderTexelDimensions3D.ind[1];
    let length = renderTexelDimensions3D.ind[2];
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
            uvwBottomLeft, renderTexelDimensions2D, renderTexelDimensions3D);
        let uvBottomRight = get2DFrom3DTextureCoordinates(
            uvwBottomRight, renderTexelDimensions2D, renderTexelDimensions3D);
        let uvUpperRight = get2DFrom3DTextureCoordinates(
            uvwUpperRight, renderTexelDimensions2D, renderTexelDimensions3D);
        let uvUpperLeft = get2DFrom3DTextureCoordinates(
            uvwUpperLeft, renderTexelDimensions2D, renderTexelDimensions3D);
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
    sampleVolume;
    showVolume;
    sampleShowVolume;
    // cube;
    // color;
    constructor() {
        this.sampleVolume = Quad.makeProgramFromSource(
            getShader("./shaders/vol-render-sample.frag")
        );
        this.gradient = Quad.makeProgramFromSource(
            getShader("./shaders/gradient3d.frag")
        );
        this.showVolume = makeProgramFromSources(
            getShader("./shaders/vol-render-display.vert"),
            getShader("./shaders/vol-render-display.frag")
        );
        this.sampleShowVolume = makeProgramFromSources(
            getShader("./shaders/vol-render-display.vert"),
            getShader("./shaders/vol-render-sample-display.frag")
        );
    }
}


class Renders {
    gradient;
    volHalfPrecision;
    gradientHalfPrecision;
    sampleVolume;
    sampleGrad;
    out;
    constructor(
        viewDimensions, renderTexelDimensions2D, sampleTexelDimensions) {
        const TEX_PARAMS_SAMPLE_F32 = new TextureParams(
            gl.RGBA32F,
            sampleTexelDimensions.width,
            sampleTexelDimensions.height,
            true, 
            gl.REPEAT, gl.REPEAT, 
            gl.LINEAR, gl.LINEAR
        );
        const TEX_PARAMS_SAMPLE_F16 = new TextureParams(
            gl.RGBA16F,
            sampleTexelDimensions.width,
            sampleTexelDimensions.height,
            true,
            gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE,
            gl.LINEAR, gl.LINEAR
        );
        const TEX_PARAMS_RENDER_F16 = new TextureParams(
            gl.RGBA16F,
            renderTexelDimensions2D.width,
            renderTexelDimensions2D.height,
            true,
            gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE,
            gl.LINEAR, gl.LINEAR
        );
        const TEX_PARAMS_VIEW_F16_MIPMAP_FILTER = new TextureParams(
            gl.RGBA16F,
            viewDimensions.width,
            viewDimensions.height,
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
        this.gradient = new Quad(TEX_PARAMS_SAMPLE_F32);
        this.volHalfPrecision = new Quad(TEX_PARAMS_SAMPLE_F16);
        this.gradientHalfPrecision = new Quad(TEX_PARAMS_SAMPLE_F16);
        this.sampleVolume = new Quad(TEX_PARAMS_RENDER_F16);
        this.sampleGrad = new Quad(TEX_PARAMS_RENDER_F16);
        this.out = new RenderTarget(TEX_PARAMS_VIEW_F16_MIPMAP_FILTER);

    }
}

const ORIENTATION = {
    Z: 0, X: 1, Y: 2
};

function gradient(dst, volumeData, boundaryMask, 
                  gradientProgram, orderOfAccuracy, boundaryType,
                  staggeredMode, index,
                  texelDimensions3D, texelDimensions2D) {
    dst.draw(
        gradientProgram,
        {
            tex: volumeData,
            orderOfAccuracy: orderOfAccuracy,
            boundaryType: boundaryType,
            boundaryMask: boundaryMask,
            staggeredMode: staggeredMode,
            index: index,
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

function sampleVolumeData(
    dst, volumeData, sampleVolumeProgram,
    viewScale,
    rotation,
    renderTexelDimensions3D, renderTexelDimensions2D,
    sampleTexelDimensions3D, sampleTexelDimensions2D
) {
    dst.draw(
        sampleVolumeProgram,
        {
            tex: volumeData,
            viewScale: viewScale,
            rotation: rotation,
            renderTexelDimensions3D: renderTexelDimensions3D,
            renderTexelDimensions2D: renderTexelDimensions2D,
            sampleTexelDimensions3D: sampleTexelDimensions3D,
            sampleTexelDimensions2D: sampleTexelDimensions2D
        }
    );
}

function showSampledVolume(
    dst, sampleGrad, sampleVol,
    showVolProgram, cubeProgram, sizeofElements,
    rotation, debugRotation,
    scale,
    renderTexelDimensions3D,
    renderTexelDimensions2D,
) {
    
}



export class VolumeRender {
    debugRotation;
    viewDimensions;

    // 2D texture dimensions
    // 2D dimensions of the inital volume data texture
    sampleTexelDimensions2D;
    // 2D dimensions of the texture used in the volume render frame
    renderTexelDimensions2D;

    // 3D texture dimensions
    // 3D dimensions of the inital volume data texture
    sampleTexelDimensions3D;
    // 3D dimensions of the texture used in the volume render frame
    renderTexelDimensions3D;
    programs;
    wireFrame;
    renders;
    constructor(viewDimensions, renderDimensions, sampleDimensions) {
        this.debugRotation = new Quaternion(1.0);
        this.programs = new Programs();
        this.viewDimensions = viewDimensions;
        this.sampleTexelDimensions3D = sampleDimensions;
        this.renderTexelDimensions3D = renderDimensions;
        this.sampleTexelDimensions2D 
            = get2DFrom3DTextureCoordinates(sampleDimensions);
        this.renderTexelDimensions2D 
            = get2DFrom3DTextureCoordinates(renderDimensions);
        let [vertices, elements] 
            = getVerticesAndElements(
                this.renderTexelDimensions2D, this.renderTexelDimensions3D);
        this.wireFrame = new TrianglesFrame(
            {"uvIndex": new Attribute(2, gl.FLOAT, false)},
            vertices, elements);
        this.renders
            = new Renders(
                viewDimensions, this.renderTexelDimensions2D, 
                this.sampleTexelDimensions2D);
        
    }




}