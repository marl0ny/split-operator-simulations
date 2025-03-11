#include "gl_wrappers.hpp"
#include "parameters.hpp"
#include "dirac_split_step2d.hpp"

#ifndef _SIM_2D_
#define _SIM_2D_

namespace sim_2d {

struct Frames {
    TextureParams view_tex_params;
    TextureParams sim_tex_params;
    Quad visual_intermediate;
    dirac_split_step2d::BiSpinorQuad psi;
    Quad potential;
    dirac_split_step2d::QuadTemps temps;
    RenderTarget view;
    Frames(
        const SimParams &sim_params, int view_width, int view_height);
};

struct GLSLPrograms {
    dirac_split_step2d::Programs split_operator;
    uint32_t domain_color;
    uint32_t wave_packet;
    uint32_t momentum_init;
    uint32_t current;
    uint32_t pseudocurrent;
    uint32_t scalar;
    uint32_t pseudoscalar;
    uint32_t spin;
    uint32_t arrows;
    uint32_t scale;
    uint32_t copy;
    uint32_t harmonic;
    uint32_t all_alpha;
    uint32_t combine_potential_view;
    uint32_t sketch_potential;
    GLSLPrograms();
};

class Simulation {
    GLSLPrograms m_programs;
    Frames m_frames;
    WireFrame m_quad_wire_frame;
    WireFrame m_arrows_wire_frame;
    public:
    Simulation(
        const SimParams &sim_params, int view_width, int view_height);
    void time_steps(const SimParams &sim_params);
    const RenderTarget &render_view(
        SimParams sim_params, Vec2 cursor_pos
    );
    void new_wave_function(
        const SimParams &sim_params,
        const Vec2 &tex_pos, const Vec2 &wave_num);
    void sketch_modify_scalar_potential(
        const SimParams &sim_params, const Vec2 &pos);
    void sketch_modify_vector_potential(
        const SimParams &sim_params,
        const Vec2 &pos, const Vec2 &dir);
};

}


#endif