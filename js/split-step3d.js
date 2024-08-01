/* Script for managing the 3D split step implementation
*/
import { Quad, IScalar, Complex, div, 
         get2DFrom3DDimensions } from "./gl-wrappers.js";
import { fft3D, fftShift3D, ifft3D } from "./fft3d.js";
import { getShader } from "./shaders.js";

let gPrograms = {
    splitStepMomentum: 
        Quad.makeProgramFromSource(
            getShader('./shaders/split-step/kinetic.frag')),
    splitStepSpatial: 
        Quad.makeProgramFromSource(
            getShader('./shaders/split-step/spatial.frag')
        )
};

export class SimulationParameters {
    t;
    dt;
    m;
    hbar;
    dimensions; // simulation dimensions of the 3D rectangular domain
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
    // console.log(get2DFrom3DDimensions(params.gridDimensions));
    let uniforms = {
        numberOfDimensions: new IScalar(3),
        texelDimensions2D: get2DFrom3DDimensions(params.gridDimensions),
        texelDimensions3D: params.gridDimensions,
        dimensions3D: params.dimensions,
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

export default function splitStep3D(psiF, psiI,
                                    kineticEnergy, potential,
                                    simParams, 
                                    momentumPsiOutput=null) {
    let spatialSimParams = new SimulationParameters(
        simParams.hbar, simParams.m, div(simParams.dt, 2.0),
        simParams.dimensions, simParams.gridDimensions
    );
    splitStepSpatial(psiF, psiI, potential, spatialSimParams);
    fft3D(psiI, psiF);
    if (momentumPsiOutput !== null) {
        console.log(momentumPsiOutput, psiI);
        fftShift3D(momentumPsiOutput, psiI);
    }
    splitStepMomentum(psiF, psiI, kineticEnergy, simParams);
    ifft3D(psiI, psiF);
    splitStepSpatial(psiF, psiI, potential, spatialSimParams);
}
