#ifndef _GAUSSIAN_WAVE_PACKET2D_
#define _GAUSSIAN_WAVE_PACKET2D_

#include "fft2d.hpp"
#include "dirac_split_step2d.hpp"
#include "spinors.hpp"

namespace gaussian_wave_packet2d {

Vec2 wave_number_to_momentum(Vec2 wave_number, Vec2 dimensions2d);

Vec2 tex_to_sim_coordinates(Vec2 tex_coord, Vec2 dimensions2d);

struct MomentumInitParams {
    float amplitude;
    Vec2 sigma; // Position space standard deviation of the wave packet
    Vec2 p0; // Average momentum
    Vec2 x0; // average position
    spinors::BiSpinor s; // If use_energy_states_combination set to false,
    // use this to initialize the spinor part of the wave function.
    bool use_energy_states_combinations;
    bool invert_negative_energy_momentum;
    Vec2 dimensions2d;
    IVec2 texel_dimensions2d;
    std::complex<float> coefficients[4];
    float m;
    float c;
    float hbar;
};

void momentum_init(dirac_split_step2d::BiSpinorQuad &dst,
                   fft2d::QuadTemps &temps,
                   fft2d::Programs fft_programs,
                   uint32_t momentum_init_program,
                   MomentumInitParams params);


struct SpatialInitParams {
    Vec2 wave_number;
    Vec2 offset_tex_coord;
    float amplitude;
    Vec2 sigma_tex_coord;
    spinors::BiSpinor s;
    bool use_energy_states_combinations;
    bool invert_negative_energy_momentum;
    Vec2 dimensions2d;
    IVec2 texel_dimensions2d;
    std::complex<float> coefficients[4];
    float m;
    float c;

};

void spatial_init(dirac_split_step2d::BiSpinorQuad &dst,
                  uint32_t position_init_program,
                  SpatialInitParams params);

}


#endif