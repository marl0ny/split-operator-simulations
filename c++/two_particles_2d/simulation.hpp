#include "gl_wrappers.hpp"
#include "parameters.hpp"
#include "split_step4d.hpp"

#ifndef _SIMULATION_
#define _SIMULATION_

using namespace sim_2d;

struct Frames {
    TextureParams sim_params;
    TextureParams view_params;
    TextureParams slice_xy_params;
    TextureParams slice_zw_params;
    Quad psi[2];
    split_step4d::QuadTemps split_step_tmp;
    Quad transposed[2];
    Quad projected_views[2];
    Quad prob_density;
    Quad int_potential;
    Quad ext_potential;
    Quad potential;
    Quad xy_slice;
    Quad zw_slice;
    RenderTarget render;
    WireFrame quad_wire_frame;
    Frames(const TextureParams &default_tex_params, const SimParams &params);
};

struct Programs {
    uint32_t scale, add2, add4_r, cross, norm_squared, slice;
    uint32_t domain_coloring, transpose, wave_packet, harmonic;
    uint32_t interaction, rgb_combine;
    struct {
        uint32_t momentum, spatial;
        struct {
            uint32_t rev_bit_sort2, fft_iter;
        } fft;
    } split_step;
    Programs();
};

class Simulation {
    Programs m_programs;
    Frames m_frames;
    int step_counter;
    void initial_conditions(const SimParams &params);
    public:
    Simulation(
        const TextureParams &default_tex_params, 
        const SimParams &params);
    void step(const SimParams &params);
    const RenderTarget &view(const SimParams &params);
    const RenderTarget
    &view(SimParams &params, ::Quaternion rotation, float scale);
};



#endif
