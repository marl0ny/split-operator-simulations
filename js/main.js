import { gl, gCanvas, TextureParams, RenderTarget, 
         Quad, Vec2, IVec2, IVec3, Vec3, Vec4, Complex,
         Quaternion, mul, add, div,
         withConfig,
         get3DFrom2DTextureCoordinates,
         sub} from "./gl-wrappers.js";
import splitStep, { 
    initializeDefaultKineticEnergy, SimulationParameters 
} from "./split-step.js";
import makeSurface, { makeSurfaceProgram } from "./surface.js";
import { 
    UserEditablePotentialProgramContainer,
    UserEditableNonlinearProgramContainer, 
    UserEditableKEProgramContainer} from "./user-editable-program.js";
import { getShader } from "./shaders.js";
import { sumSquarePowerOfTwo } from "./sum.js";
import Touches from "./touch-manager.js";


class MainGLSLPrograms {
    constructor() {
        this.surfaceWaveFunc
            = makeSurfaceProgram(
                getShader('./shaders/surface-domain-coloring.frag'));
        this.surfacePotential
            = makeSurfaceProgram(
                getShader('./shaders/surface-single-color.frag'));
        this.copy
            = Quad.makeProgramFromSource(getShader('./shaders/copy.frag'));
        this.wavePacket
            = Quad.makeProgramFromSource(
                getShader('./shaders/wavepacket.frag'));
        this.abs2 = Quad.makeProgramFromSource(
            getShader('./shaders/abs2-xy.frag'));
        this.abs = Quad.makeProgramFromSource(
            getShader('./shaders/abs-xy.frag'));
        this.domainColoring 
            = Quad.makeProgramFromSource(
                getShader('./shaders/domain-coloring.frag'));
        this.grayScale
            = Quad.makeProgramFromSource(
                getShader('./shaders/gray-scale.frag'));
        this.blend2 
            = Quad.makeProgramFromSource(
                getShader("./shaders/blend2colors.frag"));
        this.scale 
            = Quad.makeProgramFromSource(getShader('./shaders/scale.frag'));
        this.add2 
            = Quad.makeProgramFromSource(getShader('./shaders/add2.frag'));
        this.sketchPotential
            = Quad.makeProgramFromSource(
                getShader('./shaders/sketch-potential.frag'));
    }
}

const GLSL_PROGRAMS = new MainGLSLPrograms();

const TEX_PARAMS_CANVAS_F32 = new TextureParams(
    (gl.version === 2)? gl.RG32F: gl.RGBA32F, gCanvas.width, gCanvas.height,
    false, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE,
    gl.NEAREST, gl.NEAREST
);

const WIDTH = LENGTH;
const HEIGHT = LENGTH;
const TEX_PARAMS_SIM = new TextureParams(
    (gl.version === 2)? gl.RG32F: gl.RGBA32F, 
    WIDTH, HEIGHT,
    true, gl.REPEAT, gl.REPEAT,
    gl.LINEAR, gl.LINEAR
)

const TEX_PARAMS_SIM2 = new TextureParams(
    (gl.version === 2)? gl.RG32F: gl.RGBA32F, 
    WIDTH, HEIGHT,
    true, gl.REPEAT, gl.REPEAT,
    gl.LINEAR, gl.LINEAR
)
console.log('texture test', TEX_PARAMS_SIM.equals(TEX_PARAMS_SIM2));

class Frames {
    constructor() {
        this.target = new Quad(TEX_PARAMS_CANVAS_F32);
        this.render1 
            = new Quad({...TEX_PARAMS_CANVAS_F32, format: gl.RGBA32F});
        this.render2
            = new Quad({...TEX_PARAMS_CANVAS_F32, format: gl.RGBA32F});
        this.wavepacket1 = new Quad(TEX_PARAMS_SIM);
        this.wavepacket2 = new Quad(TEX_PARAMS_SIM);
        this.extra = new Quad({...TEX_PARAMS_SIM, format: gl.RGBA32F});
        this.nonlinearTerm = new Quad(TEX_PARAMS_SIM);
        this.pot = new Quad(TEX_PARAMS_SIM);
        this.pot2 = new Quad(TEX_PARAMS_SIM);
        this.heightMap1 = new Quad(TEX_PARAMS_SIM);
        this.heightMap2 = new Quad(TEX_PARAMS_SIM);
        this.wireFrame1 = makeSurface(4*WIDTH, 4*HEIGHT);
        this.wireFrame2 = makeSurface(4*WIDTH, 4*HEIGHT);
        this.render 
            = new RenderTarget({...TEX_PARAMS_CANVAS_F32, 
                                format: gl.RGBA32F});
        this.kineticEnergy = null;
        
        /*this.kineticEnergy = new Quad(TEX_PARAMS_SIM);
        initializeDefaultKineticEnergy(this.kineticEnergy, 
            this.kineticEnergy.width, this.kineticEnergy.height,
            1.0
        );*/
    }
}

let gFrames = new Frames();

let gSimParams = new SimulationParameters(
    1.0, 1.0, new Complex(0.25, 0.0), 
    new Vec2(WIDTH, HEIGHT), new IVec2(WIDTH, HEIGHT));

function changeSimulationSize(w, h) {
    if (w === gSimParams.dimensions.ind[0] &&
        h === gSimParams.dimensions.ind[1])
        return;
    gSimParams.dimensions.ind[0] = w;
    gSimParams.dimensions.ind[1] = h;
    gSimParams.gridDimensions.ind[0] = w;
    gSimParams.gridDimensions.ind[1] = h;
    let newTexParams = {...TEX_PARAMS_SIM, width: w, height: h};
    let newFrames = {
        wavepacket1: new Quad(newTexParams),
        wavepacket2: new Quad(newTexParams),
        extra: new Quad({...newTexParams, format: gl.RGBA32F}),
        nonlinearTerm: new Quad(newTexParams),
        pot: new Quad(newTexParams),
        pot2: new Quad(newTexParams),
        heightMap1: new Quad(newTexParams),
        heightMap2: new Quad(newTexParams),
        kineticEnergy: (gFrames.kineticEnergy === null)?
            null: new Quad(newTexParams),
    };
    for (let k of Object.keys(newFrames)) {
        if (newFrames[k] !== null) {
            newFrames[k].draw(GLSL_PROGRAMS.copy, {tex: gFrames[k]});
            gFrames[k].recycle();
            gFrames[k] = newFrames[k];
        }
    }

}


document.getElementById("changeGrid").value
    = Number.parseInt(gSimParams.gridDimensions.ind[0]);
document.getElementById("changeGrid").addEventListener("change",
    e => {
        let size = Number.parseInt(e.target.value);
        changeSimulationSize(size, size);
        document.getElementById("xRangeLabel").textContent 
        = `-${gSimParams.gridDimensions.ind[0]/2} \u2264 `
            + `x < ${gSimParams.gridDimensions.ind[0]/2}`;
        document.getElementById("yRangeLabel").textContent 
        = `-${gSimParams.gridDimensions.ind[1]/2} \u2264 y < `
            + `${gSimParams.gridDimensions.ind[1]/2}`;
    }
)

let gWavePacketAmplitude = 1.0;


gFrames.wavepacket1.draw(
    GLSL_PROGRAMS.wavePacket,
    {
        waveNumber: new Vec2(0.0, 0.1*HEIGHT),
        texOffset: new Vec2(0.5, 0.3),
        amplitude: gWavePacketAmplitude,
        sigmaXY: new Vec2(0.04, 0.04)
    }
);
gFrames.wavepacket2.draw(
    GLSL_PROGRAMS.wavePacket, 
    {
        waveNumber: new Vec2(0.0, 10.0),
        texOffset: new Vec2(0.25, 0.25),
        amplitude: gWavePacketAmplitude,
        sigmaXY: new Vec2(0.04, 0.04)
    }
);
splitStep(gFrames.wavepacket2, gFrames.wavepacket1, 
          gFrames.kineticEnergy, gFrames.pot,
          gSimParams);


gFrames.heightMap1.draw(GLSL_PROGRAMS.abs, {tex: gFrames.wavepacket1});
gFrames.heightMap2.draw(GLSL_PROGRAMS.abs, {tex: gFrames.wavepacket2});


function getMouseXY(e) {
    let x = (e.clientX - gCanvas.offsetLeft)/gCanvas.width;
    let y = 1.0 - (e.clientY - gCanvas.offsetTop)/gCanvas.height;
    return [x, y];
}

function getTouchXY(touch) {
    let x = (touch.pageX - gCanvas.offsetLeft)/gCanvas.width;
    let y = 1.0 - (touch.pageY - gCanvas.offsetTop)/gCanvas.height;
    return [x, y];
}

let gMousePosition = [];
let gTouchesPosition = new Touches();
let gRotation = Quaternion.rotator(Math.PI/4.0, 0.0, 0.0, 1.0);
// let gRotation = mul(Quaternion.rotator(-1.0, 0.0, 0.0, 1.0),
//                     Quaternion.rotator(-1.0, 1.0, 0.0, 0.0));
let gScale = 1.0;
let gTextEditPotential 
    = new UserEditablePotentialProgramContainer('potentialUserSliders');
let gClipPotential = false;
let gTextEditNonlinear
    = new UserEditableNonlinearProgramContainer('nonlinearUserSliders');
let gUseNonlinear = false;
let gTextEditKE
    = new UserEditableKEProgramContainer("kineticEnergyUserSliders");

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

function timeStepRealCallback(value) {
    let reDt = value/100.0;
    gSimParams.dt.real = reDt;
    document.getElementById("timeStepRealLabel").textContent
        = `Re(\u0394t) = ${reDt}`;
}
timeStepRealCallback(document.getElementById("timeStepReal").value);
document.getElementById("timeStepReal").addEventListener(
    "input",
    e => timeStepRealCallback(e.target.value)
);

document.getElementById("potentialClippedMessage").innerHTML
    = "To avoid numerical error,<br\> "
    + " V will be clipped so that<br\> "
    + " |V(x, y, t)| \u2264 2"

let gNormalize = document.getElementById("normalizePsi").checked;

function timeStepImagCallback(value) {
    if (Number.parseFloat(value) < 0.0) {
        gNormalize = true;
        document.getElementById("normalizePsi").checked = true;
        document.getElementById(
            "normalizePsi").setAttribute('disabled', true);
    }
    if (Number.parseFloat(value) >= 0.0) {
        document.getElementById("normalizePsi").removeAttribute("disabled");
    }
    let imDt = value/1000.0;
    gSimParams.dt.imag = imDt;
    document.getElementById("timeStepImagLabel").textContent
        = `Im(\u0394t) = ${imDt}`;
}
timeStepImagCallback(document.getElementById("timeStepImag").value);
document.getElementById("timeStepImag").addEventListener(
    "input",
    e => timeStepImagCallback(e.target.value)
);

document.getElementById("normalizePsi").addEventListener(
    "input", e => gNormalize = e.target.checked
);

let gSketchWidth = document.getElementById("sketchWidth").value;
const potentialSketchWidth 
    = sketchWidth => 0.02*sketchWidth/100.0;
const waveFuncSketchWidth
    = sketchWidth => 0.05*sketchWidth/100.0 + 0.005;
const refreshSketchSizeDisplay = (sketchWidth, inputMode) => {
    switch(inputMode) {
        case INPUT_MODES.NEW_WAVE_FUNC:
            document.getElementById("sketchWidthLabel").textContent
                = `Sketch size: ${
                    (4.0*gSimParams.gridDimensions.ind[0]
                        *waveFuncSketchWidth(sketchWidth)).toFixed(0)
                }`;
            break;
        case INPUT_MODES.SKETCH_V:
            document.getElementById("sketchWidthLabel").textContent
                = `Sketch size: ${
                    (4.0*gSimParams.gridDimensions.ind[0]
                        *potentialSketchWidth(sketchWidth)).toFixed(0)
                }`;
            break;
        case INPUT_MODES.ERASE_V:
            document.getElementById("sketchWidthLabel").textContent
                = `Sketch size: ${
                    (4.0*gSimParams.gridDimensions.ind[0]
                        *potentialSketchWidth(sketchWidth)).toFixed(0)
                }`;
            break;
        default:
            document.getElementById("sketchWidthLabel").textContent
                = `Sketch size`;
            break;
    }
}
document.getElementById("sketchWidth").addEventListener(
    "input",
    e => {
        gSketchWidth = e.target.value;
        refreshSketchSizeDisplay(gSketchWidth, gInputMode);
    }
);

let gShowSurface = document.getElementById("showSurface").checked;
document.getElementById("showSurface").addEventListener(
    "input",
    e => {
        gShowSurface = e.target.checked;
        if (gShowSurface)
            clearButtonStyles(getDrawButtons());
        else
            applyDrawButtonPressedStyle(getDrawButtons());
    }
);

let gShowPotential = document.getElementById("showPotential").checked;
document.getElementById("showPotential").addEventListener(
    "input", e => gShowPotential = e.target.checked
);

document.getElementById("potentialEntry").addEventListener(
    "input", e => {
        gClipPotential = true;
        gTextEditPotential.newText(e.target.value);
    }
);

document.getElementById("nonlinearEntry").addEventListener(
    "input", e => {
        gTextEditNonlinear.newText(e.target.value);
    }
);

function getDrawButtons() {
    let newWaveFuncButton = document.getElementById("newWaveFuncButton");
    let sketchButton = document.getElementById("sketchButton");
    let eraseButton = document.getElementById("eraseButton");
    return [newWaveFuncButton, sketchButton, eraseButton];
}

function clearButtonStyles(buttons) {
    for (let b of buttons)
        b.style = ``;
}

const INPUT_MODES = {NONE: 0, NEW_WAVE_FUNC: 1, SKETCH_V: 2, ERASE_V: 3};
let gInputMode = INPUT_MODES.NONE;

function applyDrawButtonPressedStyle(drawButtons) {
    let [newWaveFuncButton, sketchButton, eraseButton] = drawButtons;
    let style = `background-color: gray;`;
    switch (gInputMode) {
        case INPUT_MODES.NEW_WAVE_FUNC:
            newWaveFuncButton.style = style;
            break;
        case INPUT_MODES.SKETCH_V:
            sketchButton.style = style;
            break;
        case INPUT_MODES.ERASE_V:
            eraseButton.style = style;
            break;
        default:
            break;
    }
}

function manageButtons() {
    let [newWaveFuncButton, sketchButton, eraseButton] = getDrawButtons();
    let buttons = [newWaveFuncButton, sketchButton, eraseButton];
    newWaveFuncButton.addEventListener(
        "click", () => {
            gShowSurface = false;
            document.getElementById("showSurface").checked = false;
            gInputMode = INPUT_MODES.NEW_WAVE_FUNC;
            clearButtonStyles(buttons);
            applyDrawButtonPressedStyle(buttons);
            refreshSketchSizeDisplay(gSketchWidth, gInputMode);
        }
    );

    sketchButton.addEventListener(
        "click", () => {
            gShowSurface = false;
            document.getElementById("showSurface").checked = false;
            gInputMode = INPUT_MODES.SKETCH_V;
            clearButtonStyles(buttons);
            applyDrawButtonPressedStyle(buttons);
            refreshSketchSizeDisplay(gSketchWidth, gInputMode);
        }
    );

    eraseButton.addEventListener(
        "click", () => {
            gShowSurface = false;
            document.getElementById("showSurface").checked = false;
            gInputMode = INPUT_MODES.ERASE_V;
            clearButtonStyles(buttons);
            applyDrawButtonPressedStyle(buttons);
            refreshSketchSizeDisplay(gSketchWidth, gInputMode);
        }
    );
}
manageButtons();

function setPresetPotential(value) {
    const PRESETS = {
        FREE: 0, HARMONIC: 1, DOUBLE_SLIT: 2, CIRCULAR: 3,
        REPULSIVE_COULOMB: 4, ATTRACTIVE_COULOMB: 5,
        AB: 6, DOUBLE_SLIT_AB: 7,
        REPULSIVE_COULOMB_AB: 8, ATTRACTIVE_COULOMB_AB: 9,
        MOVING_BUMP: 10, MOVING_ATTRACTIVE_SPIKE_AB: 11,
        ATTRACTIVE_MOVING_BUMP_AB: 12,
    };
    let u = `(x/width + 0.5)`, v = `(y/height + 0.5)`;
    let absorbingBoundary = 
        `-i*(exp(-${u}^2/0.001) + exp(-(${u}-1.0)^2/0.001)`
        + `+ exp(-${v}^2/0.001) + exp(-(${v}-1.0)^2/0.001))`;
    let doubleSlit = `step(-abs(${v}-0.5) + 0.02) ` 
                        + `- step(-abs(${v}-0.5) + 0.02)*(`
                            + `step(-abs(${u}-0.45) + 0.02)`
                            + `+ step(-abs(${u}-0.55) + 0.02))`;
    let circular
        = `0.5*(tanh(75.0*(((x/width)^2 + (y/height)^2)^0.5 - 0.45))` 
            + ` + 1.0)`;
    let coulomb = `0.01/((${u}-0.5)^2 + (${v}-0.5)^2)^0.5`;
    gClipPotential = false;
    switch(parseInt(value)) {
        case PRESETS.FREE:
            gTextEditPotential.newText(`0`);
            break;
        case PRESETS.HARMONIC:
            gTextEditPotential.newText(`2.0*((${u}-0.5)^2 + (${v}-0.5)^2)`);
            break;
        case PRESETS.DOUBLE_SLIT:
            gTextEditPotential.newText(doubleSlit);
            break;
        case PRESETS.CIRCULAR:
            gTextEditPotential.newText(circular);
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
                + `(y - 0.3*height*sin(t/100))^2)/5^2)`
            );
            break;
        case PRESETS.MOVING_ATTRACTIVE_SPIKE_AB:
            gTextEditPotential.newText(
                absorbingBoundary 
                + `-0.01/((${u}- 0.5 - 0.1*cos(t/100))^2 `
                + `+ (${v}- 0.5 - 0.1*sin(t/100))^2)^0.5`
            );
            break;
        case PRESETS.ATTRACTIVE_MOVING_BUMP_AB:
            gTextEditPotential.newText(
                absorbingBoundary 
                + `- 2*exp(-0.5*((x - 0.25*width*cos(t/100))^2 + `
                + `(y - 0.25*height*sin(t/100))^2)/(0.1*width)^2)`
            );
            break;
        default:
            break;
    }
}

function setImagTimeStepToNonZeroIfZero(tickVal) {
    if (gSimParams.dt.imag >= 0.0) {
        let timeStepImagRangeVal = `${tickVal}`;
        document.getElementById("timeStepImag").value = timeStepImagRangeVal;
        timeStepImagCallback(tickVal);
    }
}

document.getElementById("presetNonlinear").value = 0;
document.getElementById("presetNonlinear").addEventListener(
    "change", e => setPresetNonlinearity(e.target.value)
);
function setPresetNonlinearity(value) {
    const PRESETS = {
        NONE: 0, DEFOCUSING: 1, FOCUSING: 2, DEFOCUSING_FOCUSING: 3};
    if (parseInt(value) !== PRESETS.NONE)
        setImagTimeStepToNonZeroIfZero(-25.0);
    switch(parseInt(value)) {
        case PRESETS.NONE:
            gTextEditNonlinear.newText(`0.0`);
            break;
        case PRESETS.DEFOCUSING:
            gTextEditNonlinear.newText(
                `100*abs(a*psi)^2`
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

document.getElementById("kineticEnergyEntry").addEventListener(
    "input", e => gTextEditKE.newText(e.target.value)
);

document.getElementById("xRangeLabel").textContent 
= `-${gSimParams.gridDimensions.ind[0]/2} \u2264 `
    + `x < ${gSimParams.gridDimensions.ind[0]/2}`;
document.getElementById("yRangeLabel").textContent 
= `-${gSimParams.gridDimensions.ind[1]/2} \u2264 y < `
    + `${gSimParams.gridDimensions.ind[1]/2}`;

setPresetPotential(document.getElementById("presetPotential").value);
document.getElementById("presetPotential").addEventListener(
    "change", e => setPresetPotential(e.target.value)
);

function setRotation(x0, y0, x1, y1) {
    let d = new Vec3(x1 - x0, y1 - y0, 0.0);
    let axis = Vec3.crossProd(d, new Vec3(0.0, 0.0, -1.0));
    let angle = 10.0*Math.sqrt(d.x*d.x + d.y*d.y + d.z*d.z);
    // console.log(angle, '\naxis: ', axis.x, axis.y, 
    //             '\nquaternion: ', gRotation);
    let rot = Quaternion.rotator(angle, axis.x, axis.y, axis.z);
    gRotation = mul(gRotation, rot);  
} 

function respondToMouseInputByModifyingSurfaceView(e) {
    if (getMouseXY(e)[0] < 0.0 || getMouseXY(e)[0] > 1.0 ||
        getMouseXY(e)[1] < 0.0 || getMouseXY(e)[0] > 1.0) {
        return;
    }
    if (gMousePosition.length === 0) {
        gMousePosition = getMouseXY(e);
        return;
    }
    // console.log(gMousePosition);
    let [x1, y1] = getMouseXY(e);
    let [x0, y0] = gMousePosition;
    setRotation(x0, y0, x1, y1);
    gMousePosition = [x1, y1];
}

function respondToTouchInputByModifyingSurfaceView(e) {
    let touches = e.changedTouches;
    let touchCount = touches.length;
    if (touchCount === 1 && !gTouchesPosition.lockToDouble) {
        let touch = touches[0];
        if (gTouchesPosition.isEmpty(0)) {
            let [x, y] = getTouchXY(touch);
            gTouchesPosition.setXY(0, x, y);
            return;    
        }
        let [x1, y1] = getTouchXY(touch);
        let [x0, y0] = gTouchesPosition.getXY(0);
        // console.log('x0, y0: ', x0, y0);
        setRotation(x0, y0, x1, y1);
        gTouchesPosition.setXY(0, x1, y1);
    } else if (touchCount >= 2) {
        gTouchesPosition.lockToDouble = true;
        gTouchesPosition.resetAt(0);
        for (let i = 0; i < 2; i++) {
            let index = 1 + i;
            if (gTouchesPosition.isEmpty(index)) {
                let [x, y] = getTouchXY(touches[i]);
                gTouchesPosition.setXY(index, x, y);
                return;
            }
        }
        let prevXY1 = new Vec2(...gTouchesPosition.getXY(1));
        let prevXY2 = new Vec2(...gTouchesPosition.getXY(2));
        let nextXY1 = new Vec2(...getTouchXY(touches[0]));
        let nextXY2 = new Vec2(...getTouchXY(touches[1]));
        let prevDiameter = sub(prevXY2, prevXY1).length();
        let nextDiameter = sub(nextXY2, nextXY1).length();
        gTouchesPosition.setXY(1, nextXY1.x, nextXY1.y);
        gTouchesPosition.setXY(2, nextXY2.x, prevXY2.y);
        scaleSurface(prevDiameter - nextDiameter);
        // console.log('diameter: ', nextDiameter, prevDiameter);
    }
}

function drawNewWavePacket(x0, y0, x1, y1, addTo=false) {
    let d = new Vec2(
        gSimParams.gridDimensions.ind[0]*(x1 - x0), 
        gSimParams.gridDimensions.ind[1]*(y1 - y0));
    let dLen = Math.min(Math.min(d.length(), 
        gSimParams.gridDimensions.ind[0]/4.0),
        gSimParams.gridDimensions.ind[1]/4.0);
    if (dLen !== 0.0) {
        let dNorm = div(d, d.length());
        d = mul(dLen, dNorm);
    }
    let wavepacketUniforms = {
        waveNumber: d,
        texOffset: new Vec2(x0, y0),
        amplitude: gWavePacketAmplitude,
        sigmaXY: new Vec2(
            waveFuncSketchWidth(gSketchWidth),
            waveFuncSketchWidth(gSketchWidth)
        )}
    if (addTo) {
        gFrames.extra.draw(
            GLSL_PROGRAMS.wavePacket, wavepacketUniforms);
        gFrames.wavepacket2.draw(
            GLSL_PROGRAMS.add2,
            {tex1: gFrames.wavepacket1,
             tex2: gFrames.extra} 
        );
        return;

    }
    gFrames.wavepacket1.draw(
        GLSL_PROGRAMS.wavePacket, wavepacketUniforms);
    gFrames.wavepacket2.draw(
        GLSL_PROGRAMS.wavePacket, wavepacketUniforms);
}

function respondToMouseInputByModifyingWaveFunction(e) {
    if (getMouseXY(e)[0] < 0.0 || getMouseXY(e)[0] > 1.0 ||
        getMouseXY(e)[1] < 0.0 || getMouseXY(e)[0] > 1.0) {
        if (gMousePosition.length >= 0)
            gMousePosition = [];
        return;
    }
    let [x1, y1] = getMouseXY(e);
    if (gMousePosition.length === 0) {
        gMousePosition = [x1, y1];
        drawNewWavePacket(x1, y1, x1, y1);
        return;
    }
    let [x0, y0] = gMousePosition;
    drawNewWavePacket(x0, y0, x1, y1);
}

function respondToTouchInputByModifyingWaveFunction(e) {
    let touches = e.changedTouches;
    let touchCount = touches.length;
    for (let i = 0; i < touchCount; i++) {
        let touch = touches[i];
        let [x1, y1] = getTouchXY(touch);
        if (gTouchesPosition.isEmpty(i)) {
            gTouchesPosition.setXY(i, x1, y1);
            drawNewWavePacket(x1, y1, x1, y1, (i !== 0));
            return;
        }
        let [x0, y0] = gTouchesPosition.getXY(i);
        drawNewWavePacket(x0, y0, x1, y1, (i !== 0));
    }
}

function mouseSketchPotential(e, drawStrength) {
    if (getMouseXY(e)[0] < 0.0 || getMouseXY(e)[0] > 1.0 ||
        getMouseXY(e)[1] < 0.0 || getMouseXY(e)[0] > 1.0) {
        return;
    }
    let xy = getMouseXY(e);
    gFrames.pot2.draw(
        GLSL_PROGRAMS.sketchPotential, 
        {tex: gFrames.pot, location: new Vec2(xy[0], xy[1]),
            sigmaXY: new Vec2(0.02*gSketchWidth/(100.0), 
                            0.02*gSketchWidth/(100.0)),
            amplitude: drawStrength}
    );
    gFrames.pot.draw(GLSL_PROGRAMS.copy, {tex: gFrames.pot2});
}

function touchSketchPotential(e, drawStrength) {
    let touches = e.changedTouches;
    for (let touch of touches) {
        let xy = getTouchXY(touch);
        gFrames.pot2.draw(
            GLSL_PROGRAMS.sketchPotential, 
            {tex: gFrames.pot, location: new Vec2(xy[0], xy[1]),
                sigmaXY: new Vec2(0.02*gSketchWidth/(100.0), 
                                0.02*gSketchWidth/(100.0)),
                amplitude: drawStrength}
        );
        gFrames.pot.draw(GLSL_PROGRAMS.copy, {tex: gFrames.pot2});
    }
}

gCanvas.addEventListener("touchend", e => {
    gTouchesPosition.reset();
});

gCanvas.addEventListener("touchmove", e => {
    if (gShowSurface) {
        respondToTouchInputByModifyingSurfaceView(e);
    } else {
        switch(gInputMode) {
            case INPUT_MODES.NEW_WAVE_FUNC:
                respondToTouchInputByModifyingWaveFunction(e);
                break;
            case INPUT_MODES.SKETCH_V:
                touchSketchPotential(e, 0.3);
                break;
            case INPUT_MODES.ERASE_V:
                touchSketchPotential(e, -0.3);
                break;
            default:
                break;
        }
    }
});


gCanvas.addEventListener("mousemove", e => {
    if (e.buttons !== 0) {
        if (gShowSurface) {
            respondToMouseInputByModifyingSurfaceView(e);
        } else {
            switch (gInputMode) {
                case INPUT_MODES.NEW_WAVE_FUNC:
                    respondToMouseInputByModifyingWaveFunction(e);
                    break;
                case INPUT_MODES.SKETCH_V:
                    mouseSketchPotential(e, 0.3);
                    break;
                case INPUT_MODES.ERASE_V:
                    mouseSketchPotential(e, -0.3);
                    break;
                default:
                    break;
            }
        }
    }
});

gCanvas.addEventListener("mousedown", e => {
    if (e.buttons !== 0) {
        if (gShowSurface) {
            respondToMouseInputByModifyingSurfaceView(e);
        } else {
            switch (gInputMode) {
                case INPUT_MODES.NEW_WAVE_FUNC:
                    respondToMouseInputByModifyingWaveFunction(e);
                    break;
                case INPUT_MODES.SKETCH_V:
                    mouseSketchPotential(e, 0.3);
                    break;
                case INPUT_MODES.ERASE_V:
                    mouseSketchPotential(e, -0.3);
                    break;
                default:
                    break;
            }
        }
    }
});

gCanvas.addEventListener("mouseup", () => {
    if (gShowSurface) {
        gMousePosition = [];
    } else {
        gMousePosition = [];   
    }
});

function scaleSurface(scaleVal) {
    gScale -= scaleVal;
    if (gScale < 0.5)
        gScale = 0.5;
    if (gScale > 10.0)
        gScale = 10.0;
}

gCanvas.addEventListener("wheel", e => {
    if (gShowSurface) {
        scaleSurface(e.deltaY/200.0);
    } else {
        
    }
});

let gUserTime = 0.0;
let gUserDeltaTs = [];
function displayAverageFPS() {
    let time = performance.now();
    let deltaT = (time - gUserTime)/1000.0;
    gUserDeltaTs.push(deltaT);
    let elapsedT;
    if (elapsedT = (gUserDeltaTs.reduce((a, b) => a + b) > 1.0)) {
        document.getElementById("fps").textContent 
            = `fps: ${ Math.floor(gUserDeltaTs.length/elapsedT)}`;
        gUserDeltaTs = [];
    }
    gUserTime = time;
}

function refreshPotential() {
    gTextEditPotential.refresh(() => {
        gFrames.pot.draw(
            gTextEditPotential.program, 
            {...gTextEditPotential.uniforms,
                width: new Complex(gFrames.pot.width, 0.0),
                height: new Complex(gFrames.pot.height, 0.0),
                applyClipping: gClipPotential}
        );
    });
    if (gTextEditPotential.isTimeDependent) {
        gFrames.pot.draw(
            gTextEditPotential.program,
            {...gTextEditPotential.uniforms, t: gSimParams.t,
                width: new Complex(gFrames.pot.width, 0.0),
                height: new Complex(gFrames.pot.height, 0.0),
                applyClipping: gClipPotential
            }
        );
    }
}

function computeNormSquared(probQuad, useCPU) {
    if (!useCPU) {
        let sumArr = sumSquarePowerOfTwo(probQuad);
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
    gFrames.extra.draw(
        GLSL_PROGRAMS.abs2, {tex: gFrames.wavepacket2});
    let sum = computeNormSquared(gFrames.extra, false);
    let width = gSimParams.gridDimensions.ind[0];
    let height = gSimParams.gridDimensions.ind[1];
    if (gUserDeltaTs.length === 0) {
        console.log(sum/(width*height));
    }
    gFrames.extra.draw(GLSL_PROGRAMS.scale,
        {tex: gFrames.wavepacket2, 
            scale: Math.sqrt((width*height)/sum)});
    gFrames.wavepacket2.draw(
       GLSL_PROGRAMS.copy, {tex: gFrames.extra});
    gFrames.wavepacket1.draw(
        GLSL_PROGRAMS.copy, {tex: gFrames.extra});
}

function animate() {
    displayAverageFPS();
    refreshPotential();
    gTextEditNonlinear.refresh(() => {
        gUseNonlinear = true;
    });
    gTextEditKE.refresh(() => {
        if (gFrames.kineticEnergy === null)
            gFrames.kineticEnergy = new Quad({
                ...TEX_PARAMS_SIM, 
                width: gFrames.wavepacket1.width,
                height: gFrames.wavepacket1.height});
        gFrames.kineticEnergy.draw(
            gTextEditKE.program,
            {...gTextEditKE.uniforms, 
            m: new Complex(gSimParams.m, 0.0), t: gSimParams.t,
            dimensions2D: new Vec2(gFrames.pot.width, gFrames.pot.height),
            texelDimensions2D:
                new IVec2(gFrames.pot.width, gFrames.pot.height)}
        );
    });
    for (let i = 0; i < gStepsPerFrame; i++) {
        let kineticEnergy = gFrames.kineticEnergy;
        let potential = gFrames.pot;
        if (gUseNonlinear) {
            let normFactor
                = 1.0/Math.sqrt(gFrames.nonlinearTerm.width
                                *gFrames.nonlinearTerm.height);
            gFrames.nonlinearTerm.draw(
                gTextEditNonlinear.program, 
                {
                    ...gTextEditNonlinear.uniforms, 
                    psiTex: gFrames.wavepacket2,
                    normFactor: normFactor,
                }
            );
            gFrames.pot2.draw(
                GLSL_PROGRAMS.add2, 
                {
                    tex1: gFrames.pot, tex2: gFrames.nonlinearTerm
                }
            );
            potential = gFrames.pot2;
        }
        splitStep(gFrames.wavepacket1, gFrames.wavepacket2,
                  kineticEnergy, potential, gSimParams);
        [gFrames.wavepacket1, gFrames.wavepacket2] 
            = [gFrames.wavepacket2, gFrames.wavepacket1];
        gSimParams.t = add(gSimParams.t, 
            new Complex(gSimParams.dt.real, 0.0));
    }
    if (gNormalize)
        normalizeWaveFunction();
    if (gShowSurface) {
        gFrames.heightMap1.draw(
            GLSL_PROGRAMS.abs,
            {tex: gFrames.wavepacket2}
        );
        gFrames.heightMap2.draw(
            GLSL_PROGRAMS.grayScale,
            {
                tex: gFrames.pot, 
                brightness: 1.0, maxBrightness: 1000000.0, 
                offset: -0.1
            }
        );
        withConfig({enable: gl.DEPTH_TEST, depthFunc: gl.LESS,
                    width: gCanvas.width, height: gCanvas.height}, () => {
            /* if (gl.version === 2) {
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            }*/
            let width = gSimParams.gridDimensions.ind[0];
            let height = gSimParams.gridDimensions.ind[1];
            gFrames.render.clear();
            let renderUniforms = {
                scale: gScale, 
                heightScale: 0.05,
                translate: new Vec3(0.0, 0.0, 0.0),
                rotation: gRotation,
                heightTex: gFrames.heightMap1,
                tex: gFrames.wavepacket1,
                dimensions2D: new IVec2(width, height),
                brightness: 0.5,
            };
            gFrames.render.draw(
                GLSL_PROGRAMS.surfaceWaveFunc,
                renderUniforms, gFrames.wireFrame1);
            if (gShowPotential) {
                gFrames.render.draw(
                    GLSL_PROGRAMS.surfacePotential,
                    {
                        ...renderUniforms,
                        heightScale: 0.1,
                        heightTex: gFrames.heightMap2,
                        color: new Vec4(1.0, 1.0, 1.0, 0.5)
                    },
                    gFrames.wireFrame2
                );
            }
            /*if (gl.version === 2) {
                gl.disable(gl.BLEND);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            }*/
            // gl.clear(gl.DEPTH_BUFFER_BIT);
            // gl.disable(gl.DEPTH_TEST);
        });
        gFrames.target.draw(GLSL_PROGRAMS.copy, {tex: gFrames.render});
    } else {
        gFrames.render1.draw(
            GLSL_PROGRAMS.domainColoring,
            {tex: gFrames.wavepacket2,
                brightness: 0.5});
        gFrames.render2.draw(GLSL_PROGRAMS.grayScale, 
            {tex: gFrames.pot, brightness: 1.0, maxBrightness: 0.5,
                offset: 0.0});
        gFrames.target.draw(GLSL_PROGRAMS.blend2, 
            {tex1: gFrames.render1, tex2: gFrames.render2, scale1: 1.0,
                scale2: (gShowPotential)? 1.0: 0.0});
    }
    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);