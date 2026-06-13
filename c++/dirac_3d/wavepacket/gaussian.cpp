#include "gaussian_wavepacket2d.hpp"


static const float PI = 3.141592653589793;


Vec2 gaussian_wave_packet3d::wave_number_to_momentum(
    Vec3 wave_number, Vec3 dimensions2d
) {
    return {
        .x=2.0F*PI*wave_number.x/dimensions2d.x,
        .y=2.0F*PI*wave_number.y/dimensions2d.y,
    };
}

Vec2 gaussian_wave_packet2d::tex_to_sim_coordinates(
    Vec2 tex_coord, Vec2 dimensions2d
) {
    return {
        .x=tex_coord.x*dimensions2d.x,
        .y=tex_coord.y*dimensions2d.y
    };
}

static void ifft(dirac_split_step2d::BiSpinorQuad &dst,
                 const dirac_split_step2d::BiSpinorQuad &src,
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

using namespace gaussian_wave_packet2d;

void gaussian_wave_packet2d::momentum_init(
    dirac_split_step2d::BiSpinorQuad &dst,
    fft2d::QuadTemps &temps,
    fft2d::Programs fft_programs,
    uint32_t momentum_init_program,
    MomentumInitParams params) {
    Vec2 c0, c1, c2, c3;
    c0.x = std::real(params.coefficients[0]);
    c0.y = std::imag(params.coefficients[0]);
    c1.x = std::real(params.coefficients[1]);
    c1.y = std::imag(params.coefficients[1]);
    c2.x = std::real(params.coefficients[2]);
    c2.y = std::imag(params.coefficients[2]);
    c3.x = std::real(params.coefficients[3]);
    c3.y = std::imag(params.coefficients[3]);
    for (int spinor_index = 0; spinor_index < 2; spinor_index++) {
        dst[spinor_index].draw(
            momentum_init_program, 
            {
                {"amplitude", {params.amplitude}},
                {"sigma", {params.sigma}},
                {"p0", {params.p0}},
                {"x0", {params.x0}},
                {"spinor", {params.s[spinor_index].store_as_vec4()}},
                {"useEnergyStatesCombinations",
                    {int(params.use_energy_states_combinations)}},
                {"invertNegativeEnergyMomentum", 
                    {int(params.invert_negative_energy_momentum)}},
                {"dimensions2D", {params.dimensions2d}},
                {"texelDimensions2D", {params.texel_dimensions2d}},
                {"spinorIndex", {int(spinor_index)}},
                {"representation", {int(0)}},
                {"coefficient0", {c0}},
                {"coefficient1", {c1}},
                {"coefficient2", {c2}},
                {"coefficient3", {c3}},
                {"m", {params.m}},
                {"c", {params.c}},
                {"hbar", {params.hbar}},
            }
        );
    }
    ifft(dst, dst, temps, fft_programs, params.texel_dimensions2d);
}

void gaussian_wave_packet2d::spatial_init(
    dirac_split_step2d::BiSpinorQuad &dst,
    uint32_t position_init_program,
    SpatialInitParams params) {
    Vec2 c0, c1, c2, c3;
    c0.x = std::real(params.coefficients[0]);
    c0.y = std::imag(params.coefficients[0]);
    c1.x = std::real(params.coefficients[1]);
    c1.y = std::imag(params.coefficients[1]);
    c2.x = std::real(params.coefficients[2]);
    c2.y = std::imag(params.coefficients[2]);
    c3.x = std::real(params.coefficients[3]);
    c3.y = std::imag(params.coefficients[3]);
    for (int spinor_index = 0; spinor_index < 2; spinor_index++) {
        dst[spinor_index].draw(
            position_init_program,
            {
                {"waveNumber", params.wave_number},
                {"offsetTexCoord", params.offset_tex_coord},
                {"amplitude", params.amplitude},
                {"sigmaTexCoord", params.sigma_tex_coord},
                {"spinor", params.s[spinor_index].store_as_vec4()},
                {"useEnergyStatesCombinations",
                        int(params.use_energy_states_combinations)},
                {"dimensions2D", params.dimensions2d},
                {"texelDimensions2D", params.texel_dimensions2d},
                {"spinorIndex", int(spinor_index)},
                {"representation", int(0)},
                {"c0", c0},
                {"c1", c1},
                {"c2", c2},
                {"c3", c3},
                {"m", params.m},
                {"c", params.c}
            }
        );
    }     
}
