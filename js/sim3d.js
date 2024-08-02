import gCanvas from "./canvas.js";
import {gl, gMainRenderWindow, TextureParams, Quad,
    IVec2, Vec2, Vec3, IVec3, Quaternion, Complex,
    MultidimensionalDataQuad,
    get2DFrom3DDimensions,
    add, mul, sub, div,
    Vec4} from "./gl-wrappers.js";
import { getShader } from "./shaders.js";
import splitStep3D, {SimulationParameters} from "./split-step3d.js";
import { VolumeRender } from "./volume-render.js";
import { 
    UserEditable3DPotentialProgramContainer,
    UserEditableNonlinearProgramContainer, 
    UserEditable3DKEProgramContainer} from "./user-editable-program.js";
import { sumPowerOfTwo } from "./sum.js";

gCanvas.width = gCanvas.height;

// console.log('2D from 3D (128^3): ', get2DFrom3DDimensions(new IVec3(128, 128, 128)));
// console.log('2D from 3D (256^3): ', get2DFrom3DDimensions(new IVec3(256, 256, 256)));
// console.log('2D from 3D (512^3): ', get2DFrom3DDimensions(new IVec3(512, 512, 512)));

class GLSLPrograms {
    constructor() {
        this.copy
            = Quad.makeProgramFromSource(
                getShader('./shaders/util/copy.frag')
            );
        this.scale
            = Quad.makeProgramFromSource(
                getShader('./shaders/util/scale.frag')
            );
        this.wavePacket
            = Quad.makeProgramFromSource(
                getShader("./shaders/init-wavepacket/gaussian3d.frag")
            );
        this.domainColoring
            = Quad.makeProgramFromSource(
                getShader("./shaders/vol-render/domain-coloring.frag")
            );
        this.grayScale
            = Quad.makeProgramFromSource(
                getShader("./shaders/vol-render/gray-scale.frag")
            );
        this.uniformColor
            = Quad.makeProgramFromSource(
                getShader("./shaders/util/uniform-color.frag")
            );
        this.abs2
            = Quad.makeProgramFromSource(
                getShader("./shaders/util/abs2-xy.frag")
            );
        this.add2
            = Quad.makeProgramFromSource(
                getShader("./shaders/util/add2.frag")
            );
        this.mul
            = Quad.makeProgramFromSource(
                getShader("./shaders/util/mul.frag")
        );
        this.sample3D
            = Quad.makeProgramFromSource(
                getShader("./shaders/util/sample3d.frag")
            );
    }

}

let gTextEditPotential 
    = new UserEditable3DPotentialProgramContainer('potentialUserSliders');
let gTextEditNonlinear
    = new UserEditableNonlinearProgramContainer('nonlinearUserSliders');
let gUseNonlinear = false;
let gTextEditKE
    = new UserEditable3DKEProgramContainer('kineticEnergyUserSliders');


document.getElementById("nonlinearEntry").addEventListener(
    "input", e => {
        gTextEditNonlinear.newText(e.target.value);
    }
);

document.getElementById("kineticEnergyEntry").addEventListener(
    "input", e => gTextEditKE.newText(e.target.value)
);

document.getElementById("presetNonlinear").value = 0;
document.getElementById("presetNonlinear").addEventListener(
    "change", e => setPresetNonlinearity(e.target.value)
);

function setPresetNonlinearity(value) {
    const PRESETS = {
        NONE: 0, DEFOCUSING: 1, FOCUSING: 2, DEFOCUSING_FOCUSING: 3};
    // if (parseInt(value) !== PRESETS.NONE)
    //     setImagTimeStepToNonZeroIfZero(-25.0);
    switch(parseInt(value)) {
        case PRESETS.NONE:
            gTextEditNonlinear.newText(`0.0`);
            break;
        case PRESETS.DEFOCUSING:
            gTextEditNonlinear.newText(
                `1000*abs(a*psi)^2`
            );
            break;
        case PRESETS.FOCUSING:
            gTextEditNonlinear.newText(
                `a*exp(-abs(psi)^2/0.01^2)`
            );
            break;
        case PRESETS.DEFOCUSING_FOCUSING:
            gTextEditNonlinear.newText(
                `100*abs(a*psi)^2 + b*exp(-abs(psi)^2/0.01^2)`
            );
            break;
        default:
            break;
    }
}


const GLSL_PROGRAMS = new GLSLPrograms();

let gSimParams = new SimulationParameters(
    1.0, 1.0, new Complex(0.64, 0.0),
    // new Vec3(64.0, 64.0, 64.0),
    // new IVec3(64, 64, 64),
    new Vec3(128.0, 128.0, 128.0),
    new IVec3(128, 128, 128)
);

function timeStepRealCallback(value) {
    let reDt = value/100.0;
    gSimParams.dt.real = reDt;
    document.getElementById("timeStepRealLabel").textContent
        = `Re(\u0394t) = ${reDt}`;
}

function timeStepImagCallback(value) {
    /* if (Number.parseFloat(value) < 0.0) {
        gNormalize = true;
        document.getElementById("normalizePsi").checked = true;
        document.getElementById(
            "normalizePsi").setAttribute('disabled', true);
    }
    if (Number.parseFloat(value) >= 0.0) {
        document.getElementById("normalizePsi").removeAttribute("disabled");
    }*/
    let imDt = value/1000.0;
    gSimParams.dt.imag = imDt;
    document.getElementById("timeStepImagLabel").textContent
        = `Im(\u0394t) = ${imDt}`;
}


timeStepRealCallback(document.getElementById("timeStepReal").value);
document.getElementById("timeStepReal").addEventListener(
    "input", e => timeStepRealCallback(e.target.value)
);

timeStepImagCallback(document.getElementById("timeStepImag").value);
document.getElementById("timeStepImag").addEventListener(
    "input", e => timeStepImagCallback(e.target.value)
);

const TEX_PARAMS_SIM = new TextureParams(
    (gl.version === 2)? gl.RG32F: gl.RGBA32F,
    get2DFrom3DDimensions(gSimParams.gridDimensions).ind[0],
    get2DFrom3DDimensions(gSimParams.gridDimensions).ind[1],
    true, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE,
    gl.LINEAR, gl.LINEAR
);

class Frames {
    constructor() {
        this.target = gMainRenderWindow;
        this.kineticEnergy = null,
        this.potential = new MultidimensionalDataQuad(
            [...gSimParams.gridDimensions.ind], TEX_PARAMS_SIM
        );
        this.potential2 = new MultidimensionalDataQuad(
            [...gSimParams.gridDimensions.ind], TEX_PARAMS_SIM
        );
        this.nonlinearTerm = new MultidimensionalDataQuad(
            [...gSimParams.gridDimensions.ind], TEX_PARAMS_SIM
        )
        this.psi1 = new MultidimensionalDataQuad(
            [...gSimParams.gridDimensions.ind], TEX_PARAMS_SIM
        );
        this.psi2 = new MultidimensionalDataQuad(
            [...gSimParams.gridDimensions.ind], TEX_PARAMS_SIM
        );
        this.extra = new MultidimensionalDataQuad(
            [...gSimParams.gridDimensions.ind],
            {...TEX_PARAMS_SIM, format: gl.RGBA32F}
        );
        this.domainColorVolData = new MultidimensionalDataQuad(
            [...gSimParams.gridDimensions.ind], 
            {...TEX_PARAMS_SIM, format: gl.RGBA32F}
        );
        this.domainColorVolData2 = new MultidimensionalDataQuad(
            [...gSimParams.gridDimensions.ind], 
            {...TEX_PARAMS_SIM, format: gl.RGBA32F}
        );
        this.abs2Psi = new MultidimensionalDataQuad(
            [...gSimParams.gridDimensions.ind],
            {...TEX_PARAMS_SIM, format: gl.RGBA32F}
        );
        this.abs2Psi2 = new MultidimensionalDataQuad(
            [...gSimParams.gridDimensions.ind],
            {...TEX_PARAMS_SIM, format: gl.RGBA32F} 
        );
    }
}

function changeGridSize(width, height, length) {
    if (width === gSimParams.dimensions.ind[0] &&
        height === gSimParams.dimensions.ind[1] &&
        length === gSimParams.dimensions.ind[2])
        return;
    let oldGridDimensions = new IVec3(
        gSimParams.gridDimensions.ind[0],
        gSimParams.gridDimensions.ind[1],
        gSimParams.gridDimensions.ind[2]
    );
    gSimParams.dimensions.ind[0] = width;
    gSimParams.dimensions.ind[1] = height;
    gSimParams.dimensions.ind[2] = length;
    gSimParams.gridDimensions.ind[0] = width;
    gSimParams.gridDimensions.ind[1] = height;
    gSimParams.gridDimensions.ind[2] = length;
    let newTexDimensions = get2DFrom3DDimensions(
        gSimParams.gridDimensions
    );
    let newTexParams = {...TEX_PARAMS_SIM, 
        width: newTexDimensions.ind[0],
        height: newTexDimensions.ind[1]};
    let framesNewTex = {
        'psi1': newTexParams,
        'psi2': newTexParams,
        // 'psiP': newTexParams,
        'abs2Psi': {...newTexParams, format: gl.RGBA32F},
        'abs2Psi2': {...newTexParams, format: gl.RGBA32F},
        // 'extra': {...newTexParams, format: gl.RGBA32F},
        'nonlinearTerm': newTexParams,
        'potential': newTexParams,
        'potential2': newTexParams,
        'kineticEnergy': newTexParams,
        'domainColorVolData': {...newTexParams, format: gl.RGBA32F},
        'domainColorVolData2': {...newTexParams, format: gl.RGBA32F},
    };
    gFrames['extra'].reset(
        [...gSimParams.gridDimensions.ind], 
        {...newTexParams, format: gl.RGBA32F});
    for (let k of Object.keys(framesNewTex)) {
        if (gFrames[k] !== null) {
            gFrames['extra'].draw(GLSL_PROGRAMS.sample3D, 
                {
                    tex: gFrames[k],
                    sourceTexelDimensions3D: oldGridDimensions,
                    sourceTexelDimensions2D:
                        get2DFrom3DDimensions(oldGridDimensions),
                    destinationTexelDimensions2D: 
                        get2DFrom3DDimensions(gSimParams.gridDimensions),
                    destinationTexelDimensions3D: gSimParams.gridDimensions,

                });
            gFrames[k].reset([...gSimParams.gridDimensions.ind], framesNewTex[k]);
            gFrames[k].draw(GLSL_PROGRAMS.copy, 
                {
                    tex: gFrames['extra'],
                });
        }
    }
}

let gVolRender = new VolumeRender(
    new IVec2(gCanvas.height, gCanvas.height),
    new IVec3(256, 256, 512)
)

let gFrames = new Frames();

let gStepsPerFrame = Number.parseInt(
    document.getElementById("stepsPerFrame").value);
document.getElementById("stepsPerFrameLabel").textContent 
    = `Updates/frame: ${gStepsPerFrame}`;
document.getElementById("stepsPerFrame").addEventListener(
    "input",
    e => {
        gStepsPerFrame = Number.parseInt(e.target.value);
        document.getElementById("stepsPerFrameLabel").textContent
            = `Updates/frame: ${gStepsPerFrame}`;
    }
);

function getWaveNumber(r0, r1) {
    let d = mul(gSimParams.gridDimensions.ind[0], sub(r1, r0));
    let dLen = Math.min(d.length(), 
            gSimParams.gridDimensions.ind[0]/4.0);
    if (dLen !== 0.0) {
        let dNorm = div(d, d.length());
        d = mul(dLen, dNorm);
    }
    return d;
}

function scaleRotate(r) {
    let r2 = sub(r, new Vec3(0.5, 0.5, 0.0));
    let q = Quaternion.rotate(
        new Quaternion(1.0, r2.x, r2.y, r2.z), gRotation.conj());
    return new Vec3(q.i/gScale, q.j/gScale, q.k/gScale);
}

function drawNewWavePacket(x0, y0, x1, y1, addTo=false) {
    let r0 = new Vec3(x0, y0, 0.0);
    let r1 = new Vec3(x1, y1, 0.0);
    let halfOffset = new Vec3(0.5, 0.5, 0.5);
    r0 = scaleRotate(r0);
    r1 = scaleRotate(r1);
    let wavepacketUniforms = {
        amplitude: 1.0,
        waveNumber: getWaveNumber(r0, r1),
        texOffset: add(r0, halfOffset),
        sigmaXY: new Vec3(0.05, 0.05, 0.05),
        texelDimensions2D: 
            get2DFrom3DDimensions(gSimParams.gridDimensions),
        texelDimensions3D: gSimParams.gridDimensions}
    if (addTo) {
        gFrames.extra.draw(
            GLSL_PROGRAMS.wavePacket, wavepacketUniforms);
        gFrames.psi2.draw(
            GLSL_PROGRAMS.add2,
            {tex1: gFrames.psi1,
             tex2: gFrames.extra} 
        );
        return;

    }
    gFrames.psi1.draw(
        GLSL_PROGRAMS.wavePacket, wavepacketUniforms);
    /* if (gStepsPerFrame === 0 && gShowPsiP) {
        fft2D(gFrames.psi2, gFrames.psi1);
        fftShift(gFrames.psiP, gFrames.psi2);
    }*/
    gFrames.psi2.draw(
        GLSL_PROGRAMS.wavePacket, wavepacketUniforms);
}

document.getElementById("changeGrid").value
    = Number.parseInt(gSimParams.gridDimensions.ind[0]);
document.getElementById("changeGrid").addEventListener("change",
    e => {
        let size = Number.parseInt(e.target.value);
        changeGridSize(size, size, size);
        /* document.getElementById("xRangeLabel").textContent 
        = `-${gSimParams.gridDimensions.ind[0]/2} \u2264 `
            + `x < ${gSimParams.gridDimensions.ind[0]/2}`;
        document.getElementById("yRangeLabel").textContent 
        = `-${gSimParams.gridDimensions.ind[1]/2} \u2264 y < `
            + `${gSimParams.gridDimensions.ind[1]/2}`;*/
    }
)


function initialStep() {
    gFrames.psi1.draw(
        GLSL_PROGRAMS.wavePacket, 
        {
            amplitude: 1.0,
            waveNumber: new Vec3(0.0, 10.0, 0.0),
            texOffset: new Vec3(0.5, 0.5, 0.5),
            // sigma: new Vec3(0.25, 0.25, 0.25),
            sigma: new Vec3(0.05, 0.05, 0.05),
            texelDimensions3D: gFrames.psi1.dimensions3D,
            texelDimensions2D: gFrames.psi1.textureDimensions,
        }
    );
    gFrames.potential.draw(
        GLSL_PROGRAMS.uniformColor,
        {
            color: new Vec4(0.0, 0.0, 0.0, 0.0)
        }
    );
    splitStep3D(gFrames.psi2, gFrames.psi1,
                gFrames.kineticEnergy,
                gFrames.potential, gSimParams, null);
    [gFrames.psi1, gFrames.psi2] 
         = [gFrames.psi2, gFrames.psi1];
}
initialStep();

let gScale = 1.0;

let gUserTime = 0.0;
let gUserDeltaTs = [];
function displayAverageFPS() {
    let time = performance.now();
    let deltaT = (time - gUserTime)/1000.0;
    gUserDeltaTs.push(deltaT);
    let elapsedT;
    // let stopT = 0.5;
    if ((elapsedT = gUserDeltaTs.reduce((a, b) => a + b)) > 0.25) {
        document.getElementById("fps").textContent 
            = `fps: ${ Math.floor(gUserDeltaTs.length/elapsedT)}`;
        gUserDeltaTs = [];
    }
    gUserTime = time;
}

let gRotation = Quaternion.rotator(Math.PI/4.0, 0.0, 0.0, 1.0);
let gMousePosition = [];


function setRotation(x0, y0, x1, y1) {
    let d = new Vec3(x1 - x0, y1 - y0, 0.0);
    let axis = Vec3.crossProd(d, new Vec3(0.0, 0.0, -1.0));
    let angle = 10.0*Math.sqrt(d.x*d.x + d.y*d.y + d.z*d.z);
    // console.log(angle, '\naxis: ', axis.x, axis.y, 
    //             '\nquaternion: ', gRotation);
    let rot = Quaternion.rotator(angle, axis.x, axis.y, axis.z);
    gRotation = mul(gRotation, rot);  
}

function getMouseXY(e) {
    let x = (e.clientX - gCanvas.offsetLeft)/gCanvas.width;
    let y = 1.0 - (e.clientY - gCanvas.offsetTop)/gCanvas.height;
    return [x, y];
}

function equalizeXYScaling(xy) {
    let canvasWidth = gCanvas.width;
    let canvasHeight = gCanvas.height;
    let x0 = xy[0], y0 = xy[1];
    if (canvasWidth >= canvasHeight) {
        let offset = ((canvasWidth - canvasHeight)/2.0)/canvasWidth;
        let x1 = (x0 - offset)*canvasWidth/canvasHeight;
        return [x1, y0];
    }
    else {
        let offset = ((canvasHeight - canvasWidth)/2.0)/canvasHeight;
        let y1 = (y0 - offset)*canvasHeight/canvasWidth;
        return [x0, y1];
    }
}

function scaleVolume(scaleVal) {
    gScale -= scaleVal;
    if (gScale < 0.1)
        gScale = 0.1;
    if (gScale > 1.0)
        gScale = 1.0;
}

gCanvas.addEventListener("wheel", e => {
    scaleVolume(e.deltaY/400.0);
});

const INPUT_MODES = {NONE: 0, ROTATE_VIEW: 1, NEW_WAVE_FUNC: 2};
let gInputMode = INPUT_MODES.ROTATE_VIEW;

function getButtons() {
    let rotateView = document.getElementById("rotateViewButton");
    let newWaveFunc = document.getElementById("newWaveFuncButton");
    return [rotateView, newWaveFunc];
}

function clearButtonStyles(buttons) {
    for (let b of buttons)
        b.style = ``;
}

function applyDrawButtonPressedStyle(drawButtons) {
    let [rotateView, newWaveFunc] = drawButtons;
    let style = `background-color: gray;`;
    switch (gInputMode) {
        case INPUT_MODES.ROTATE_VIEW:
            rotateView.style = style;
            break;
        case INPUT_MODES.NEW_WAVE_FUNC:
            newWaveFunc.style = style;
            break;
        default:
            break;
    }
}
applyDrawButtonPressedStyle(getButtons());

function manageButtons() {
    let [rotateView, newWaveFunc] = getButtons();
    let buttons = [rotateView, newWaveFunc];
    newWaveFunc.addEventListener(
        "click", () => {
            gInputMode = INPUT_MODES.NEW_WAVE_FUNC;
            clearButtonStyles(buttons);
            applyDrawButtonPressedStyle(buttons);
        }
    );
    rotateView.addEventListener(
        "click", () => {
            gInputMode = INPUT_MODES.ROTATE_VIEW;
            clearButtonStyles(buttons);
            applyDrawButtonPressedStyle(buttons);
        }
    )
}
manageButtons();

function mouseInputFunc(e) {
    if (e.buttons !== 0) {
        if (getMouseXY(e)[0] < 0.0 || getMouseXY(e)[0] > 1.0 ||
            getMouseXY(e)[1] < 0.0 || getMouseXY(e)[0] > 1.0) {
            if (gMousePosition.length >= 0)
                gMousePosition = [];
            return;
        }
        if (gInputMode === INPUT_MODES.ROTATE_VIEW) {
            if (gMousePosition.length === 0) {
                gMousePosition = equalizeXYScaling(getMouseXY(e));
                return;
            }
            // console.log(gMousePosition);
            let [x1, y1] = equalizeXYScaling(getMouseXY(e));
            let [x0, y0] = gMousePosition;
            setRotation(x0, y0, x1, y1);
            gMousePosition = [x1, y1];
        }
        else if (gInputMode === INPUT_MODES.NEW_WAVE_FUNC) {
            let [x1, y1] = equalizeXYScaling(getMouseXY(e));
            if (gMousePosition.length === 0) {
                gMousePosition = [x1, y1];
                drawNewWavePacket(x1, y1, x1, y1);
                return;
            }
            let [x0, y0] = gMousePosition;
            // displayInitialMomentum(x0, y0, x1, y1);
            drawNewWavePacket(x0, y0, x1, y1);
        }
    }
}

gCanvas.addEventListener("mousemove", e => mouseInputFunc(e));
gCanvas.addEventListener("mousedown", e => mouseInputFunc(e));

gCanvas.addEventListener("mouseup", () => {
    gMousePosition = [];
});

document.getElementById("potentialEntry").addEventListener(
    "input", e => {
        gClipPotential = true;
        gTextEditPotential.newText(e.target.value);
    }
);

const VIEW_MODE = {
    SHOW_PSI: 1,
    SHOW_V: 2,
    SHOW_PSI_V: 3,

};

let gViewMode = document.getElementById("viewMode").value;

document.getElementById("viewMode").addEventListener(
    "change", e => {
        gViewMode = e.target.value;
        console.log(`view mode switched ${e.target.value}`);
    }
);


let gClipPotential = true;

let gNormalize = document.getElementById("normalizePsi").checked;
document.getElementById("normalizePsi").addEventListener(
    "input", e => gNormalize = e.target.checked
);

function refreshPotential() {
    gTextEditPotential.refresh(() => {
        gFrames.potential.draw(
            gTextEditPotential.program, 
            {...gTextEditPotential.uniforms,
                texelDimensions3D: gSimParams.gridDimensions,
                texelDimensions2D: 
                    get2DFrom3DDimensions(gSimParams.gridDimensions),
                width: new Complex(gSimParams.gridDimensions.ind[0], 0.0),
                height: new Complex(gSimParams.gridDimensions.ind[1], 0.0),
                depth: new Complex(gSimParams.gridDimensions.ind[2], 0.0),
                applyClipping: gClipPotential}
        );
    });
    if (gTextEditPotential.isTimeDependent) {
        gFrames.potential.draw(
            gTextEditPotential.program,
            {...gTextEditPotential.uniforms, t: gSimParams.t,
                texelDimensions3D: gSimParams.gridDimensions,
                texelDimensions2D: 
                    get2DFrom3DDimensions(gSimParams.gridDimensions),
                width: new Complex(gSimParams.gridDimensions.ind[0], 0.0),
                height: new Complex(gSimParams.gridDimensions.ind[1], 0.0),
                depth: new Complex(gSimParams.gridDimensions.ind[2], 0.0),
                applyClipping: gClipPotential
            }
        );
    }
}

function setPresetPotential(value) {
    const PRESETS = {
        FREE: 0, 
        HARMONIC: 1, 
        // DOUBLE_SLIT: 2, 
        // CIRCULAR: 3,
        REPULSIVE_COULOMB: 4,
        ATTRACTIVE_COULOMB: 5,
        AB: 6, 
        // DOUBLE_SLIT_AB: 7,
        REPULSIVE_COULOMB_AB: 8,
        ATTRACTIVE_COULOMB_AB: 9,
        MOVING_BUMP: 10, 
        // MOVING_ATTRACTIVE_SPIKE_AB: 11,
        // ATTRACTIVE_MOVING_BUMP_AB: 12,
        // ROTATING_HARMONIC: 13
    };
    let u = `(x/width + 0.5)`;
    let v = `(y/height + 0.5)`;
    let w = `(z/depth + 0.5)`;
    let absorbingBoundary = 
        `-i*(exp(-${u}^2/0.001) + exp(-(${u}-1.0)^2/0.001)`
        + `+ exp(-${v}^2/0.001) + exp(-(${v}-1.0)^2/0.001)`
        + `+ exp(-${w}^2/0.001) + exp(-(${w}-1.0)^2/0.001))`;
    /* let doubleSlit = `step(-abs(${v}-0.5) + 0.02) ` 
                        + `- step(-abs(${v}-0.5) + 0.02)*(`
                            + `step(-abs(${u}-0.45) + 0.02)`
                            + `+ step(-abs(${u}-0.55) + 0.02))`;
    let circular
        = `0.5*(tanh(75.0*(((x/width)^2 + (y/height)^2)^0.5 - 0.45))` 
            + ` + 1.0)`;*/
    let coulomb = `0.01/((${u}-0.5)^2 + (${v}-0.5)^2 + (${w}-0.5)^2)^0.5`;
    gClipPotential = false;
    switch(parseInt(value)) {
        case PRESETS.FREE:
            gTextEditPotential.newText(`0`);
            break;
        case PRESETS.HARMONIC:
            gTextEditPotential.newText(
                `2.0*abs(strength)*`
                + `((${u}-0.5)^2 + (${v}-0.5)^2 + (${w}-0.5)^2)`);
            break;
        /* case PRESETS.DOUBLE_SLIT:
            gTextEditPotential.newText(doubleSlit);
            break;
        case PRESETS.CIRCULAR:
            gTextEditPotential.newText(circular);
            break;*/
        case PRESETS.REPULSIVE_COULOMB:
            gTextEditPotential.newText(coulomb);
            break;
        case PRESETS.ATTRACTIVE_COULOMB:
            gTextEditPotential.newText(`-1.0*` + coulomb);
            break;
        case PRESETS.AB:
            gTextEditPotential.newText(absorbingBoundary);
            break;
        /* case PRESETS.DOUBLE_SLIT_AB:
            gTextEditPotential.newText(absorbingBoundary + `+${doubleSlit}`);
            break;*/
        case PRESETS.REPULSIVE_COULOMB_AB:
            gTextEditPotential.newText(
                absorbingBoundary + `+${coulomb}`);
            break;
        case PRESETS.ATTRACTIVE_COULOMB_AB:
            gTextEditPotential.newText(
                absorbingBoundary + `-1.0*` + `${coulomb}`);
            break;
        case PRESETS.MOVING_BUMP:
            gTextEditPotential.newText(
                `2*exp(-0.5*((x - 0.3*width*cos(t/100))^2 + `
                + `(y - 0.3*height*sin(t/100))^2)/(width*5/256)^2)`
            );
            break;
        /* case PRESETS.MOVING_ATTRACTIVE_SPIKE_AB:
            gTextEditPotential.newText(
                absorbingBoundary 
                + `-0.01/((${u}- 0.5 - 0.1*cos(t/100))^2 `
                + `+ (${v}- 0.5 - 0.1*sin(t/100))^2)^0.5`
            );
            break;
        case PRESETS.ATTRACTIVE_MOVING_BUMP_AB:
            gTextEditPotential.newText(
                absorbingBoundary 
                + `- 2*exp(-0.5*((x - 0.15*r*width*cos(t/100))^2 + `
                + `(y - 0.15*r*height*sin(t/100))^2)/(0.1*width)^2)`
            );
            break;
        case PRESETS.ROTATING_HARMONIC:
            let x2 = `x*cos(t/20)/width+y*sin(t/20)/height`;
            let y2 = `-x*sin(t/20)/width+y*cos(t/20)/height`;
            gTextEditPotential.newText(
                `5.0*(1.05*(${x2}))^2 + (${y2})^2`
            );
            break;*/
        default:
            break;
    }
}

setPresetPotential(document.getElementById("presetPotential").value);
document.getElementById("presetPotential").addEventListener(
    "change", e => setPresetPotential(e.target.value)
);

document.getElementById("kineticEnergyEntry").addEventListener(
    "input", e => gTextEditKE.newText(e.target.value)
);

function computeNormSquared(probQuad, useCPU) {
    if (!useCPU) {
        let sumArr = sumPowerOfTwo(probQuad);
        return sumArr[0];
    }
    let arr = probQuad.asFloat32Array();
    let sum = 0.0;
    let texSize = probQuad.channelCount();
    for (let i = 0; i < arr.length/texSize; i++)
        sum += arr[i*texSize];
    return sum;
}

function normalizeWaveFunction() {
    gFrames.abs2Psi.draw(
        GLSL_PROGRAMS.abs2, {tex: gFrames.psi1});
    let sum = computeNormSquared(gFrames.abs2Psi, false);
    let width = gSimParams.gridDimensions.ind[0];
    let height = gSimParams.gridDimensions.ind[1];
    let length = gSimParams.gridDimensions.ind[2];
    let normFactor = Math.sqrt((width*height*length)/sum);
    // console.log(`Width and height: ${width}x${height}`);
    // console.log('Total sum: ', sum);
    // console.log('Normalization factor: ', normFactor);
    if (Number.isNaN(sum) || sum === 0.0 
        || normFactor === 0.0)
        return;
    if (gUserDeltaTs.length === 0) {
        console.log('|\u03A8|^2: ', normFactor);
    }
    gFrames.psi2.draw(GLSL_PROGRAMS.scale,
        {tex: gFrames.psi1, 
            scale: normFactor});
    gFrames.psi1.draw(
       GLSL_PROGRAMS.copy, {tex: gFrames.psi2});
}

function refreshKE() {
    gTextEditKE.refresh(() => {
        if (gFrames.kineticEnergy === null)
            gFrames.kineticEnergy = new MultidimensionalDataQuad(
                [...gSimParams.gridDimensions.ind], TEX_PARAMS_SIM);
        gFrames.kineticEnergy.draw(
            gTextEditKE.program,
            {...gTextEditKE.uniforms, 
            m: new Complex(gSimParams.m, 0.0), t: gSimParams.t,
            dimensions3D: gSimParams.dimensions,
            texelDimensions2D:
                get2DFrom3DDimensions(gSimParams.gridDimensions),
            texelDimensions3D: gSimParams.gridDimensions
            }

        );
    });
}

function animation() {
    displayAverageFPS();
    refreshPotential();
    refreshKE();
    gTextEditNonlinear.refresh(() => {
        gUseNonlinear = true;
    });
    // gTextEditKE.
    for (let i = 0; i < gStepsPerFrame; i++) {
        let potential = gFrames.potential;
        if (gUseNonlinear) {
            let normFactor
                = 1.0/Math.sqrt(gSimParams.gridDimensions.ind[0]
                                *gSimParams.gridDimensions.ind[1]
                                *gSimParams.gridDimensions.ind[2]);
            gFrames.nonlinearTerm.draw(
                gTextEditNonlinear.program, 
                {
                    ...gTextEditNonlinear.uniforms, 
                    psiTex: gFrames.psi1,
                    normFactor: normFactor,
                }
            );
            gFrames.potential2.draw(
                GLSL_PROGRAMS.add2, 
                {
                    tex1: gFrames.potential,
                    tex2: gFrames.nonlinearTerm
                }
            );
            potential = gFrames.potential2;
        }
        splitStep3D(gFrames.psi2, gFrames.psi1,
                    gFrames.kineticEnergy,
                    potential, gSimParams);
        [gFrames.psi1, gFrames.psi2] 
            = [gFrames.psi2, gFrames.psi1];
        gSimParams.t.real += gSimParams.dt.real;
    }
    if (gNormalize)
        normalizeWaveFunction();
    gFrames.abs2Psi.draw(
        GLSL_PROGRAMS.abs2, {tex: gFrames.psi1}
    );
    let view;
    // console.log('view mode: ', gViewMode);
    switch(parseInt(gViewMode)) {
        case VIEW_MODE.SHOW_PSI:
            gFrames.domainColorVolData.draw(
                GLSL_PROGRAMS.domainColoring,
                {tex: gFrames.psi1, brightness: 1.0}
            );
            view = gVolRender.view(gFrames.domainColorVolData, gScale, gRotation);
            break;
        case VIEW_MODE.SHOW_V:
            gFrames.extra.draw(
                GLSL_PROGRAMS.grayScale,
                {
                    tex: gFrames.potential, brightness: 0.1,
                    offset: 0.0, maxBrightness: 0.5
                }
            );
            view = gVolRender.view(gFrames.extra, gScale, gRotation);
            break;
        default:
            gFrames.domainColorVolData.draw(
                GLSL_PROGRAMS.domainColoring,
                {tex: gFrames.psi1, brightness: 1.0}
            );
            gFrames.extra.draw(
                GLSL_PROGRAMS.grayScale,
                {
                    tex: gFrames.potential, brightness: 1.0,
                    offset: 0.0, maxBrightness: 0.5
                }
            );
            gFrames.domainColorVolData2.draw(
                GLSL_PROGRAMS.add2, 
                {
                    tex1: gFrames.domainColorVolData, 
                    tex2: gFrames.extra
                }
            )
            view = gVolRender.view(gFrames.domainColorVolData2, gScale, gRotation);
            break;
    }
    // let view = gVolRender.view(gFrames.domainColorVolData, gScale, gRotation);
    // let view = gVolRender.view(gFrames.extra, gScale, gRotation);
    gFrames.target.draw(
        GLSL_PROGRAMS.scale, {tex: view, scale: 1.0},
        {viewport: [0.5*(gCanvas.width - gCanvas.height), 0, 
            gCanvas.height, gCanvas.height]}
    );
    requestAnimationFrame(animation);
}

requestAnimationFrame(animation);