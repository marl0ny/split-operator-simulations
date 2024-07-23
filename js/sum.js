// TODO

import { gl, Quad, TextureParams } from "./gl-wrappers.js";
import { getShader } from "./shaders.js";


const SCALE_PROGRAM = Quad.makeProgramFromSource(
    getShader("./shaders/util/scale.frag"));

/* Sum the contents of a quad if its texture's width
and height are equal and its width and height are a
power of two. No checks are done to ensure that the input
quad has these actual properties, in which case this will
not work as intended.
*/
export function sumSquarePowerOfTwo(t) {
    let sideLength = t.width;
    let prev = t;
    for (let w = sideLength/2; w >= 1; w /= 2) {
        let s = new Quad (
            new TextureParams(
                (w === 1)? gl.RGBA32F: t.format,
                w, w, true,
                gl.REPEAT, gl.REPEAT,
                gl.LINEAR, gl.LINEAR
            )
        )
        s.draw(SCALE_PROGRAM,
               {tex: prev, scale: 4.0});
        if (w !== sideLength/2)
            prev.recycle();
        prev = s;
    }
    let arr = prev.asFloat32Array();
    prev.recycle();
    return arr;

}