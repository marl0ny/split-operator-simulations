#include "split_step4d.hpp"

void split_step4d::split_step_momentum(
    Quad &psi_final, const Quad &psi_init,
    QuadTemps &temps,
    Programs programs,
    SplitStepParameters params
) {
    fft4d::fft(
        temps.psi_p[0], psi_init, 
        temps.fft, 
        programs.fft, 
        params.texel_dimensions4d);
    temps.psi_p[1].draw(
        programs.momentum_step,
        {
            {"texelDimensions4D", {params.texel_dimensions4d}},
            {"dimensions4D", {params.dimensions4d}},
            {"dt", {Vec2{.ind{params.dt, 0.0}}}},
            {"m1", {params.m1}},
            {"m2", {params.m2}},
            {"hbar", {params.hbar}},
            {"psiTex", {&temps.psi_p[0]}},
            {"useCustomKETex", {false}}
        }
    );
    fft4d::ifft(
        psi_final, temps.psi_p[1], 
        temps.fft, 
        programs.fft, 
        params.texel_dimensions4d);
    
}

void split_step4d::split_step_spatial(
    Quad &psi_final, 
    const Quad &potential, const Quad &psi_init,
    QuadTemps &temps,
    Programs programs,
    SplitStepParameters params
) {
    psi_final.draw(
        programs.spatial_step,
        {
            {"dt", Vec2{.ind{params.dt, 0.0}}},
            // {"m1", {params.m1}},
            // {"m2", {params.m2}},
            {"hbar", params.hbar},
            {"potentialTex", {&potential}},
            {"psiTex", {&psi_init}}
        }
    );
}

void split_step4d::split_step(
    Quad &psi_final, 
    const Quad &potential, const Quad &psi_init,
    QuadTemps &temps,
    Programs programs,
    SplitStepParameters params
) {
    SplitStepParameters momentum_params {params};
    momentum_params.dt /= 2.0;
    split_step_momentum(
        temps.psi_x[0], psi_init, temps, programs, momentum_params);
    split_step_spatial(
        temps.psi_x[1], potential, temps.psi_x[0], temps, programs, params);
    split_step_momentum(
        psi_final, temps.psi_x[1], temps, programs, momentum_params);
}
