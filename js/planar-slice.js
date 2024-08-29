import { gl, Attribute, 
    TrianglesFrame, makeProgramFromSources, 
    RenderTarget, IScalar, IVec2, IVec3, Vec4, Quaternion,
    mul, sub, add, div, dot,
    MultidimensionalDataQuad, withConfig,
    get2DFrom3DDimensions,
    Vec3} from "./gl-wrappers.js";
import { getShader } from "./shaders.js";
import { solve3x3Matrix } from "./matrix3x3.js";

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

function getPlanarVectors(planarSlice, rotation) {
    let vertices = planarSlice.getVertices();
    let q0 = new Quaternion(1.0, ...vertices[0].position.ind);
    let q1 = new Quaternion(1.0, ...vertices[1].position.ind);
    let q2 = new Quaternion(1.0, ...vertices[3].position.ind);
    let s0 = Quaternion.rotate(q0, rotation);
    let s1 = Quaternion.rotate(q1, rotation);
    let s2 = Quaternion.rotate(q2, rotation);
    // let s0 = mul(rotation.inverse(), mul(q0, rotation));
    // let s1 = mul(rotation.inverse(), mul(q1, rotation));
    // let s2 = mul(rotation.inverse(), mul(q2, rotation));
    let r0 = new Vec3(s0.i, s0.j, s0.k);
    let r1 = new Vec3(s1.i, s1.j, s1.k);
    let r2 = new Vec3(s2.i, s2.j, s2.k);
    let r01 = sub(r1, r0);
    let r02 = sub(r2, r0);
    return [r01, r02];
}

/* Three planar slices whose normal vectors are orthogonal to each other.

The first of these lie along the xy plane. It is constructed using the
vertices (-1, -1, 0), (-1, 1, 0), (1, 1, 0) and (1, -1, 0).
Its uv texture coordinates are aligned along the same orientation as xy,
where the vertex positions (-1, -1, 0), (0, 0, 0), and (1, 1, 0) correspond
to the texture positions (0, 0), (0.5, 0.5), and (1.0, 1.0) respectively.
It may be offset along the z direction.

The next slice is oriented in the zy plane. It actually uses the 
same vertices as the xy slice, but rotated by pi/2 radians along the y-axis 
in the vertex shader (note that rotations are oriented clockwise). 
Its uv[0] texture coordinate points in the same
direction as the z axis, while uv[1] is oriented along y. Its offset
is along the x direction.

The final slice lies in the xz plane. It uses the same vertices
as the xy slice, but rotated by -pi/2 radians around the x-axis.
The uv texture coordinates are oriented in the same direction
xz. Its offset is along the y direction.


*/
export class PlanarSlices {
    planarSlice;
    planarSliceProgram;
    renderTarget;
    constructor(textureParams) {
        this.renderTarget = new RenderTarget(textureParams);
        this.planarSlice = getPlanarSlice();
        this.planarSliceProgram = makeProgramFromSources(
            getShader("./shaders/slices/planar-slice.vert"),
            // getShader("./shaders/util/uniform-color.frag"),
            getShader("./shaders/util/slice-of-3d.frag")
        );
    }
    getOffsetVectors(dimensions3D, 
                     sliceXY, sliceYZ, sliceXZ,
                     withRespectToSlices=false) {
        if (withRespectToSlices) {
            let offsetXY = 2.0*(sliceXY/dimensions3D.ind[0] - 0.5);
            let offsetYZ = 2.0*(sliceYZ/dimensions3D.ind[1] - 0.5);
            let offsetXZ = 2.0*(sliceXZ/dimensions3D.ind[2] - 0.5);
            return {
                xy: new Vec3(0.0, 0.0, offsetXY),
                yz: new Vec3(0.0, 0.0, -offsetYZ),
                xz: new Vec3(0.0, 0.0, -offsetXZ)
            };
        } else {
            let offsetXY = (sliceXY/dimensions3D.ind[0] - 0.5);
            let offsetYZ = (sliceYZ/dimensions3D.ind[1] - 0.5);
            let offsetXZ = (sliceXZ/dimensions3D.ind[2] - 0.5);
            return {
                xy: new Vec3(0.0, 0.0, offsetXY),
                yz: new Vec3(offsetYZ, 0.0, 0.0),
                xz: new Vec3(0.0, offsetXZ, 0.0)
            };
        }
    } 
    /* Get a view of each of the slices 

    src - MultidimensionalDataQuad containing the
    3D array of data points.
    rotate - Change the view orientation of the slices.
    Except for an offset that remains perpendicular to the slices,
    each of the slices keep the same orientation with
    respect to the 3D data array that it slices.
    scale - Change the view scaling of the slices.
    sliceXY - offset for the xy planar slice
    sliceYZ - offset for the yz planar slice
    sliceXZ - offset for the xz planar slice
    */
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
        let offsetVectors = this.getOffsetVectors(
            src.dimensions3D, sliceXY, sliceYZ, sliceXZ, true);
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
                        offset: offsetVectors.xy,
                        rotation: rotation0, slice: new IScalar(sliceXY)
                    },
                    this.planarSlice
                );
                this.renderTarget.draw(
                    this.planarSliceProgram,
                    {
                        ...uniforms,
                        orientation: new IScalar(1),
                        // color: new Vec4(0.04, 0.04, 0.04, 0.0),
                        offset: offsetVectors.yz,
                        rotation: rotation1, slice: new IScalar(sliceYZ)
                    },
                    this.planarSlice
                );
                this.renderTarget.draw(
                    this.planarSliceProgram,
                    {
                        ...uniforms,
                        orientation: new IScalar(2),
                        // color: new Vec4(0.08, 0.08, 0.08, 0.0),
                        offset: offsetVectors.xz,
                        rotation: rotation2, slice: new IScalar(sliceXZ)
                    },
                    this.planarSlice
                );
            }
        );
        return this.renderTarget;
    }
    /* Get the vectors that span the xy plane. */
    getXYPlanarVectors(rotation) {
        return getPlanarVectors(this.planarSlice, rotation);
    }
    /* Get the vectors that span the yz plane */
    getYZPlanarVectors(rotation) {
        let rotation1 = mul(
            Quaternion.rotator(Math.PI/2.0, 0.0, 1.0, 0.0),
            rotation,
        );
        return getPlanarVectors(this.planarSlice, rotation1);
    }
    /* Get the vectors that span the xz plane */
    getXZPlanarVectors(rotation) {
        let rotation2 = mul(
            Quaternion.rotator(-Math.PI/2.0, 1.0, 0.0, 0.0),
            rotation,
        );
        return getPlanarVectors(this.planarSlice, rotation2);
    }
    /* Get the vector that is normal to the xy plane */
    getXYNormal(rotation) {
        let [v1, v2] = this.getXYPlanarVectors(rotation);
        return Vec3.crossProd(v1, v2);
    }
    /* Get the vector that is normal to the yz plane */
    getYZNormal(rotation) {
        let [v1, v2] = this.getYZPlanarVectors(rotation);
        return Vec3.crossProd(v1, v2);
    }
    /* Get the vector that is normal to the xz plane */
    getXZNormal(rotation) {
        let [v1, v2] = this.getXZPlanarVectors(rotation);
        return Vec3.crossProd(v1, v2);
    }
    /* Get the point of intersection for a line for the xy
    plane. Note that the parameter rotation does not 
    rotate the vectors given in the planeOffsets and it is assumed that 
    rotations have been applied to it beforehand; use the method 
    getOffsetVectors to get the planeOffset from the offset parameters that 
    are used in the view method.
    */
    getXYLinePlaneIntersection(rotation, offset,
                               lineStart, lineDirection) {
        let [r0, r1] = this.getXYPlanarVectors(rotation);
        let b = sub(lineStart, offset);
        let [s, t, r] = solve3x3Matrix(
            [[r0.x, r1.x, -lineDirection.x],
             [r0.y, r1.y, -lineDirection.y], 
             [r0.z, r1.z, -lineDirection.z]],
            [...b.ind]);
        // console.log('line start', lineStart);
        // console.log('offsetXY', offset);
        // console.log('b', b);
        let planePoint = add(mul(s, r0), mul(t, r1));
        let res = add(offset, planePoint);
        // console.log('Intersection relative to plane: ', planePoint);
        // console.log('Offset intersection: ', res);
        return res;
        // return add(add(mul(s, r0), mul(t, r1)), offset);
        // return add(lineStart, mul(lineDirection, r));
    }
    /* Get the point of intersection for a line for the yz
    plane. Note that the parameter rotation does not 
    rotate the vectors given in the planeOffsets and it is assumed that 
    rotations have been applied to it beforehand; use the method 
    getOffsetVectors to get the planeOffset from the offset parameters that 
    are used in the view method.
    */
    getYZLinePlaneIntersection(rotation, offset,
                               lineStart, lineDirection) {
        let [r0, r1] = this.getYZPlanarVectors(rotation);
        let b = sub(lineStart, offset);
        let [s, t, _r] = solve3x3Matrix(
            [[r0.x, r1.x, -lineDirection.x],
             [r0.y, r1.y, -lineDirection.y], 
             [r0.z, r1.z, -lineDirection.z]],
            [...b.ind]);
        /* console.log(s, t);
        console.log('r0', r0);
        console.log('r1', r1);
        console.log('line start', lineStart);
        console.log('offsetYZ', offset);
        console.log('b', b);*/
        let planePoint = add(mul(s, r0), mul(t, r1));
        let res = add(offset, planePoint);
        // console.log('Intersection relative to plane: ', planePoint);
        // console.log('Offset intersection: ', res);
        return res;
    }
    /* Get the point of intersection for a line for the xz
    plane. Note that the parameter rotation does not 
    rotate the vectors given in the planeOffsets and it is assumed that 
    rotations have been applied to it beforehand; use the method 
    getOffsetVectors to get the planeOffset from the offset parameters that 
    are used in the view method.
    */
    getXZLinePlaneIntersection(rotation, offset,
                               lineStart, lineDirection) {
        let [r0, r1] = this.getXZPlanarVectors(rotation);
        let b = sub(lineStart, offset);
        let [s, t, _r] = solve3x3Matrix(
            [[r0.x, r1.x, -lineDirection.x],
             [r0.y, r1.y, -lineDirection.y], 
             [r0.z, r1.z, -lineDirection.z]],
            [...b.ind]);
        /* console.log('line start', lineStart);
        console.log('offsetXZ', offset);
        console.log('b', b);*/
        return add(offset, add(mul(s, r0), mul(t, r1)));
    }
    /* Get the point of intersection for a line with each of the three
    planes. Note that the parameter rotation does not 
    rotate the vectors given in the planeOffsets and it is assumed that 
    rotations have been applied to it beforehand; use the method 
    getOffsetVectors to get the planeOffset from the offset parameters that 
    are used in the view method.
    */
    getLinePlaneIntersections(
        rotation, lineStart, lineFinish, planeOffsets=null) {
        // console.log('Offset vectors: ', planeOffsets);
        if (planeOffsets === null) {
            planeOffsets = {
                xy: new Vec3(0.0, 0.0, 0.0),
                xz: new Vec3(0.0, 0.0, 0.0),
                yz: new Vec3(0.0, 0.0, 0.0)
            };
        }
        let dir = sub(lineFinish, lineStart);
        dir = div(dir, dir.length());
        let intersectXY 
            = this.getXYLinePlaneIntersection(
                rotation, planeOffsets.xy, lineStart, dir);
        let intersectXZ
            = this.getXZLinePlaneIntersection(
                rotation, planeOffsets.xz, lineStart, dir);
        let intersectYZ
            = this.getYZLinePlaneIntersection(
                rotation, planeOffsets.yz, lineStart, dir);
        return {xy: intersectXY, xz: intersectXZ, yz: intersectYZ};
    }
    /* Take the dot product of the normal vector for each plane
    with the given line. */
    getNormalsDotLine(rotation, lineStart, lineEnd) {
        let dir = sub(lineEnd, lineStart);
        dir = div(dir, dir.length());
        let xyNormal = this.getXYNormal(rotation);
        let xzNormal = this.getXZNormal(rotation);
        let yzNormal = this.getYZNormal(rotation);
        let aXY = Math.abs(dot(xyNormal, dir));
        let aXZ = Math.abs(dot(xzNormal, dir));
        let aYZ = Math.abs(dot(yzNormal, dir));
        return {xy: aXY, xz: aXZ, yz: aYZ};
    }
}

