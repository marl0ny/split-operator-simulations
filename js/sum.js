/* Sum the contents of a texture. */
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
        );
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

/* Sum the contents of a quad if its texture width 
and texture height are powers of two. No checks are done
to ensure if this is actually true.
*/
export function sumPowerOfTwo(t) {
    let arr;
    let toRecycle = [];
    if (t.width === t.height) {
        arr = sumSquarePowerOfTwo(t);
    } else if (t.width > t.height) {
        let prev = t;
        for (let size = t.width/2; size > t.height; size /= 2) {
            let s = new Quad (
                new TextureParams(
                    (size === 1)? gl.RGBA32F: t.format,
                    size, t.height, true,
                    gl.REPEAT, gl.REPEAT,
                    gl.LINEAR, gl.LINEAR
                )
            );
            s.draw(SCALE_PROGRAM,
                {tex: prev, scale: 2.0});
            toRecycle.push(s);
            prev = s;
        }
        arr = sumSquarePowerOfTwo(prev);
    } else if (t.height > t.width) {
        let prev = t;
        for (let size = t.height/2; size > t.width; size /= 2) {
            let s = new Quad (
                new TextureParams(
                    (size === 1)? gl.RGBA32F: t.format,
                    t.width, size, true,
                    gl.REPEAT, gl.REPEAT,
                    gl.LINEAR, gl.LINEAR
                )
            );
            s.draw(SCALE_PROGRAM,
                {tex: prev, scale: 2.0});
            toRecycle.push(s);
            prev = s;
        }
        arr = sumSquarePowerOfTwo(prev);
    }
    for (let r of toRecycle)
        r.recycle();
    return arr;
}