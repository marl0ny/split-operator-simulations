/* Script for creating a surface plot render.*/
import { gl, Attribute, 
    TrianglesFrame, makeProgramFromSources } from "./gl-wrappers.js";
import { getShader } from "./shaders.js";

function getVerticesElements(width, height) {
    let elements = [];
    let vertices = [];
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            let vertex = [(i + 0.5)/width, (j + 0.5)/height];
            vertex.forEach(e => vertices.push(e));
            if (i < (width - 1) && j < (height - 1)) {
                let triangle1 = [
                    j + i*width, j + 1 + i*width, j + 1 + (i + 1)*width];
                let triangle2 = [
                    j + 1 + (i + 1)*width, j + (i + 1)*width, j + i*width];
                triangle1.forEach(e => elements.push(e));
                triangle2.forEach(e => elements.push(e));
            }
        }
    }
    return [new Float32Array(vertices), 
            (gl.version === 2)? 
            new Int32Array(elements): new Uint16Array(elements)];
}

export default function makeSurface(width, height) {
    let [vertices, elements] = getVerticesElements(width, height);
    return new TrianglesFrame({"position": new Attribute(2, gl.FLOAT, false)},
                              vertices, elements);
}

export function makeSurfaceProgram(fragmentShaderSource) {
    return makeProgramFromSources(getShader("./shaders/surface/vert.vert"), 
                                  fragmentShaderSource);
}

