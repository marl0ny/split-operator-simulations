import { gl, Attribute, 
    TrianglesFrame, LinesFrame, makeProgramFromSources, 
    RenderTarget, IScalar, IVec2, IVec3, Vec4, Quaternion,
    mul, sub, add, div, dot,
    MultidimensionalDataQuad, withConfig,
    get2DFrom3DDimensions,
    Vec3 } from "./gl-wrappers.js";
import { getShader } from "./shaders.js";
import { solve3x3Matrix } from "./matrix3x3.js";

function getVerticesElements() {
    return [
        new Float32Array([
            0.0, 0.0, 0.0,
            -1.0, -1.0, 0.0,
            -1.0, 0.0, 0.0,
            -1.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            1.0, 1.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, -1.0, 0.0,
            0.0, -1.0, 0.0
        ]),
        (gl.version === 2)? 
        new Int32Array([
            1, 8, 0, 1, 0, 2, 2, 0, 4, 2, 4, 3,
            0, 5, 4, 0, 6, 5, 8, 6, 0, 8, 7, 6       
        ]): 
        new Uint16Array([
            1, 8, 0, 1, 0, 2, 2, 0, 4, 2, 4, 3,
            0, 5, 4, 0, 6, 5, 8, 6, 0, 8, 7, 6,
        ])];
}

function getQuarteredSquareOutlineVerticesAndElements() {
    // Start with the vertex at the center of the square,
    // and then list the vertices at the edges.
    // Place vertices along the edges clockwise starting from (-1, -1).
    let vertices = new Float32Array([
        0.0, 0.0, 0.0,
        -1.0, -1.0, 0.0,
        -1.0, 0.0, 0.0,
        -1.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        1.0, 1.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, -1.0, 0.0,
        0.0, -1.0, 0.0,

    ]);
    let elements = [
        // Edges for the "cross" that's inside the square
        0, 8, 0, 2, 0, 4, 0, 6,
        // Edges of the outer square
        1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 1
    ];
    return [vertices, 
        (gl.version === 2)?
        new Int32Array(elements): new Uint16Array(elements)];
}

const QUARTERED_SQUARE_PROGRAM = makeProgramFromSources(
    getShader("./shaders/slices/quartered-square-outline.vert"),
    getShader("./shaders/util/uniform-color.frag")
);

function getQuarteredSquareOutline() {
    let [vertices, elements] = getQuarteredSquareOutlineVerticesAndElements();
    return new LinesFrame({"position": new Attribute(3, gl.FLOAT, false)},
                          vertices, elements);
}


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
}

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

Note that the offsets are added to the position of the planes before they
are rotated to their correct orientations.

*/
export class PlanarSlices {
    planarSlice;
    // cubeOutline;
    quarteredSquareOutline;
    planarSliceProgram;
    renderTarget;
    constructor(textureParams) {
        this.renderTarget = new RenderTarget(textureParams);
        this.planarSlice = getPlanarSlice();
        this.quarteredSquareOutline = getQuarteredSquareOutline();
        this.planarSliceProgram = makeProgramFromSources(
            getShader("./shaders/slices/planar-slice.vert"),
            // getShader("./shaders/util/uniform-color.frag"),
            getShader("./shaders/util/slice-of-3d.frag")
        );
        // let [cubeVertices, cubeElements] = getCubeOutlineVerticesAndElements();
        // this.cubeOutline = new LinesFrame(
        //     {"position": new Attribute(3, gl.FLOAT, false)},
        //     cubeVertices, cubeElements);
        // this.cubeOutlineVertices = [];
        // for (let i = 0; i < 8; i++)
        //     this.cubeOutlineVertices.push(
        //         new Quaternion(
        //             1.0,
        //             cubeVertices[3*i], 
        //             cubeVertices[3*i+1],
        //             cubeVertices[3*i+2])
        //     );
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
    ray - line representing a line of site. Used for drawing
    the location of the cursor
    */
    view(src, rotate, scale, sliceXY, sliceYZ, sliceXZ,
         gridDimensions, ray=null) {
        console.log()
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
            alpha: 1.0,
            showOutline: false,
            screenDimensions: 
            new IVec2(this.renderTarget.width, this.renderTarget.height)

        };
        let offsetVectors = this.getOffsetVectors(
            src.dimensions3D, sliceXY, sliceYZ, sliceXZ, true);
        withConfig(
            {width: this.renderTarget.width,
             height: this.renderTarget.height
            }, () => {
                gl.enable(gl.DEPTH_TEST);
                gl.enable(gl.BLEND);
                gl.depthFunc(gl.LESS);
                // this.renderTarget.draw(
                //     CUBE_OUTLINE_PROGRAM, {
                //         rotation: rotate,
                //         viewScale: scale,
                //         color: new Vec4(0.1, 0.1, 0.1, 0.0)
                //     },
                //     this.cubeOutline
                // );
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
                for (let rotOffset of [[rotation0, offsetVectors.xy],
                                       [rotation1, offsetVectors.yz],
                                       [rotation2, offsetVectors.xz]]) {
                    let [rotation, offset] = rotOffset;
                    this.renderTarget.draw(
                        QUARTERED_SQUARE_PROGRAM,
                        {
                            cursorPosition: new Vec3(
                                -1.0, 1.0, 0.0
                            ),
                            offset: offset,
                            scale: scale*1.01,
                            rotation: rotation,
                            screenDimensions: 
                            new IVec2(
                                this.renderTarget.width,
                                this.renderTarget.height
                            ),
                            color: new Vec4(0.7, 0.7, 0.7, 0.5),
                        },
                        this.quarteredSquareOutline
                    );
                }
                if (ray !== null) {
                    let res = this.getPositionOnPlanes(
                        ray[0], ray[1], gridDimensions, 
                        new IVec3(sliceXY, sliceYZ, sliceXZ));
                    try {
                        res.x;
                    } catch(_) {
                        return this.renderTarget;
                    }
                    let posRotationOffsetOrientationSlice
                        = this.getValueCorrespondingToMostPerpendicularPlane(
                            ray[0], ray[1], 
                            gridDimensions,
                            new IVec3(sliceXY, sliceYZ, sliceXZ),
                            {xy: [new Vec3(2.0*res.x, 2.0*res.y, 0.0),
                                  rotation0, offsetVectors.xy,
                                  new IScalar(0), new IScalar(sliceXY)], 
                             xz: [new Vec3(2.0*res.x, 2.0*res.z, 0.0),
                                  rotation2, offsetVectors.xz,
                                  new IScalar(2), new IScalar(sliceXZ)], 
                             yz: [new Vec3(2.0*res.z, 2.0*res.y, 0.0),
                                  rotation1, offsetVectors.yz,
                                  new IScalar(1), new IScalar(sliceYZ)]}
                        );
                    let [pos, rotation, offset, orientation, slice] 
                        = posRotationOffsetOrientationSlice;
                    if (pos !== 'undefined') {
                        if (Math.abs(pos.ind[0]) < 1.0 
                            && Math.abs(pos.ind[1]) < 1.0) {
                            // this.renderTarget.draw(
                            //     this.planarSliceProgram,
                            //     {
                            //         ...uniforms,
                            //         orientation: orientation,
                            //         // color: new Vec4(0.04, 0.04, 0.04, 0.0),
                            //         offset: offset,
                            //         rotation: rotation, 
                            //         alpha: 1.0,
                            //         slice: slice
                            //     },
                            //     this.planarSlice
                            // );
                            // gl.disable(gl.DEPTH_TEST);
                            this.renderTarget.draw(
                                QUARTERED_SQUARE_PROGRAM,
                                {
                                    cursorPosition: new Vec3(
                                        pos.x, pos.y, pos.z
                                    ),
                                    offset: 
                                    add(offset, new Vec3(0.0, 0.0, 0.01)),
                                    scale: scale,
                                    rotation: rotation,
                                    screenDimensions: 
                                    new IVec2(
                                        this.renderTarget.width,
                                        this.renderTarget.height
                                    ),
                                    color: new Vec4(0.5, 0.5, 0.5, 1.0),
                                },
                                this.quarteredSquareOutline
                            );
                            this.renderTarget.draw(
                                QUARTERED_SQUARE_PROGRAM,
                                {
                                    cursorPosition: new Vec3(
                                        pos.x, pos.y, pos.z
                                    ),
                                    offset: 
                                    add(offset, new Vec3(0.0, 0.0, -0.01)),
                                    scale: scale,
                                    rotation: rotation,
                                    screenDimensions: 
                                    new IVec2(
                                        this.renderTarget.width,
                                        this.renderTarget.height
                                    ),
                                    color: new Vec4(0.5, 0.5, 0.5, 1.0),
                                },
                                this.quarteredSquareOutline
                            );
                        }
                    }
                }
                gl.disable(gl.DEPTH_TEST);
                gl.disable(gl.BLEND);
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
    getAllNormalsDotLine(r, s, gridDimensions, indexOffsets) {
        let identity = new Quaternion(1.0);
        let offsetVectors = this.getOffsetVectors(
            gridDimensions,
            indexOffsets.ind[0], 
            indexOffsets.ind[1],
            indexOffsets.ind[2],
        );
        return this.getNormalsDotLine(
            identity, r, s, offsetVectors
        );

    }
    /* Given a line, get the plane most perpendicular to it,
    then from an object of given values return the value
    that corresponds to that plane.

    r - Start point of line
    s - End point of line
    gridDimensions - The grid dimensions of the sliced volume data.
    indexOffsets - Offsets of the planes
    values - An object which must contain the following members:
    xy, xz, and yz, which corresponds to their respective planes.
    For the plane that is most perpendicular to the given line,
    the corresponding value will be chosen from this values object.
    */
    getValueCorrespondingToMostPerpendicularPlane(
        r, s, gridDimensions, indexOffsets,
        values
    ) {
        let normalsDotR = this.getAllNormalsDotLine(
            r, s, gridDimensions, indexOffsets);
        let u;
        if (normalsDotR.xy > normalsDotR.xz 
            && normalsDotR.xy > normalsDotR.yz) {
            u = values.xy;
        } else if (normalsDotR.xz > normalsDotR.xy
                    && normalsDotR.xz > normalsDotR.yz) {
            u = values.xz;
        } else if (normalsDotR.yz > normalsDotR.xy
                    && normalsDotR.yz > normalsDotR.xz) {
            u = values.yz;
        }
        return u;
    }
    /* Get the point of intersection of a line on the plane that
    is most perpendicular to the line.

    r - Start point of line
    s - End point of line
    gridDimensions - Grid dimensions of the volume data being sliced
    indexOffsets - Offsets of the planes
    */
    getPositionOnPlanes(r, s, gridDimensions, indexOffsets) {
        let identity = new Quaternion(1.0);
        let offsetVectors = this.getOffsetVectors(
            gridDimensions,
            indexOffsets.ind[0], 
            indexOffsets.ind[1],
            indexOffsets.ind[2],
        );
        let intersection
            = this.getLinePlaneIntersections(
                identity, r, s, offsetVectors
            );
        return this.getValueCorrespondingToMostPerpendicularPlane(
            r, s, gridDimensions, indexOffsets, intersection
        )
    }
    /* Get the point of intersection for two lines on the plane
    most perpendicular to these lines.

    r0 - Start point of first line
    r1 - Start point of second line
    s0 - End point of first line
    s1 - End point of second line
    gridDimensions - Grid dimensions of the volume data being sliced
    indexOffsets - Offsets of the planes
    */
    getPositionOnPlanesFor2Lines(
        r0, r1, s0, s1, gridDimensions, indexOffsets) {
        let identity = new Quaternion(1.0);
        let offsetVectors = this.getOffsetVectors(
            gridDimensions, 
            indexOffsets.ind[0], 
            indexOffsets.ind[1],
            indexOffsets.ind[2],
        );
        let its0
            = this.getLinePlaneIntersections(
                identity, r0, s0, offsetVectors);
        let its1
            = this.getLinePlaneIntersections(
                identity, r1, s1, offsetVectors);
        let normalsDotR = this.getNormalsDotLine(identity, r0, s0);
        let u0, u1;
        if (normalsDotR.xy > normalsDotR.xz 
            && normalsDotR.xy > normalsDotR.yz) {
            u0 = its0.xy;
            u1 = its1.xy;
        } else if (normalsDotR.xz > normalsDotR.xy
                    && normalsDotR.xz > normalsDotR.yz) {
            u0 = its0.xz;
            u1 = its1.xz;
        } else if (normalsDotR.yz > normalsDotR.xy
                    && normalsDotR.yz > normalsDotR.xz) {
            u0 = its0.yz;
            u1 = its1.yz;
        }
        return [u0, u1];
    }
}

