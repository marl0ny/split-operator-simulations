/* Script for managing the 2D simulation. */
import gCanvas from "./canvas.js";
import { gl, gMainRenderWindow, TextureParams, RenderTarget, 
         Quad, Vec2, IVec2, IVec3, Vec3, Vec4, Complex,
         Quaternion, mul, add, div,
         withConfig,
         sub,
         saveQuadAsBMPImage} from "./gl-wrappers.js";
import splitStep, { 
    SimulationParameters 
} from "./split-step.js";
import makeSurface, { makeSurfaceProgram } from "./surface.js";
import { 
    UserEditablePotentialProgramContainer,
    UserEditableNonlinearProgramContainer, 
    UserEditableKEProgramContainer} from "./user-editable-program.js";
import { getShader } from "./shaders.js";
import { sumSquarePowerOfTwo } from "./sum.js";
import Touches from "./touch-manager.js";
import { fft2D, fftShift } from "./fft.js";
import { testMatrix3x3 } from "./matrix3x3.js";

testMatrix3x3();

class MainGLSLPrograms {
    constructor() {
        this.surfaceWaveFunc
            = makeSurfaceProgram(
                getShader('./shaders/surface/domain-coloring.frag'));
        this.surfacePotential
            = makeSurfaceProgram(
                getShader('./shaders/surface/single-color.frag'));
        this.copy
            = Quad.makeProgramFromSource(
                getShader('./shaders/util/copy.frag'));
        this.copyFlip
            = Quad.makeProgramFromSource(
                getShader('./shaders/util/copy-flip.frag'));
        this.wavePacket
            = Quad.makeProgramFromSource(
                getShader('./shaders/init-wavepacket/gaussian.frag'));
        this.sechPacket
            = Quad.makeProgramFromSource(
                getShader('./shaders/init-wavepacket/sech.frag'));
        this.abs2 = Quad.makeProgramFromSource(
            getShader('./shaders/util/abs2-xy.frag'));
        this.abs = Quad.makeProgramFromSource(
            getShader('./shaders/util/abs-xy.frag'));
        this.domainColoring 
            = Quad.makeProgramFromSource(
                getShader('./shaders/util/domain-coloring.frag'));
        this.grayScale
            = Quad.makeProgramFromSource(
                getShader('./shaders/util/gray-scale.frag'));
        this.blend2 
            = Quad.makeProgramFromSource(
                getShader("./shaders/util/blend2colors.frag"));
        this.scale 
            = Quad.makeProgramFromSource(
                getShader('./shaders/util/scale.frag'));
        this.scaleRGBA 
                = Quad.makeProgramFromSource(
                    getShader('./shaders/util/scale-rgba.frag'));
        this.uniformColor
                = Quad.makeProgramFromSource(
                    getShader('./shaders/util/uniform-color.frag'));
        this.add2 
            = Quad.makeProgramFromSource(
                getShader('./shaders/util/add2.frag'));
        this.sketchPotential
            = Quad.makeProgramFromSource(
                getShader('./shaders/sketch/potential.frag'));
    }
}

const GLSL_PROGRAMS = new MainGLSLPrograms();

const TEX_PARAMS_CANVAS_F32 = new TextureParams(
    (gl.version === 2)? gl.RG32F: gl.RGBA32F, gCanvas.width, gCanvas.height,
    true, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE,
    gl.LINEAR, gl.LINEAR
);

const TEX_PARAMS_SQUARE_F32 = new TextureParams(
    (gl.version === 2)? gl.RG32F: gl.RGBA32F, 
    (gCanvas.width > gCanvas.height)? gCanvas.height: gCanvas.width,
    (gCanvas.width > gCanvas.height)? gCanvas.height: gCanvas.width,
    true, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE,
    gl.LINEAR, gl.LINEAR
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
// console.log('texture test', TEX_PARAMS_SIM.equals(TEX_PARAMS_SIM2));

class Frames {
    constructor() {
        this.target = gMainRenderWindow;
        this.render1 
            = new Quad({...TEX_PARAMS_SQUARE_F32, 
                format: gl.RGBA32F,
                // format: (gl.version === 2)? gl.RGBA16F: gl.RGBA32F
            });
        this.render2
            = new Quad({...TEX_PARAMS_SQUARE_F32,
                format: gl.RGBA32F,
                // format: (gl.version === 2)? gl.RGBA16F: gl.RGBA32F
            });
        this.psi1 = new Quad(TEX_PARAMS_SIM);
        this.psi2 = new Quad(TEX_PARAMS_SIM);
        this.psiP = new Quad(TEX_PARAMS_SIM);
        this.abs2Psi = new Quad(TEX_PARAMS_SIM);
        this.extra = new Quad({...TEX_PARAMS_SIM, format: gl.RGBA32F});
        this.nonlinearTerm = new Quad(TEX_PARAMS_SIM);
        this.pot = new Quad(TEX_PARAMS_SIM);
        this.pot2 = new Quad(TEX_PARAMS_SIM);
        this.heightMap1 = new Quad(TEX_PARAMS_SIM);
        this.heightMap2 = new Quad(TEX_PARAMS_SIM);
        this.wireFrame1 = makeSurface(
            (gl.version === 2)? 4*WIDTH: WIDTH,
            (gl.version === 2)? 4*HEIGHT: HEIGHT
        );
        this.wireFrame2 = makeSurface(
            (gl.version === 2)? 4*WIDTH: WIDTH,
            (gl.version === 2)? 4*HEIGHT: HEIGHT
        );
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
    let framesNewTex = {
        'psi1': newTexParams, 'psi2': newTexParams,
        'psiP': newTexParams,
        'abs2Psi': newTexParams,
        // 'extra': {...newTexParams, format: gl.RGBA32F},
        'nonlinearTerm': newTexParams,
        'pot': newTexParams, 'pot2': newTexParams,
        'heightMap1': newTexParams, 'heightMap2': newTexParams,
        'kineticEnergy': newTexParams
    };
    for (let k of Object.keys(framesNewTex)) {
        if (gFrames[k] !== null) {
            gFrames['extra'].draw(GLSL_PROGRAMS.copy, {tex: gFrames[k]});
            gFrames[k].reset(framesNewTex[k]);
            gFrames[k].draw(GLSL_PROGRAMS.copy, {tex: gFrames['extra']});
        }
        gFrames['extra'].reset({...newTexParams, format: gl.RGBA32F});
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


const initialStep = () => {
    gFrames.psi1.draw(
        GLSL_PROGRAMS.wavePacket,
        {
            waveNumber: new Vec2(0.0, 0.1*HEIGHT),
            texOffset: new Vec2(0.5, 0.3),
            amplitude: gWavePacketAmplitude,
            sigmaXY: new Vec2(0.04, 0.04)
        }
    );
    gFrames.psi2.draw(
        GLSL_PROGRAMS.wavePacket, 
        {
            waveNumber: new Vec2(0.0, 10.0),
            texOffset: new Vec2(0.25, 0.25),
            amplitude: gWavePacketAmplitude,
            sigmaXY: new Vec2(0.04, 0.04)
        }
    );
    splitStep(gFrames.psi2, gFrames.psi1, 
            gFrames.kineticEnergy, gFrames.pot,
            gSimParams, gFrames.gShowPsiP);
    [gFrames.psi1, gFrames.psi2] 
        = [gFrames.psi2, gFrames.psi1];
}
initialStep();

gFrames.heightMap1.draw(GLSL_PROGRAMS.abs, {tex: gFrames.psi1});
gFrames.heightMap2.draw(GLSL_PROGRAMS.abs, {tex: gFrames.psi2});

document.getElementById("aLink").href 
    = "https://github.com/marl0ny/"
    + "split-operator-simulations/tree/new-web-version/js";


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
let gRotation = mul(Quaternion.rotator(Math.PI/4.0, 0.0, 0.0, 1.0),
                    Quaternion.rotator(-Math.PI/4.0, 1.0, 0.0, 0.0));

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

document.getElementById("potentialClippedMessage").innerHTML
    = "To reduce numerical error,<br\> "
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

let gShowPsiP = document.getElementById("showMomentumSpacePsi").checked;
document.getElementById("showMomentumSpacePsi").addEventListener(
    "input", e => gShowPsiP = e.target.checked
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
        ROTATING_HARMONIC: 13
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
            gTextEditPotential.newText(
                `2.0*abs(strength)*((${u}-0.5)^2 + (${v}-0.5)^2)`);
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
                + `(y - 0.3*height*sin(t/100))^2)/(width*5/256)^2)`
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

function respondToMouseInputByModifyingSurfaceView(e) {
    if (getMouseXY(e)[0] < 0.0 || getMouseXY(e)[0] > 1.0 ||
        getMouseXY(e)[1] < 0.0 || getMouseXY(e)[0] > 1.0) {
        return;
    }
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

function respondToTouchInputByModifyingSurfaceView(e) {
    let touches = e.changedTouches;
    let touchCount = touches.length;
    if (touchCount === 1 && !gTouchesPosition.lockToDouble) {
        let touch = touches[0];
        if (gTouchesPosition.isEmpty(0)) {
            let [x, y] = equalizeXYScaling(getTouchXY(touch));
            gTouchesPosition.setXY(0, x, y);
            return;    
        }
        let [x1, y1] = equalizeXYScaling(getTouchXY(touch));
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
                let [x, y] = equalizeXYScaling(getTouchXY(touches[i]));
                gTouchesPosition.setXY(index, x, y);
                return;
            }
        }
        let prevXY1 = new Vec2(...gTouchesPosition.getXY(1));
        let prevXY2 = new Vec2(...gTouchesPosition.getXY(2));
        let nextXY1 = new Vec2(
            ...equalizeXYScaling(getTouchXY(touches[0])));
        let nextXY2 = new Vec2(
            ...equalizeXYScaling(getTouchXY(touches[1])));
        let prevDiameter = sub(prevXY2, prevXY1).length();
        let nextDiameter = sub(nextXY2, nextXY1).length();
        gTouchesPosition.setXY(1, nextXY1.x, nextXY1.y);
        gTouchesPosition.setXY(2, nextXY2.x, prevXY2.y);
        scaleSurface(prevDiameter - nextDiameter);
        // console.log('diameter: ', nextDiameter, prevDiameter);
    }
}

function getWaveNumber(x0, y0, x1, y1) {
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
    return d;
}

function drawNewWavePacket(x0, y0, x1, y1, addTo=false) {
    let wavepacketUniforms = {
        waveNumber: getWaveNumber(x0, y0, x1, y1),
        texOffset: new Vec2(x0, y0),
        amplitude: gWavePacketAmplitude,
        sigmaXY: new Vec2(
            waveFuncSketchWidth(gSketchWidth),
            waveFuncSketchWidth(gSketchWidth)
        )}
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
    if (gStepsPerFrame === 0 && gShowPsiP) {
        fft2D(gFrames.psi2, gFrames.psi1);
        fftShift(gFrames.psiP, gFrames.psi2);
    }
    gFrames.psi2.draw(
        GLSL_PROGRAMS.wavePacket, wavepacketUniforms);
}

function displayInitialMomentum(x0, y0, x1, y1) {
    let wn = getWaveNumber(x0, y0, x1, y1);
    let displayInitialMomentumLabel
        = document.getElementById('displayInitialMomentum');
    displayInitialMomentumLabel.style =
        `color: black; opacity: 1;`;
    let w = gSimParams.dimensions.ind[0];
    let h = gSimParams.dimensions.ind[1];
    displayInitialMomentumLabel.textContent 
        = `<px>=${(2.0*wn.x/w).toFixed(3)}\u03c0  `
        + `<py>=${(2.0*wn.y/h).toFixed(3)}\u03c0`;
}

function clearInitialMomentumDisplay() {
    let displayInitialMomentumLabel
        = document.getElementById('displayInitialMomentum');
    displayInitialMomentumLabel.style =
        `color: black; opacity: 0;`;
}

function respondToMouseInputByModifyingWaveFunction(e) {
    if (getMouseXY(e)[0] < 0.0 || getMouseXY(e)[0] > 1.0 ||
        getMouseXY(e)[1] < 0.0 || getMouseXY(e)[0] > 1.0) {
        if (gMousePosition.length >= 0)
            gMousePosition = [];
        return;
    }
    let [x1, y1] = equalizeXYScaling(getMouseXY(e));
    if (gMousePosition.length === 0) {
        gMousePosition = [x1, y1];
        drawNewWavePacket(x1, y1, x1, y1);
        return;
    }
    let [x0, y0] = gMousePosition;
    displayInitialMomentum(x0, y0, x1, y1);
    drawNewWavePacket(x0, y0, x1, y1);
}

function respondToTouchInputByModifyingWaveFunction(e) {
    let touches = e.changedTouches;
    let touchCount = touches.length;
    for (let i = 0; i < touchCount; i++) {
        let touch = touches[i];
        let [x1, y1] = equalizeXYScaling(getTouchXY(touch));
        if (gTouchesPosition.isEmpty(i)) {
            gTouchesPosition.setXY(i, x1, y1);
            drawNewWavePacket(x1, y1, x1, y1, (i !== 0));
            return;
        }
        let [x0, y0] = gTouchesPosition.getXY(i);
        displayInitialMomentum(x0, y0, x1, y1);
        drawNewWavePacket(x0, y0, x1, y1, (i !== 0));
    }
}

function mouseSketchPotential(e, drawStrength) {
    if (getMouseXY(e)[0] < 0.0 || getMouseXY(e)[0] > 1.0 ||
        getMouseXY(e)[1] < 0.0 || getMouseXY(e)[0] > 1.0) {
        if (gMousePosition.length >= 0)
            gMousePosition = [];
        return;
    }
    let xy = equalizeXYScaling(getMouseXY(e));
    let sketchSize = 0.02*gSketchWidth/(100.0);
    if (gMousePosition.length > 0) {
        let [x1, y1] = xy;
        let [x0, y0] = gMousePosition;
        let d = new Vec2(x1 - x0, y1 - y0);
        let dLength = d.length();
        if (dLength !== 0.0) {
            let n0 = div(d, dLength);
            let inc = mul(sketchSize, n0);
            console.log(d.length(), sketchSize);
            for (let k = 0; d.length() > sketchSize && k < 10; k++) {
                // console.log(d);
                d = sub(d, inc);
                gFrames.pot2.draw(
                    GLSL_PROGRAMS.sketchPotential,
                    {tex: gFrames.pot,
                     location: new Vec2(x0 + d.ind[0],  y0 + d.ind[1]),
                     sigmaXY: new Vec2(sketchSize, sketchSize),
                     amplitude: drawStrength}
                );
                gFrames.pot.draw(GLSL_PROGRAMS.copy, {tex: gFrames.pot2});
            }
        }
    }
    gFrames.pot2.draw(
        GLSL_PROGRAMS.sketchPotential,
        {tex: gFrames.pot, location: new Vec2(xy[0], xy[1]),
         sigmaXY: new Vec2(sketchSize, sketchSize),
         amplitude: drawStrength}
    );
    gFrames.pot.draw(GLSL_PROGRAMS.copy, {tex: gFrames.pot2});
    gMousePosition = xy;
}

function touchSketchPotential(e, drawStrength) {
    let touches = e.changedTouches;
    for (let touch of touches) {
        let xy = equalizeXYScaling(getTouchXY(touch));
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
    clearInitialMomentumDisplay();
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

/* function displayHoveringText(e) {
    let [x, y] = getMouseXY(e);
    // console.log(x, y);
    if (!(getMouseXY(e)[0] < 0.0 || getMouseXY(e)[0] > 1.0 ||
        getMouseXY(e)[1] < 0.0 || getMouseXY(e)[0] > 1.0)
        && !gShowSurface) {
        let hoveringStats = document.getElementById("hoveringStats");
        hoveringStats.textContent 
            = `px: ${((x - 0.5)*gSimParams.dimensions.ind[0]).toFixed(1)}\n`
            + `py: ${((y - 0.5)*gSimParams.dimensions.ind[1]).toFixed(1)}`;
        hoveringStats.style = `position: absolute; width: 150px;` 
            + `right: ${document.documentElement.clientWidth - e.clientX - 120}px; `
            + `top: ${e.clientY+8}px; color: white; opacity: 1;`;
        console.log(hoveringStats.style);
    } else {
        document.getElementById("hoveringStats").style = `opacity: 0;`;
    }
}*/

function displayTextPosition(e) {
    let mousePositionDisplay 
        = document.getElementById("displayMousePosition");
    let xy = equalizeXYScaling(getMouseXY(e));
    if (!(xy[0] < 0.0 || xy[0] > 1.0 ||
            xy[1] < 0.0 || xy[1] > 1.0)
        && !gShowSurface) {
        if (gMousePosition.length === 0) {
            let [x, y] = xy;
            mousePositionDisplay.textContent
                = `x: ${((x - 0.5)*gSimParams.dimensions.ind[0]).toFixed(1)}, `
                + `y: ${((y - 0.5)*gSimParams.dimensions.ind[1]).toFixed(1)}`;
        }
        mousePositionDisplay.style = `color: black; opacity: 1;`;
    } else {
        mousePositionDisplay.style = `color: black; opacity: 0;`;
    }
}

document.addEventListener("mousemove", e => {
    displayTextPosition(e);
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
    clearInitialMomentumDisplay();
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

document.getElementById("uploadImage").addEventListener(
    "change", () => {
        if (gTextEditPotential.isTimeDependent)
            gTextEditPotential.isTimeDependent = false;
        let im = document.getElementById("image");
        im.file = document.getElementById("uploadImage").files[0];
        const reader = new FileReader();
        reader.onload = e => {
            im.src = e.target.result;
        };
        let loadImageToPotentialFunc = () => {
            let canvas = document.getElementById("imageCanvas");
            let width = gSimParams.gridDimensions.ind[0];
            let height = gSimParams.gridDimensions.ind[1];
            canvas.setAttribute("width", width);
            canvas.setAttribute("height", height);
            // ctx.rect(0, 0, width, height);
            let ctx = canvas.getContext("2d");
            // ctx.fill();
            let imW = im.width;
            let imH = im.height;
            let heightOffset = 0;
            let widthOffset = 0;
            if (imW/imH >= width/height) {
                let ratio = (imW/imH)/(width/height);
                widthOffset = parseInt(0.5*width*(1.0 - ratio));
                ctx.drawImage(im, widthOffset, heightOffset,
                              width*(imW/imH)/(width/height), height);
            } else {
                let ratio = (imH/imW)/(height/width);
                heightOffset = parseInt(0.5*height*(1.0 - ratio));
                ctx.drawImage(im, widthOffset, heightOffset,
                              width, (imH/imW)/(height/width)*height);
            }
            let imageData = new Float32Array(
                ctx.getImageData(0, 0, width, height).data
            );
            for (let i = 0; i < imageData.length/4; i++) {
                let normColorVal = Math.sqrt(
                    imageData[4*i]*imageData[4*i]
                    + imageData[4*i + 1]*imageData[4*i + 1] 
                    + imageData[4*i + 2]*imageData[4*i + 2])/3.0;
                imageData[4*i] = normColorVal/255.0;
                for (let j = 1; j < 4; j++)
                    imageData[4*i + j] = 0.0;
            }
            console.log(imageData.length);
            gFrames.extra.substituteArray(imageData);
            gFrames.pot.draw(GLSL_PROGRAMS.copyFlip, 
                {tex: gFrames.extra});
        }
        let promiseFunc = () => {
            if (im.width === 0 && im.height === 0) {
                let p = new Promise(() => setTimeout(promiseFunc, 10));
                return Promise.resolve(p);
            } else {
                loadImageToPotentialFunc();
            }
        };
        reader.onloadend = () => {
            let p = new Promise(() => setTimeout(promiseFunc, 10));
            Promise.resolve(p);
        }
        reader.readAsDataURL(document.getElementById("uploadImage").files[0]);
    },
    false
)

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

function showPsiPWindow() {
    gFrames.render2.draw(GLSL_PROGRAMS.domainColoring,
        {tex: gFrames.psiP,
            brightness: 0.5/(gSimParams.gridDimensions.ind[0],
                             gSimParams.gridDimensions.ind[1])});
    let minSideLength = Math.min(gCanvas.width, gCanvas.height);
    let windowLength = minSideLength*0.3;
    let uLOffset = minSideLength*0.01;
    gFrames.target.draw(GLSL_PROGRAMS.uniformColor, 
        {color: new Vec4(1.0, 1.0, 1.0, 1.0)},
        {viewport: [Math.floor(gCanvas.width - windowLength - uLOffset - 1),
                    Math.floor(gCanvas.height - windowLength - uLOffset - 1),
                    Math.ceil(windowLength - uLOffset + 1), 
                    Math.ceil(windowLength - uLOffset + 1)
        ]});
    gFrames.target.draw(GLSL_PROGRAMS.scaleRGBA, 
                        {tex: gFrames.render2,
                         scale: new Vec4(1.0, 1.0, 1.0, 1.0)},
                        {viewport: [gCanvas.width - windowLength - uLOffset,
                                    gCanvas.height - windowLength - uLOffset,
                                    windowLength - uLOffset, 
                                    windowLength - uLOffset
                        ]});
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
    gFrames.abs2Psi.draw(
        GLSL_PROGRAMS.abs2, {tex: gFrames.psi1});
    let sum = computeNormSquared(gFrames.abs2Psi, false);
    let width = gSimParams.gridDimensions.ind[0];
    let height = gSimParams.gridDimensions.ind[1];
    let normFactor = Math.sqrt((width*height)/sum);
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

function drawSurface() {
    gFrames.heightMap1.draw(
        GLSL_PROGRAMS.abs,
        {tex: gFrames.psi1}
    );
    gFrames.heightMap2.draw(
        GLSL_PROGRAMS.grayScale,
        {
            tex: gFrames.pot, 
            brightness: 1.0, maxBrightness: 1000000.0, 
            offset: -0.1
        }
    );
    let width = gSimParams.gridDimensions.ind[0];
    let height = gSimParams.gridDimensions.ind[1];
    let renderUniforms = {
        scale: gScale, 
        heightScale: 0.05,
        translate: new Vec3(0.0, 0.0, 0.0),
        screenDimensions: new IVec2(gCanvas.width, gCanvas.height),
        rotation: gRotation,
        heightTex: gFrames.heightMap1,
        tex: gFrames.psi1,
        dimensions2D: new IVec2(width, height),
        brightness: 0.5,
    };
    withConfig({
        enable: gl.DEPTH_TEST, 
        depthFunc: gl.LESS,
        width: gCanvas.width, height: gCanvas.height}, () => {
        gFrames.render.clear();
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
    });
    withConfig({
                width: gCanvas.width, height: gCanvas.height}, () => {
        /*if (gl.version === 2) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }*/
        gFrames.render.draw(
            GLSL_PROGRAMS.surfaceWaveFunc,
            renderUniforms, gFrames.wireFrame1);
        /*if (gl.version === 2) {
            gl.disable(gl.BLEND);
        }*/
    });
    gl.disable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gFrames.target.draw(GLSL_PROGRAMS.copy, {tex: gFrames.render});
}

function applyRotationAlongZAxisOfSurface(angularVel) {
    let axis = Quaternion.rotate(
        new Quaternion(1.0, 0.0, 0.0, 1.0), gRotation);
    let rotationAxis = Quaternion.rotator(angularVel, axis.i, axis.j, axis.k);
    gRotation = mul(gRotation, rotationAxis);
}

function animate() {
    displayAverageFPS();
    refreshPotential();
    applyRotationAlongZAxisOfSurface(gAutoRotationVelocity);
    gTextEditNonlinear.refresh(() => {
        gUseNonlinear = true;
    });
    gTextEditKE.refresh(() => {
        if (gFrames.kineticEnergy === null)
            gFrames.kineticEnergy = new Quad({
                ...TEX_PARAMS_SIM, 
                width: gSimParams.gridDimensions.ind[0],
                height: gSimParams.gridDimensions.ind[1]
            });
        gFrames.kineticEnergy.draw(
            gTextEditKE.program,
            {...gTextEditKE.uniforms, 
            m: new Complex(gSimParams.m, 0.0), t: gSimParams.t,
            dimensions2D: new Vec2(
                gSimParams.dimensions.ind[0],
                gSimParams.dimensions.ind[1]),
            texelDimensions2D:
                new IVec2(
                    gSimParams.gridDimensions.ind[0],
                    gSimParams.gridDimensions.ind[1])}
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
                    psiTex: gFrames.psi1,
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
        splitStep(gFrames.psi2, gFrames.psi1,
                  kineticEnergy, potential, gSimParams,
                  (gShowPsiP)? gFrames.psiP: null);
        [gFrames.psi1, gFrames.psi2] 
            = [gFrames.psi2, gFrames.psi1];
        gSimParams.t = add(gSimParams.t, 
            new Complex(gSimParams.dt.real, 0.0));
    }
    if (gNormalize)
        normalizeWaveFunction();
    if (gShowSurface) {
        drawSurface();
    } else {
        gFrames.render1.draw(
            GLSL_PROGRAMS.domainColoring,
            {tex: gFrames.psi1,
                brightness: 0.5});
        gFrames.render2.draw(GLSL_PROGRAMS.grayScale, 
            {tex: gFrames.pot, brightness: 1.0, maxBrightness: 0.5,
                offset: 0.0});
        gFrames.target.draw(GLSL_PROGRAMS.blend2, 
            {tex1: gFrames.render1, tex2: gFrames.render2, scale1: 1.0,
                scale2: (gShowPotential)? 1.0: 0.0},
            {viewport: [parseInt((gCanvas.width - gFrames.render1.width)/2.0)
                , 0, gFrames.render1.width, gFrames.render1.height]}
        );
    }
    if (gShowPsiP)
        showPsiPWindow();
    if (gTakeScreenshots) {
        // let url = gCanvas.toDataURL('image/png', 1);
        // let time = Date.now();
        // let aTag = document.createElement('a');
        // aTag.hidden = true;
        // aTag.href = url;
        // aTag.download = `${time}.png`;
        // new Promise(() => aTag.click()).then(() => aTag.remove());
        saveQuadAsBMPImage(
            document, gFrames.target, [50, 50, 50],
            [0, 0, gCanvas.width, gCanvas.height]
        );
    }
    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);