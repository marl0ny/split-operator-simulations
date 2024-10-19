/* Script for managing the 3D simulation. */
import gCanvas from "./canvas.js";
gCanvas.width = gCanvas.height;
import {gl, gMainRenderWindow, TextureParams, Quad,
    IVec2, Vec3, IVec3, Quaternion, Complex, IScalar,
    MultidimensionalDataQuad,
    get2DFrom3DDimensions,
    add, mul, sub, div,
    Vec4,
    saveQuadAsBMPImage} from "./gl-wrappers.js";
import { getShader } from "./shaders.js";
import splitStep3D, {SimulationParameters} from "./split-step3d.js";
import { VolumeRender } from "./volume-render.js";
import { 
    UserEditable3DPotentialProgramContainer,
    UserEditableNonlinearProgramContainer, 
    UserEditable3DKEProgramContainer} from "./user-editable-program.js";
import { sumPowerOfTwo } from "./sum.js";
import { PlanarSlices } from "./planar-slice.js";

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
        this.sketchPotential
            = Quad.makeProgramFromSource(
                getShader("./shaders/sketch/potential3d.frag")
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
        this.uniformColorScale
            = Quad.makeProgramFromSource(
                getShader("./shaders/vol-render/uniform-color-scale.frag")
            );
        this.colorHeightMap1
            = Quad.makeProgramFromSource(
                getShader("./shaders/vol-render/color-height-map1.frag")
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

// let gTimedEvents = [];

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

let gAutoRotationVelocity = 0.0;

function autoRotationVelocityCallback(value) {
    gAutoRotationVelocity = value/10000.0;
    document.getElementById("angularVelLabel").textContent
        = `Auto-rotate = ${gAutoRotationVelocity}`;
}

{
    let angularVelElement
        = document.getElementById("angularVel");
    if (angularVelElement !== null) {
        autoRotationVelocityCallback(angularVelElement.value);
        angularVelElement.addEventListener(
            "input", e => autoRotationVelocityCallback(e.target.value)
        );
    }
}

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
        this.waveFuncVisual = new MultidimensionalDataQuad(
            [...gSimParams.gridDimensions.ind], 
            {...TEX_PARAMS_SIM, format: gl.RGBA32F}
        );
        this.waveFuncVisual2 = new MultidimensionalDataQuad(
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

let gIndexOffset = new IVec3(
    gSimParams.gridDimensions.ind[0]/2,
    gSimParams.gridDimensions.ind[1]/2,
    gSimParams.gridDimensions.ind[2]/2,
);

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
    let oldPlanarFractionalOffset = new Vec3(
        gIndexOffset.ind[0]/oldGridDimensions.ind[0],
        gIndexOffset.ind[1]/oldGridDimensions.ind[1],
        gIndexOffset.ind[2]/oldGridDimensions.ind[2],
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
        'waveFuncVisual': {...newTexParams, format: gl.RGBA32F},
        'waveFuncVisual2': {...newTexParams, format: gl.RGBA32F},
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
    setPlanarOffset(0, oldPlanarFractionalOffset.ind[0]);
    setPlanarOffsetLabel(0, oldPlanarFractionalOffset.ind[0]);
    setPlanarOffset(1, oldPlanarFractionalOffset.ind[1]);
    setPlanarOffsetLabel(1, oldPlanarFractionalOffset.ind[1]);
    setPlanarOffset(2, oldPlanarFractionalOffset.ind[2]);
    setPlanarOffsetLabel(2, oldPlanarFractionalOffset.ind[2]);
}

let gVolRenderNumberOfSlices
    = parseInt(document.getElementById(
        "numberOfSlices"
    ).value);
let gVolRenderSliceWidth
    = parseInt(document.getElementById(
        "sliceSideWidth"
    ).value);
let gVolRender = new VolumeRender(
    new IVec2(gCanvas.height, gCanvas.height),
    new IVec3(gVolRenderSliceWidth, gVolRenderSliceWidth,
              gVolRenderNumberOfSlices)
);

let gPlanarSlices = new PlanarSlices(
    new TextureParams(
        gl.RGBA32F, gCanvas.width, gCanvas.height, true,
        gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, gl.LINEAR, gl.LINEAR
    )
);

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

function sketchPotential(x0, y0, drawStrength) {
    let depth = sketchDepthFunc(gScale*gSketchDepth);
    let r0 = new Vec3(x0, y0, depth);
    let halfOffset = new Vec3(0.5, 0.5, 0.5);
    r0 = scaleRotate(r0);
    let sketchSize = potentialSketchWidth(gSketchWidth);
    if (parseInt(gViewMode) === VIEW_MODE.PLANAR_SLICES) {
        let s0 = scaleRotate(new Vec3(x0, y0, depth + 1.0));
        r0 = gPlanarSlices.getPositionOnPlanes(
            r0, s0, gSimParams.gridDimensions, gIndexOffset);
    }
    gFrames.potential2.draw(
        GLSL_PROGRAMS.sketchPotential,
        {   
            tex: gFrames.potential,
            location: add(r0, halfOffset),
            sigma: new Vec3(sketchSize, sketchSize, sketchSize),
            amplitude: drawStrength,
            texelDimensions2D: 
                get2DFrom3DDimensions(gSimParams.gridDimensions),
            texelDimensions3D: gSimParams.gridDimensions,
        }
    );
    gFrames.potential.draw(GLSL_PROGRAMS.copy, {tex: gFrames.potential2});
}

function drawNewWavePacket(x0, y0, x1, y1, addTo=false) {
    let depth = sketchDepthFunc(gScale*gSketchDepth);
    // console.log(depth);
    let r0 = new Vec3(x0, y0, depth);
    let r1 = new Vec3(x1, y1, depth);
    let halfOffset = new Vec3(0.5, 0.5, 0.5);
    r0 = scaleRotate(r0);
    r1 = scaleRotate(r1);
    if (parseInt(gViewMode) === VIEW_MODE.PLANAR_SLICES) {
        let s0 = scaleRotate(new Vec3(x0, y0, depth + 1.0));
        let s1 = scaleRotate(new Vec3(x1, y1, depth + 1.0));
        [r0, r1] = gPlanarSlices.getPositionOnPlanesFor2Lines(
            r0, r1, s0, s1, gSimParams.gridDimensions, gIndexOffset
        );
    }
    let wavepacketUniforms = {
        amplitude: 1.0,
        waveNumber: getWaveNumber(r0, r1),
        texOffset: add(r0, halfOffset),
        sigma: new Vec3(
            waveFuncSketchWidth(gSketchWidth),
            waveFuncSketchWidth(gSketchWidth),
            waveFuncSketchWidth(gSketchWidth)
        ),
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
            waveNumber: new Vec3(15.0, 0.0, 0.0),
            texOffset: new Vec3(0.25, 0.5, 0.5),
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

let gRotation = mul(Quaternion.rotator(Math.PI/4.0, 0.0, 0.0, 1.0),
                    Quaternion.rotator(-Math.PI/4.0, 1.0, 0.0, 0.0));
let gMouseIdlePosition = [];
let gMouseInteractPosition = [];


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
    if (gScale < 0.05)
        gScale = 0.05;
    if (gScale > 1.0)
        gScale = 1.0;
}

gCanvas.addEventListener("wheel", e => {
    scaleVolume(e.deltaY/400.0);
    gMouseIdlePosition = equalizeXYScaling(getMouseXY(e));
    updateTextPosition(...gMouseIdlePosition);
});

const INPUT_MODES = {NONE: 0, ROTATE_VIEW: 1, NEW_WAVE_FUNC: 2,
                     SKETCH_V: 3, ERASE_V: 4};
let gInputMode = INPUT_MODES.ROTATE_VIEW;

function getButtons() {
    let rotateView = document.getElementById("rotateViewButton");
    let newWaveFunc = document.getElementById("newWaveFuncButton");
    let sketchV = document.getElementById("sketchVButton");
    let eraseV = document.getElementById("eraseVButton");
    return [rotateView, newWaveFunc, sketchV, eraseV];
}

function clearButtonStyles(buttons) {
    for (let b of buttons)
        b.style = ``;
}

function applyDrawButtonPressedStyle(drawButtons) {
    let [rotateView, newWaveFunc, sketchV, eraseV] = drawButtons;
    let style = `background-color: gray;`;
    switch (gInputMode) {
        case INPUT_MODES.ROTATE_VIEW:
            rotateView.style = style;
            break;
        case INPUT_MODES.NEW_WAVE_FUNC:
            newWaveFunc.style = style;
            break;
        case INPUT_MODES.SKETCH_V:
            sketchV.style = style;
            break;
        case INPUT_MODES.ERASE_V:
            eraseV.style = style;
            break;
        default:
            break;
    }
}
applyDrawButtonPressedStyle(getButtons());

function manageButtons() {
    let [rotateView, newWaveFunc, sketchV, eraseV] = getButtons();
    let buttons = [rotateView, newWaveFunc, sketchV, eraseV];
    newWaveFunc.addEventListener(
        "click", () => {
            gInputMode = INPUT_MODES.NEW_WAVE_FUNC;
            clearButtonStyles(buttons);
            applyDrawButtonPressedStyle(buttons);
            refreshSketchSizeDisplay(gSketchWidth, gSketchDepth, gInputMode);
        }
    );
    rotateView.addEventListener(
        "click", () => {
            gInputMode = INPUT_MODES.ROTATE_VIEW;
            clearButtonStyles(buttons);
            applyDrawButtonPressedStyle(buttons);
            refreshSketchSizeDisplay(gSketchWidth, gSketchDepth, gInputMode);
        }
    );
    sketchV.addEventListener(
        "click", () => {
            gInputMode = INPUT_MODES.SKETCH_V;
            clearButtonStyles(buttons);
            applyDrawButtonPressedStyle(buttons);
            refreshSketchSizeDisplay(gSketchWidth, gSketchDepth, gInputMode);
        }
    );
    eraseV.addEventListener(
        "click", () => {
            gInputMode = INPUT_MODES.ERASE_V;
            clearButtonStyles(buttons);
            applyDrawButtonPressedStyle(buttons);
            refreshSketchSizeDisplay(gSketchWidth, gSketchDepth, gInputMode);
        }
    );
}
manageButtons();

function mouseInputFunc(e) {
    if (e.buttons !== 0) {
        if (getMouseXY(e)[0] < 0.0 || getMouseXY(e)[0] > 1.0 ||
            getMouseXY(e)[1] < 0.0 || getMouseXY(e)[0] > 1.0) {
            if (gMouseInteractPosition.length >= 0)
                gMouseInteractPosition = [];
            return;
        }
        if (gInputMode === INPUT_MODES.ROTATE_VIEW) {
            if (gMouseInteractPosition.length === 0) {
                gMouseInteractPosition = equalizeXYScaling(getMouseXY(e));
                return;
            }
            // console.log(gMouseInteractPosition);
            let [x1, y1] = equalizeXYScaling(getMouseXY(e));
            let [x0, y0] = gMouseInteractPosition;
            setRotation(x0, y0, x1, y1);
            gMouseInteractPosition = [x1, y1];
        }
        else if (gInputMode === INPUT_MODES.NEW_WAVE_FUNC) {
            let [x1, y1] = equalizeXYScaling(getMouseXY(e));
            if (gMouseInteractPosition.length === 0) {
                gMouseInteractPosition = [x1, y1];
                drawNewWavePacket(x1, y1, x1, y1);
                return;
            }
            let [x0, y0] = gMouseInteractPosition;
            gMouseIdlePosition = [x0, y0];
            updateTextPosition(x0, y0);
            // displayInitialMomentum(x0, y0, x1, y1);
            drawNewWavePacket(x0, y0, x1, y1);
        }
        else if (gInputMode === INPUT_MODES.SKETCH_V) {
            let [x1, y1] = equalizeXYScaling(getMouseXY(e));
            if (gMouseInteractPosition.length === 0) {
                gMouseInteractPosition = [x1, y1];
            }
            sketchPotential(x1, y1, 0.3);
        }
        else if (gInputMode === INPUT_MODES.ERASE_V) {
            let [x1, y1] = equalizeXYScaling(getMouseXY(e));
            if (gMouseInteractPosition.length === 0) {
                gMouseInteractPosition = [x1, y1];
            }
            sketchPotential(x1, y1, -0.3);
        }
    }
}

gCanvas.addEventListener("mousemove", e => {
    gMouseIdlePosition = equalizeXYScaling(getMouseXY(e));
    updateTextPosition(...gMouseIdlePosition);
    mouseInputFunc(e);
});
gCanvas.addEventListener("mousedown", e => mouseInputFunc(e));

gCanvas.addEventListener("mouseup", () => {
    gMouseInteractPosition = [];
});

document.getElementById("potentialEntry").addEventListener(
    "input", e => {
        gClipPotential = true;
        gTextEditPotential.newText(e.target.value);
    }
);

document.getElementById("aLink").href 
    = "https://github.com/marl0ny/"
    + "split-operator-simulations/tree/new-web-version/js";

const VIEW_MODE = {
    PLANAR_SLICES: 1,
    VOLUME_RENDER: 2
};

let gShowWaveFunction = document.getElementById("showWavefunction").checked;
document.getElementById("showWavefunction").addEventListener(
    "input",
    e => gShowWaveFunction = e.target.checked
);
let gShowWavefunctionPhase
     = document.getElementById("showWavefunctionPhase").checked;
    document.getElementById("showWavefunctionPhase").addEventListener(
    "input",
    e => gShowWavefunctionPhase = e.target.checked
);
let gShowPotential = document.getElementById("showPotential").checked;
document.getElementById("showPotential").addEventListener(
    "input",
    e => gShowPotential = e.target.checked
);

let gViewMode = document.getElementById("viewMode").value;

document.getElementById("viewMode").addEventListener(
    "change", e => {
        gViewMode = e.target.value;
        // console.log(`view mode switched ${e.target.value}`);
    }
);

/* const WAVE_FUNC_BRIGHTNESS_MODE = {
    ABS_VAL: 1, ABS_VAL_SQUARED: 2, INV_ABS_VAL: -1
};*/

let gWaveFunctionBrightnessMode
     = document.getElementById("absPsiVisualization");
document.getElementById("absPsiVisualization").addEventListener(
    "change",
    e => gWaveFunctionBrightnessMode = e.target.value
);

function updateTextPosition(x, y) {
    let depth = sketchDepthFunc(gScale*gSketchDepth);
    let position0 = new Vec3(x, y, depth);
    let position = scaleRotate(position0);
    if (parseInt(gViewMode) === VIEW_MODE.PLANAR_SLICES) {
        let position1 = scaleRotate(new Vec3(x, y, depth + 1));
        position = gPlanarSlices.getPositionOnPlanes(
            position, position1, gSimParams.gridDimensions, gIndexOffset
        );
    }
    let hoveringStatsElement 
        = document.getElementById("hoveringStatsElements");
    hoveringStatsElement.style = `opacity: 1; `
        + `position: absolute; `
        + `top: ${parseInt(gCanvas.offsetTop + 0.95*gCanvas.height)}px; `
        + `left: ${gCanvas.offsetLeft + 210}px`;
    let hoveringStats = document.getElementById("hoveringStats");
    hoveringStats.textContent = 
        `x: ${parseInt((position.x)*gSimParams.dimensions.x)}, `
        + `y: ${parseInt((position.y)*gSimParams.dimensions.y)}, `
        + `z: ${parseInt((position.z)*gSimParams.dimensions.z)}`;
}

function viewData(data, scale, rotation) {
    let extraUniforms = {
        colorBrightness: gVolRenderColorBrightness,
        alphaBrightness: gVolRenderAlphaBrightness
    };
    let view;
    switch(parseInt(gViewMode)) {
        case VIEW_MODE.VOLUME_RENDER:
            view = gVolRender.view(data, scale, rotation, extraUniforms);
            document.getElementById(
                "volumeRenderControls").removeAttribute("hidden");
            document.getElementById(
                "planarSlicesControls").setAttribute("hidden", "true");
            break;
        case VIEW_MODE.PLANAR_SLICES:
            // let [v0, v1] = gPlanarSlices.getXYPlanarVectors(rotation);
            // console.log('v0: (', v0.x, v0.y, v0.z, ')');
            // console.log('v1: (', v1.x, v1.y, v1.z, ')');
            if (gMouseIdlePosition.length !== 0) {
                let [x, y] = gMouseIdlePosition;
                let depth = sketchDepthFunc(gScale*gSketchDepth);
                let position0 = new Vec3(x, y, depth);
                let position = scaleRotate(position0);
                let position1 = scaleRotate(new Vec3(x, y, depth + 1));
                let ray = [position, position1];
                view = gPlanarSlices.view(data, rotation, scale,
                    gIndexOffset.ind[0],
                    gIndexOffset.ind[1],
                    gIndexOffset.ind[2],
                    gSimParams.gridDimensions,
                    ray
                );
            }
            document.getElementById(
                "planarSlicesControls").removeAttribute("hidden");
            document.getElementById(
                "volumeRenderControls").setAttribute("hidden", "true");
            break;
        default:
            break;
    }
    return view;
}


let gClipPotential = true;

let gNormalize = document.getElementById("normalizePsi").checked;
document.getElementById("normalizePsi").addEventListener(
    "input", e => gNormalize = e.target.checked
);

let gTakeScreenshots = (() => {
    let screenshotsElement = document.getElementById("screenshots");
    if (screenshotsElement !== null)
        return document.getElementById("screenshots").checked;
    return false;
})()

{
    let screenshotsElement = document.getElementById("screenshots");
    if (screenshotsElement !== null)
        screenshotsElement.addEventListener(
            "input", e => gTakeScreenshots = e.target.checked);
}

let gWaveFunctionBrightness = 
    document.getElementById("wavefunctionBrightness").value/100.0;
document.getElementById("wavefunctionBrightness").addEventListener(
    "input", e => gWaveFunctionBrightness = e.target.value/100.0 
);
let gPotentialBrightness =
    document.getElementById("potentialBrightness").value/100.0;
document.getElementById("potentialBrightness").addEventListener(
    "input", e => gPotentialBrightness = e.target.value/100.0
);

let gSketchWidth = document.getElementById("sketchWidth").value;
const potentialSketchWidth 
    = sketchWidth => 0.02*sketchWidth/100.0;
let gSketchDepth = document.getElementById("sketchDepth").value;

const waveFuncSketchWidth
    = sketchWidth => 0.05*sketchWidth/100.0 + 0.005;

const sketchDepthFunc
    = sketchDepth => sketchDepth/100.0;

const refreshSketchSizeDisplay = (sketchWidth, sketchDepth, inputMode) => {
    switch(inputMode) {
        case INPUT_MODES.NEW_WAVE_FUNC:
            document.getElementById("sketchWidthLabel").textContent
                = `Sketch size: ${
                    (4.0*gSimParams.gridDimensions.ind[0]
                        *waveFuncSketchWidth(sketchWidth)).toFixed(0)
                }`;
            document.getElementById("sketchDepthLabel").textContent
                = `Sketch depth: ${
                    ((gSimParams.gridDimensions.ind[2])
                        *sketchDepthFunc(sketchDepth)).toFixed(0)
                }`;
            break;
        case INPUT_MODES.SKETCH_V: case INPUT_MODES.ERASE_V:
            document.getElementById("sketchWidthLabel").textContent
                = `Sketch size: ${
                    (4.0*gSimParams.gridDimensions.ind[0]
                        *potentialSketchWidth(sketchWidth)).toFixed(0)
                }`;
            document.getElementById("sketchDepthLabel").textContent
                = `Sketch depth: ${
                    ((gSimParams.gridDimensions.ind[2])
                        *sketchDepthFunc(sketchDepth)).toFixed(0)
                }`;
            break;
        default:
            break;
    }
}

document.getElementById("sketchWidth").addEventListener(
    "input",
    e => {
        gSketchWidth = e.target.value;
        refreshSketchSizeDisplay(gSketchWidth, gSketchDepth, gInputMode);
    }
);

document.getElementById("sketchDepth").addEventListener(
    "input",
    e => {
        gSketchDepth = e.target.value;
        refreshSketchSizeDisplay(gSketchWidth, gSketchDepth, gInputMode);
    }
);

let gVolRenderColorBrightness
     = parseFloat(document.getElementById(
        "volumeRenderColorBrightness").value)/10.0;
document.getElementById("volumeRenderColorBrightness").addEventListener(
    "input", e => {
        gVolRenderColorBrightness = parseFloat(e.target.value)/10.0;
    }
);
let gVolRenderAlphaBrightness
     = parseFloat(document.getElementById(
        "volumeRenderAlphaBrightness").value)/10.0;
document.getElementById("volumeRenderAlphaBrightness").addEventListener(
    "input", e => {
        gVolRenderAlphaBrightness = parseFloat(e.target.value)/10.0;
    }
);


document.getElementById("numberOfSlicesLabel").textContent
    = `Number of slices: ${gVolRenderNumberOfSlices}`;
document.getElementById("numberOfSlices").addEventListener(
    "input", e => {
        let numberOfSlices = parseInt(e.target.value);
        let newDimensions = new IVec3(
            gVolRenderSliceWidth, gVolRenderSliceWidth,
            numberOfSlices);
        try {
            let _ = get2DFrom3DDimensions(newDimensions);
        } catch(e) {
            console.log(e);
            return;
        }
        gVolRenderNumberOfSlices = numberOfSlices;
        document.getElementById("numberOfSlicesLabel").textContent
            = `Number of slices: ${gVolRenderNumberOfSlices}`;
        document.getElementById("sliceSideWidthLabel").textContent
            = `Slice size: ${gVolRenderSliceWidth}x${gVolRenderSliceWidth}`;
        gVolRender.resetVolumeDimensions(newDimensions);
    }
);

document.getElementById("sliceSideWidthLabel").textContent
    = `Slice size: ${gVolRenderSliceWidth}x${gVolRenderSliceWidth}`;
document.getElementById("sliceSideWidth").addEventListener(
    "input", e => {
        let volRenderSliceWidth = parseInt(e.target.value);
        let newDimensions = new IVec3(
            volRenderSliceWidth, volRenderSliceWidth,
            gVolRenderNumberOfSlices
        );
        try {
            let _ = get2DFrom3DDimensions(newDimensions);
        } catch(e) {
            console.log(e);
            return;
        }
        gVolRenderSliceWidth = volRenderSliceWidth;
        document.getElementById("numberOfSlicesLabel").textContent
            = `Number of slices: ${gVolRenderNumberOfSlices}`;
        document.getElementById("sliceSideWidthLabel").textContent
            = `Slice size: ${gVolRenderSliceWidth}x${gVolRenderSliceWidth}`;
        gVolRender.resetVolumeDimensions(newDimensions);
    }
);


function setPlanarOffset(planarIndex, offset) {
    let val = 
    gIndexOffset.ind[planarIndex] 
            = parseInt(offset*gSimParams.gridDimensions.ind[planarIndex]);
}

function setPlanarOffsetLabel(planarIndex, val) {
    let planarIndicesIds = {
        0: "zIndexLabel", 1: "xIndexLabel", 2: "yIndexLabel"};
    let planarIndicesLabel = {
        0: "xy slice - z offset:",
        1: "yz slice - x offset:",
        2: "zx slice - y offset:"
    };
    document.getElementById(planarIndicesIds[planarIndex]).textContent
        = `${planarIndicesLabel[planarIndex]} `
            + `${parseInt(val*gSimParams.dimensions.ind[planarIndex])}`;
}
setPlanarOffsetLabel(0, 0.5);
setPlanarOffsetLabel(1, 0.5);
setPlanarOffsetLabel(2, 0.5);

document.getElementById("zIndex").addEventListener(
    "input",
    e => {
        let val = parseFloat(e.target.value)/256.0;
        setPlanarOffset(0, val);
        setPlanarOffsetLabel(0, val);
    }
);


document.getElementById("xIndex").addEventListener(
    "input",
    e => {
        let val = parseFloat(e.target.value)/256.0;
        setPlanarOffset(1, val);
        setPlanarOffsetLabel(1, val);
    }
);


document.getElementById("yIndex").addEventListener(
    "input",
    e => {
        let val = parseFloat(e.target.value)/256.0;
        setPlanarOffset(2, val);
        setPlanarOffsetLabel(2, val);
    }
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

// class Timer {
//     constructor(time, funcCall) {
//         this.time = time;
//         this.funcCall = funcCall;
//     }
//     tick() {
//         this.time -= 0.1;
//         if (this.time <= 0.0)
//             this.funcCall();
//     }
// }

// class Timers {
//     constructor() {
//         this._timersList = [];
//     }
//     add(timer) {
//         this._timersList.push(timer);
//     }
//     update() {
//         for (let timer of this._timersList) {
//             timer.tick();
//         }
//         let timer = this._timersList.pop();
//         if (timer.time <= 0.0)
//             0
//     }
// }

let gHoveringMessageOpacity = 1.0;

function decreaseOpacityOfHoveringMessage() {
    if (gHoveringMessageOpacity > 0.0) {
        gHoveringMessageOpacity = Math.max(
            0.0, gHoveringMessageOpacity - 0.02
        );
        document.getElementById("hoveringMessageElements").style.opacity
                = `${gHoveringMessageOpacity}`;
    }
}

function showHoveringMessage(message) {
    let hoveringMessageElement 
        = document.getElementById("hoveringMessageElements");
    gHoveringMessageOpacity = 1.0;
    hoveringMessageElement.style = `opacity: ${gHoveringMessageOpacity}; `
        + `position: absolute; `
        + `top: ${parseInt(gCanvas.offsetTop + 0.01*gCanvas.height)}px; `
        + `left: ${gCanvas.offsetLeft + 210}px`;
    let hoveringMessage = document.getElementById("hoveringMessage");
    hoveringMessage.textContent = message;
}

function setPresetPotential(value) {
    const PRESETS = {
        FREE: 0, 
        HARMONIC: 1, 
        DOUBLE_SLIT: 2, 
        SPHERICAL: 3,
        REPULSIVE_COULOMB: 4,
        ATTRACTIVE_COULOMB: 5,
        AB: 6, 
        DOUBLE_SLIT_AB: 7,
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
    let doubleSlit = `2.0*step(-abs(${v}-0.5) + 0.02) ` 
                        + `- 2.0*step(-abs(${v}-0.5) + 0.02)*(`
                            + `step(-abs(${u}-0.5 - separation/20.0) + spacing/50.0)`
                            + `+ step(-abs(${u}-0.5 + separation/20.0) + spacing/50.0))`;
    let spherical
        = `0.5*(tanh(75.0*(((x/width)^2 + (y/height)^2 + (z/depth)^2)^0.5 - 0.45))` 
            + ` + 1.0)`;
    let coulomb = `0.01/((${u}-0.5)^2 + (${v}-0.5)^2 + (${w}-0.5)^2)^0.5`;
    gClipPotential = false;
    switch(parseInt(value)) {
        case PRESETS.FREE:
            gTextEditPotential.newText(`0`);
            break;
        case PRESETS.HARMONIC:
            if (parseInt(gViewMode) === VIEW_MODE.VOLUME_RENDER
                && document.getElementById("showPotential").checked)
                showHoveringMessage(
                    `If render for the selected V is obstructing view, `
                    + `uncheck "Show V(r)"`);
            gTextEditPotential.newText(
                `2.0*abs(strength)*`
                + `((${u}-0.5)^2 + (${v}-0.5)^2 + (${w}-0.5)^2)`);
            break;
        case PRESETS.DOUBLE_SLIT:
            gTextEditPotential.newText(doubleSlit);
            break;
        case PRESETS.SPHERICAL:
            if (parseInt(gViewMode) === VIEW_MODE.VOLUME_RENDER
                && document.getElementById("showPotential").checked)
                showHoveringMessage(
                    `If render for the selected V is obstructing view, `
                    + `uncheck "Show V(r)"`);
            gTextEditPotential.newText(spherical);
            break;
        case PRESETS.REPULSIVE_COULOMB:
            gTextEditPotential.newText(coulomb);
            break;
        case PRESETS.ATTRACTIVE_COULOMB:
            gTextEditPotential.newText(`-1.0*` + coulomb);
            break;
        case PRESETS.AB:
            gTextEditPotential.newText(absorbingBoundary);
            break;
        case PRESETS.DOUBLE_SLIT_AB:
            gTextEditPotential.newText(absorbingBoundary + `+${doubleSlit}`);
            break;
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

function computeNormalizationFactor() {
    gFrames.abs2Psi.draw(
        GLSL_PROGRAMS.abs2, {tex: gFrames.psi1});
    let sum = computeNormSquared(gFrames.abs2Psi, false);
    let width = gSimParams.gridDimensions.ind[0];
    let height = gSimParams.gridDimensions.ind[1];
    let length = gSimParams.gridDimensions.ind[2];
    return [Math.sqrt((width*height*length)/sum), sum];
}

function normalizeWaveFunction() {
    let [normFactor, sum] = computeNormalizationFactor();
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

function applyRotationAlongZAxisOfCubicDomain(angularVel) {
    let axis = Quaternion.rotate(
        new Quaternion(1.0, 0.0, 0.0, 1.0), gRotation);
    let rotationAxis = Quaternion.rotator(angularVel, axis.i, axis.j, axis.k);
    gRotation = mul(gRotation, rotationAxis);
}

function animation() {
    displayAverageFPS();
    refreshPotential();
    refreshKE();
    applyRotationAlongZAxisOfCubicDomain(gAutoRotationVelocity);
    gTextEditNonlinear.refresh(() => {
        gUseNonlinear = true;
    });
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

    if (gShowWaveFunction) {
        if (gShowWavefunctionPhase)
            gFrames.waveFuncVisual.draw(
                GLSL_PROGRAMS.domainColoring,
                {tex: gFrames.psi1,
                 brightness: gWaveFunctionBrightness,
                 brightnessMode: 
                    new IScalar(gWaveFunctionBrightnessMode),
                 }
            );
        else
            gFrames.waveFuncVisual.draw(
                GLSL_PROGRAMS.uniformColorScale,
                {
                    tex: gFrames.abs2Psi,
                    color: new Vec4(0.5, 0.5, 1.0, 1.0),
                    brightness: gWaveFunctionBrightness,
                    brightnessMode:
                        new IScalar(gWaveFunctionBrightnessMode),
                    offset: 0.0, maxBrightness: 3.0
                }
            );
            /* gFrames.waveFuncVisual.draw(
                GLSL_PROGRAMS.colorHeightMap1,
                {
                    tex: gFrames.abs2Psi,
                    brightness: gWaveFunctionBrightness,
                    // brightnessMode:
                    //     new IScalar(gWaveFunctionBrightnessMode),
                    offset: 0.0, maxBrightness: 1.25
                }
            );*/
    }
    if (gShowPotential) {
        gFrames.extra.draw(
            GLSL_PROGRAMS.uniformColorScale,
            {
                tex: gFrames.potential, brightness: gPotentialBrightness,
                offset: 0.0, maxBrightness: 0.5,
                color: new Vec4(1.0, 1.0, 1.0, 1.0)

            }
        );
    }

    let view
    if (gShowWaveFunction && gShowPotential) {
        gFrames.waveFuncVisual2.draw(
            GLSL_PROGRAMS.add2, 
            {
                tex1: gFrames.waveFuncVisual, 
                tex2: gFrames.extra
            }
        );
        view = viewData(gFrames.waveFuncVisual2, 
            gScale, gRotation);
    } else if (gShowPotential) {
        view = viewData(gFrames.extra, gScale, gRotation,
            );
    } else if (gShowWaveFunction) {
        view = viewData(gFrames.waveFuncVisual, 
            gScale, gRotation);
    }
    // withConfig(
    //     {enable: gl.BLEND}, () => {
    // gl.enable(gl.BLEND);
    gFrames.target.draw(
        GLSL_PROGRAMS.scale, {tex: view, scale: 1.0},
        {viewport: [0.5*(gCanvas.width - gCanvas.height), 0,
            gCanvas.height, gCanvas.height]}
    );
    // gl.disable(gl.BLEND);
    // });
    if (gTakeScreenshots) {
        // let url = gCanvas.toDataURL('image/png', 1);
        // let time = Date.now();
        // let aTag = document.createElement('a');
        // aTag.hidden = true;
        // aTag.href = url;
        // aTag.download = `${time}.png`;
        // new Promise(() => aTag.click()).then(() => aTag.remove());
        saveQuadAsBMPImage(document, gFrames.target, null,
            [0, 0, gCanvas.width, gCanvas.height]);
    }
    decreaseOpacityOfHoveringMessage();
    requestAnimationFrame(animation);
}

requestAnimationFrame(animation);