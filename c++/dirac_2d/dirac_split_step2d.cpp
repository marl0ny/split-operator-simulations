#include "dirac_split_step2d.hpp"
#include "fft2d.hpp"

using namespace dirac_split_step2d;

static void fft(BiSpinorQuad &dst, const BiSpinorQuad &src,
                fft2d::QuadTemps &temps,
                fft2d::Programs fft_programs,
                IVec2 texel_dimensions) {
    fft2d::fft(
        dst[0], src.ind[0],
        temps, fft_programs,
        texel_dimensions
    );
    fft2d::fft(
        dst[1], src.ind[1],
        temps, fft_programs,
        texel_dimensions
    );
}

static void ifft(BiSpinorQuad &dst, const BiSpinorQuad &src,
                 fft2d::QuadTemps &temps,
                 fft2d::Programs fft_programs,
                 IVec2 texel_dimensions) {
    fft2d::ifft(
        dst[0], src.ind[0],
        temps, fft_programs,
        texel_dimensions
    );
    fft2d::ifft(
        dst[1], src.ind[1],
        temps, fft_programs,
        texel_dimensions
    );
}

void dirac_split_step2d::split_step_momentum(
    BiSpinorQuad &psi_final,
    const BiSpinorQuad &psi_init,
    QuadTemps &temps,
    Programs programs,
    SplitStepParameters split_step_params) {
    fft(temps.psi_p[0], psi_init, 
        temps.fft, 
        programs.fft, 
        split_step_params.texel_dimensions2d);
    for (int spinor_index = 0; spinor_index < 2; spinor_index++)
        temps.psi_p[1][spinor_index].draw(
            programs.momentum_step,
            {
                {"numberOfDimensions", {int(2)}},
                {"texelDimensions2D", 
                        {split_step_params.texel_dimensions2d}},
                {"dimensions2D", 
                        {split_step_params.dimensions2d}},
                {"uTex", {&temps.psi_p[0].u}},
                {"vTex", {&temps.psi_p[0].v}},
                {"dt", {split_step_params.dt}},
                {"m", {split_step_params.m}},
                {"c", {split_step_params.c}},
                {"hbar", {split_step_params.hbar}},
                {"spinorIndex", {int(spinor_index)}},
                {"representation", {int(0)}}
            }
        );
    ifft(psi_final, temps.psi_p[1], 
        temps.fft, 
        programs.fft, 
        split_step_params.texel_dimensions2d);
}

void dirac_split_step2d::split_step_spatial(
    BiSpinorQuad &psi_final,
    const Quad &potential,
    const BiSpinorQuad &psi_init,
    QuadTemps &temps,
    Programs programs,
    SplitStepParameters params) {
    for (int spinor_index = 0; spinor_index < 2; spinor_index++)
        psi_final[spinor_index].draw(
            programs.spatial_step,
            {
                {"dt", {params.dt}},
                {"c", {params.c}},
                {"hbar", {params.hbar}},
                {"uTex", {&psi_init.u}},
                {"vTex", {&psi_init.v}},
                {"potentialTex", {&potential}},
                {"spinorIndex", {int(spinor_index)}},
                {"representation", {int(0)}}
            }
        );
}

void dirac_split_step2d::split_step(
    BiSpinorQuad &psi_final,
    const Quad &potential,
    const BiSpinorQuad &psi_init,
    QuadTemps &temps,
    Programs programs,
    SplitStepParameters params
) {
    SplitStepParameters spatial_params {params};
    spatial_params.dt /= 2.0;
    split_step_spatial(
        temps.psi_x[0], potential, psi_init, temps, programs, spatial_params);
    split_step_momentum(
        temps.psi_x[1], temps.psi_x[0], temps, programs, params);
    split_step_spatial(
        psi_final, potential, temps.psi_x[1], temps, programs, spatial_params);
}
