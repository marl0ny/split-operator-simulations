/* Sum the contents of a texture. */
import { gl, Quad, TextureParams } from "./gl-wrappers.js";
import { getShader } from "./shaders.js";


const SCALE_PROGRAM = Quad.makeProgramFromSource(
    getShader("./shaders/util/scale.frag"));

/*let gSumQuads = [];

function refreshPowerOfTwoSumQuads(t) {
    if (gSumQuads.length === 0 || t.width !== gSumQuads[0].width || 
        t.height != gSumQuads[0].height) {
        if (t.width > t.height) {

        } else if (t.height > t.width) {

        } else {

        }
    }
}*/

/* Sum the contents of a quad if its texture's width
and height are equal and its width and height are a
power of two. No checks are done to ensure that the input
quad has these actual properties, in which case this will
not work as intended.
*/
/*export function sumSquarePowerOfTwo(t) {
    // refreshPowerOfTwoSumQuads(t);
    let sideLength = t.width;
    let prev = t;
    let toRecycle = [];
    for (let w = sideLength/2; w >= 1; w /= 2) {
        let s = new Quad (
            new TextureParams(
                (w === 1)? gl.RGBA32F: t.format,
                w, w, true,
                gl.REPEAT, gl.REPEAT,
                gl.LINEAR, gl.LINEAR
            )
        );
        // console.log(s.id);  
        s.draw(SCALE_PROGRAM,
               {tex: prev, scale: 4.0});
        toRecycle.push(s);
        prev = s;
    }
    let arr = prev.asFloat32Array();
    for (let r of toRecycle)
        r.recycle();
    return arr;

}*/

let TEX_PARAM = new TextureParams(
    gl.RGBA8,
    128, 120, true,
    gl.REPEAT, gl.REPEAT,
    gl.LINEAR, gl.LINEAR);
let gSumQuads =  [new Quad(TEX_PARAM), new Quad(TEX_PARAM)];


/* Sum the contents of a quad if its texture's width
and height are equal and its width and height are a
power of two. No checks are done to ensure that the input
quad has these actual properties, in which case this will
not work as intended.
*/
export function sumSquarePowerOfTwo(t) {
    let texParam = new TextureParams(
        t.format, t.width/2, t.width/2, true,
        gl.REPEAT, gl.REPEAT,
        gl.LINEAR, gl.LINEAR);
    for (let w = t.width/2; w >= 1; w /= 2) {
        texParam.width = w;
        texParam.height = w;
        gSumQuads[0].reset(texParam);
        gSumQuads[0].draw(SCALE_PROGRAM,
                         {tex: (w === t.width/2)? t: gSumQuads[1],
                          scale: 4.0});
        gSumQuads = [gSumQuads[1], gSumQuads[0]];
    }
    let arr = gSumQuads[1].asFloat32Array();
    return arr;

}

/* Sum the contents of a quad if its texture width 
and texture height are powers of two. No checks are done
to ensure if this is actually true.
*/
export function sumPowerOfTwo(t) {
    // refreshPowerOfTwoSumQuads(t);
    let arr;
    let toRecycle = [];
    if (t.width === t.height) {
        arr = sumSquarePowerOfTwo(t);
    } else if (t.width > t.height) {
        let prev = t;
        for (let size = t.width/2; size >= t.height; size /= 2) {
            let s = new Quad (
                new TextureParams(
                    (size === 1)? gl.RGBA32F: t.format,
                    size, t.height, true,
                    gl.REPEAT, gl.REPEAT,
                    gl.LINEAR, gl.LINEAR
                )
            );
            // console.log(s.id);
            s.draw(SCALE_PROGRAM,
                {tex: prev, scale: 2.0});
            toRecycle.push(s);
            prev = s;
        }
        arr = sumSquarePowerOfTwo(prev);
    } else if (t.height > t.width) {
        let prev = t;
        for (let size = t.height/2; size >= t.width; size /= 2) {
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