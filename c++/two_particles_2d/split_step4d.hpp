#ifndef _SPLIT_STEP4D_
#define _SPLIT_STEP4D_

#include "gl_wrappers.hpp"
#include "fft4d.hpp"

namespace split_step4d {

    struct SplitStepParameters {
        float dt, m1, m2, c;
        float hbar;
        Vec4 dimensions4d;
        IVec4 texel_dimensions4d;
    };

    struct Programs {
        uint32_t momentum_step;
        uint32_t spatial_step;
        fft4d::Programs fft;
    };

    struct QuadTemps {
        Quad psi_p[2];
        Quad psi_x[2];
        fft4d::QuadTemps fft;
    };

    void split_step_momentum(
        Quad &psi_final, const Quad &psi_init,
        QuadTemps &intermediate_quantities,
        Programs glsl_programs,
        SplitStepParameters split_step_params
    );

    void split_step_spatial(
        Quad &psi_final,
        const Quad &potential, const Quad &psi_init,
        QuadTemps &intermediate_quantities,
        Programs glsl_programs,
        SplitStepParameters split_step_params
    );

    void split_step(
        Quad &psi_final,
        const Quad &potential, const Quad &psi_init,
        QuadTemps &intermediate_quantities,
        Programs glsl_programs,
        SplitStepParameters split_step_params
    );

};

#endif