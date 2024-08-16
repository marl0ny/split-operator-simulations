import { gl, Attribute, 
    TrianglesFrame, makeProgramFromSources, 
    RenderTarget, IScalar, IVec2, IVec3, Vec4, Quaternion, mul,
    MultidimensionalDataQuad, withConfig,
    get2DFrom3DDimensions,
    Vec3} from "./gl-wrappers.js";
import { getShader } from "./shaders.js";

function getVerticesElements() {
    return [new Float32Array([
                -1.0, -1.0, 0.0, -1.0, 1.0, 0.0, 
                1.0, 1.0, 0.0, 1.0, -1.0, 0.0]),
            (gl.version === 2)? 
            new Int32Array([0, 1, 2, 0, 2, 3]):
            new Uint16Array([0, 1, 2, 0, 2, 3])];
}

/*
const CUBE_OUTLINE_PROGRAM = makeProgramFromSources(
    getShader("./shaders/vol-render/cube-outline.vert"),
    getShader("./shaders/util/uniform-color.frag"),
);

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
}*/

export function getPlanarSlice() {
    let [vertices, elements] = getVerticesElements();
    return new TrianglesFrame({"position": new Attribute(3, gl.FLOAT, false)},
                              vertices, elements);
}


export class PlanarSlices {
    xySlice;
    yzSlice;
    zxSlice;
    planarSliceProgram;
    renderTarget;
    constructor(textureParams) {
        this.renderTarget = new RenderTarget(textureParams);
        this.xySlice = getPlanarSlice();
        this.yzSlice = getPlanarSlice();
        this.zxSlice = getPlanarSlice();
        this.planarSliceProgram = makeProgramFromSources(
            getShader("./shaders/slices/planar-slice.vert"),
            // getShader("./shaders/util/uniform-color.frag"),
            getShader("./shaders/util/slice-of-3d.frag")
        );
    }
    view(src, rotate, scale, sliceXY, sliceYZ, sliceXZ) {
        if (!(src instanceof MultidimensionalDataQuad))
            throw "Argument src of method view "
                + "must be an instance of MultidimensionalDataQuad.";
        let rotation0 = rotate;
        let rotation1 = mul(
            Quaternion.rotator(Math.PI/2.0, 0.0, 1.0, 0.0),
            rotate,
        );
        let rotation2 = mul(
            Quaternion.rotator(-Math.PI/2.0, 1.0, 0.0, 0.0),
            rotate,
        );
        // console.log(sliceXY, sliceYZ, sliceXZ);
        /// console.log(this.renderTarget.width, this.renderTarget.height);
        this.renderTarget.clear();
        let uniforms = {
            scale: scale,
            sourceTexelDimensions2D: get2DFrom3DDimensions(src.dimensions3D),
            sourceTexelDimensions3D: src.dimensions3D,
            tex: src,
            showOutline: true,
            screenDimensions: 
            new IVec2(this.renderTarget.width, this.renderTarget.height)

        };
        let offsetXY = 2.0*(sliceXY/src.dimensions3D.ind[0] - 0.5);
        let offsetYZ = 2.0*(sliceYZ/src.dimensions3D.ind[1] - 0.5);
        let offsetXZ = 2.0*(sliceXZ/src.dimensions3D.ind[2] - 0.5);
        withConfig(
            {enable: gl.DEPTH_TEST, depthFunc: gl.LESS,
             width: this.renderTarget.width,
             height: this.renderTarget.height
            }, () => {
                this.renderTarget.draw(
                    this.planarSliceProgram,
                    {   
                        ...uniforms,
                        orientation: new IScalar(0),
                        scale: scale,
                        offset: new Vec3(0.0, 0.0, offsetXY),
                        rotation: rotation0, slice: new IScalar(sliceXY)
                    },
                    this.xySlice
                );
                this.renderTarget.draw(
                    this.planarSliceProgram,
                    {
                        ...uniforms,
                        orientation: new IScalar(1),
                        // color: new Vec4(0.04, 0.04, 0.04, 0.0),
                        offset: new Vec3(0.0, 0.0, -offsetYZ),
                        rotation: rotation1, slice: new IScalar(sliceYZ)
                    },
                    this.yzSlice
                );
                this.renderTarget.draw(
                    this.planarSliceProgram,
                    {
                        ...uniforms,
                        orientation: new IScalar(2),
                        // color: new Vec4(0.08, 0.08, 0.08, 0.0),
                        offset: new Vec3(0.0, 0.0, -offsetXZ),
                        rotation: rotation2, slice: new IScalar(sliceXZ)
                    },
                    this.zxSlice
                );
            }
        );
        return this.renderTarget;
    }
}

