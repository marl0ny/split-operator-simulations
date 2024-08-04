import { gl, Attribute, 
    TrianglesFrame, makeProgramFromSources, 
    RenderTarget, IScalar, IVec2, IVec3, Vec4, Quaternion, mul,
    MultidimensionalDataQuad, withConfig,
    get2DFrom3DDimensions} from "./gl-wrappers.js";
import { getShader } from "./shaders.js";

function getVerticesElements() {
    return [new Float32Array([
                -1.0, -1.0, 0.0, -1.0, 1.0, 0.0, 
                1.0, 1.0, 0.0, 1.0, -1.0, 0.0]),
            (gl.version === 2)? 
            new Int32Array([0, 1, 2, 0, 2, 3]):
            new Uint16Array([0, 1, 2, 0, 2, 3])];
}

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
            color: new Vec4(1.0, 1.0, 1.0, 1.0),
            screenDimensions: 
            new IVec2(this.renderTarget.width, this.renderTarget.height)

        };
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
                        color: new Vec4(1.0, 0.0, 0.0, 1.0),
                        rotation: rotation0, slice: new IScalar(sliceXY)
                    },
                    this.xySlice
                );
                this.renderTarget.draw(
                    this.planarSliceProgram,
                    {
                        ...uniforms,
                        orientation: new IScalar(1),
                        color: new Vec4(0.0, 1.0, 0.0, 1.0),
                        rotation: rotation1, slice: new IScalar(sliceYZ)
                    },
                    this.yzSlice
                );
                this.renderTarget.draw(
                    this.planarSliceProgram,
                    {
                        ...uniforms,
                        orientation: new IScalar(2),
                        color: new Vec4(0.0, 0.0, 1.0, 1.0),
                        rotation: rotation2, slice: new IScalar(sliceXZ)
                    },
                    this.zxSlice
                );
            }
        );
        return this.renderTarget;
    }
}

