import { Quad, IScalar, Complex, div } from "./gl-wrappers.js";
import { fft2D, ifft2D } from "./fft.js";
import SHADERS from "./shaders.js";

let gPrograms = {
    splitStepMomentum: 
        Quad.makeProgramFromSource(
            SHADERS['./shaders/split-step-momentum.frag']),
    splitStepSpatial: 
        Quad.makeProgramFromSource(
            SHADERS['./shaders/split-step-spatial.frag']
        )
};

export class SimulationParameters {
    t;
    dt;
    m;
    hbar;
    dimensions;
    gridDimensions;
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
        psiTex: psiI
    };
    if (kineticEnergy !== null) {
        uniforms.useCustomKETex = false;
        uniforms.customKETex = kineticEnergy;
    }
    psiF.draw(
        gPrograms.splitStepMomentum,
        uniforms
    )
}

export default function splitStep(psiF, psiI,
                                  kineticEnergy, potential,
                                  simParams) {
    let spatialSimParams = new SimulationParameters(
        simParams.hbar, simParams.m, div(simParams.dt, 2.0),
        simParams.dimensions, simParams.gridDimensions
    );
    splitStepSpatial(psiF, psiI, potential, spatialSimParams);
    fft2D(psiI, psiF);
    splitStepMomentum(psiF, psiI, kineticEnergy, simParams);
    ifft2D(psiI, psiF);
    splitStepSpatial(psiF, psiI, potential, spatialSimParams);
}
