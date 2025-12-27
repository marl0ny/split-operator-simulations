/* Script for managing the 2D split step implementation.
*/
import { Quad, IScalar, Complex, div } from "./gl-wrappers.js";
import { fft2D, fftShift, ifft2D } from "./fft.js";
import { getShader } from "./shaders.js";

let gPrograms = {
    splitStepMomentum: 
        Quad.makeProgramFromSource(
            getShader('./shaders/split-step/kinetic.frag')),
    splitStepSpatial: 
        Quad.makeProgramFromSource(
            getShader('./shaders/split-step/spatial.frag')
        ),
    mul:
        Quad.makeProgramFromSource(
            getShader('./shaders/util/cmul.frag')
        )
};

const PI = 3.141592653589793;

export function initializeDefaultKineticEnergy(
    dst, simulationWidth, simulationHeight, m) {
    let width = dst.width, height = dst.height;
    let keArr = new Float32Array(2*width*height);
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            let iFreq = (i < height/2)? i: -height + i;
            let jFreq = (j < width/2)? j: -width + j;
            let px = 2.0*PI*jFreq/simulationWidth;
            let py = 2.0*PI*iFreq/simulationHeight;
            keArr[2*(i*width + j)] = (px*px + py*py)/(2.0*m);
        }
    }
    dst.substituteArray(keArr);
}

export function 
initializeDefaultKineticEnergyExponential(
    dst, simulationWidth, simulationHeight, dt, m, hbar) {
    let width = dst.width, height = dst.height;
    let keArr = new Float32Array(2*width*height);
    // console.log('dt, m, hbar', dt, m, hbar);
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            let iFreq = (i < height/2)? i: -height + i;
            let jFreq = (j < width/2)? j: -width + j;
            let px = 2.0*PI*jFreq/simulationWidth;
            let py = 2.0*PI*iFreq/simulationHeight;
            let ke = (px*px + py*py)/(2.0*m);
            let reAngle = dt.imag*ke/hbar;
            let imAngle = -dt.real*ke/hbar;
            let reKe = Math.exp(reAngle)*Math.cos(imAngle);
            let imKe = Math.exp(reAngle)*Math.sin(imAngle);
            keArr[2*(i*width + j)] = reKe;
            keArr[2*(i*width + j) + 1] = imKe;
        }
    }
    dst.substituteArray(keArr);
}

export function 
initializeKineticEnergyExponential(
    dst, kineticEnergy, dt, hbar) {
    let width = dst.width, height = dst.height;
    let kineticEnergyArr = kineticEnergy.asFloat32Array();
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            let reKE = kineticEnergyArr[2*(i*width + j)];
            let imKE = kineticEnergyArr[2*(i*width + j) + 1];
            let reAngle = (dt.real*imKE + dt.imag*reKE)/hbar;
            let imAngle = (-dt.real*reKE + dt.imag*imKE)/hbar;
            let reKEExp = Math.exp(reAngle)*Math.cos(imAngle);
            let imKEExp = Math.exp(reAngle)*Math.sin(imAngle);
            kineticEnergyArr[2*(i*width + j)] = reKEExp;
            kineticEnergyArr[2*(i*width + j) + 1] = imKEExp;
        }
    }
    dst.substituteArray(keArr);
}

export function
initializePotentialExponential(
    dst, potential, dt, hbar
) {
    let width = dst.width, height = dst.height;
    let potentialArr = potential.asFloat32Array();
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            let reV = potentialArr[2*(i*width + j)];
            let imV = potentialArr[2*(i*width + j) + 1];
            let reAngle = (dt.real*imV + dt.imag*reV)/hbar;
            let imAngle = (-dt.real*reV + dt.imag*imV)/hbar;
            let reVExp = Math.exp(reAngle)*Math.cos(imAngle);
            let imVExp = Math.exp(reAngle)*Math.sin(imAngle);
            potentialArr[2*(i*width + j)] = reVExp;
            potentialArr[2*(i*width + j) + 1] = imVExp;
        }
    }
    dst.substituteArray(potentialArr);

}

export class SimulationParameters {
    t;
    dt;
    m;
    hbar;
    dimensions; // simulation dimensions of the 2D rectangular domain
    gridDimensions; // number of points used along each dimension
    constructor(hbar, m, dt, dimensions, gridDimensions) {
        this.t = new Complex(0.0, 0.0);
        this.dt = dt;
        this.m = m;
        this.hbar = hbar;
        this.dimensions = dimensions;
        this.gridDimensions = gridDimensions;
    }
}

function splitStepSpatial(psiF, psiI, potential, simParams) {
    let params = simParams;
    psiF.draw(
        gPrograms.splitStepSpatial,
        {dt: params.dt, m: params.m, hbar: params.hbar,
         potentialTex: potential, psiTex: psiI
        }
    );
}

function splitStepMomentum(psiF, psiI, kineticEnergy, simParams) {
    let params = simParams;
    let uniforms = {
        numberOfDimensions: new IScalar(2),
        texelDimensions2D: params.gridDimensions,
        dimensions2D: params.dimensions,
        dt: params.dt,
        m: params.m, hbar: params.hbar,
        psiTex: psiI,
        useCustomKETex: false,
    };
    if (kineticEnergy !== null) {
        uniforms.useCustomKETex = true;
        uniforms['customKETex'] = kineticEnergy;
    }
    psiF.draw(
        gPrograms.splitStepMomentum,
        uniforms
    )
}

export default function splitStep(psiF, psiI,
                                  kineticEnergy, potential,
                                  simParams, 
                                  momentumPsiOutput=null) {
    let spatialSimParams = new SimulationParameters(
        simParams.hbar, simParams.m, div(simParams.dt, 2.0),
        simParams.dimensions, simParams.gridDimensions
    );
    splitStepSpatial(psiF, psiI, potential, spatialSimParams);
    fft2D(psiI, psiF);
    if (momentumPsiOutput !== null) {
        console.log(momentumPsiOutput, psiI);
        fftShift(momentumPsiOutput, psiI);
    }
    splitStepMomentum(psiF, psiI, kineticEnergy, simParams);
    ifft2D(psiI, psiF);
    splitStepSpatial(psiF, psiI, potential, spatialSimParams);
}

export function splitStepWithExponentialStepOperatorsAsParameters(
    psiF, psiI,
    kineticExponential, potentialExponential
) {
    psiF.draw(
        gPrograms.mul,
        {tex1: psiI, tex2: potentialExponential});
    fft2D(psiI, psiF);
    psiF.draw(
        gPrograms.mul,
        {tex1: psiI, tex2: kineticExponential});
    ifft2D(psiI, psiF);
    psiF.draw(
        gPrograms.mul,
        {tex1: psiI, tex2: potentialExponential});
}
