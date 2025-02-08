#ifndef _DIRAC_SPLIT_STEP2D_
#define _DIRAC_SPLIT_STEP2D_

#include "gl_wrappers.hpp"
#include "fft2d.hpp"

namespace dirac_split_step2d {

    struct BiSpinorQuad {
        BiSpinorQuad(TextureParams t): u(t), v(t) {}
        union {
            struct {
                Quad ind[2];
            };
            struct {
                Quad u, v;
            };
        };
        Quad &operator[](int i) {
            return this->ind[i];
        }
        
        BiSpinorQuad(BiSpinorQuad &&) = delete;
        BiSpinorQuad(BiSpinorQuad &) = delete;
        BiSpinorQuad &operator=(BiSpinorQuad &) = delete;
        BiSpinorQuad &operator=(BiSpinorQuad &&) = delete;
        ~BiSpinorQuad() {
            this->u.~Quad();
            this->v.~Quad();
        }
    };

    struct SplitStepParameters {
        float dt, m, c;
        float hbar;
        Vec2 dimensions2d;
        IVec2 texel_dimensions2d;
    };

    struct Programs {
        uint32_t momentum_step;
        uint32_t spatial_step;
        fft2d::Programs fft;
    };

    struct QuadTemps {
        BiSpinorQuad psi_p[2];
        BiSpinorQuad psi_x[2];
        fft2d::QuadTemps fft;
    };

    void split_step_momentum(
        BiSpinorQuad &psi_final,
        const BiSpinorQuad &psi_init,
        QuadTemps &intermediate_quantities,
        Programs glsl_programs,
        SplitStepParameters split_step_params
    );

    void split_step_spatial(
        BiSpinorQuad &psi_final,
        const Quad &potential,
        const BiSpinorQuad &psi_init,
        QuadTemps &intermediate_quantities,
        Programs glsl_programs,
        SplitStepParameters split_step_params
    );

    void split_step(
        BiSpinorQuad &psi_final,
        const Quad &potential,
        const BiSpinorQuad &psi_init,
        QuadTemps &intermediate_quantities,
        Programs glsl_programs,
        SplitStepParameters split_step_parameters

    );

}

#endif