#include "gl_wrappers.hpp"
#include "parameters.hpp"
#include "planar_slice.hpp"
#include <cstdint>

#ifndef _SIM_3D_
#define _SIM_3D_

namespace sim_3d {

struct Frames {
    TextureParams view_tex_params;
    TextureParams sim_tex_params;
    RenderTarget main_render;
    Quad temps[10];
    Quad spinors[2][2];
    Quad potential;
    Quad tmp[2];
    public:
    Frames(
        const SimParams &sim_params, int view_width, int view_height);
};

struct GLSLPrograms {
    uint32_t copy, add2;
    uint32_t init;
    uint32_t momentum_step, spatial_step;
    uint32_t current, pseudo_current;
    uint32_t scalar, pseudo_scalar;
    uint32_t fft_iter, fft_iter_cube, rev_bit_sort2, fft_shift;
    uint32_t uniform_color;
    uint32_t all_alpha;
    uint32_t domain_coloring;
    GLSLPrograms();
};

class Simulation {
    GLSLPrograms m_programs;
    Frames m_frames;
    WireFrame m_quad_wire_frame;
    planar_slice::PlanarSlices m_planar_slices;
    void fft(Quad *dst, Quad *src, SimParams sim_params);
    void ifft(Quad *dst, Quad *src, SimParams sim_params);
    void split_step_momentum(
        Quad &dst, int index,
        const Quad &u, const Quad &v,
        SimParams sim_params);
    void split_step_spatial(
        Quad &dst, int index,
        const Quad &u, const Quad &v, const Quad &potential,
        SimParams sim_params, float dt);
    void split_step(const SimParams &sim_params);
    public:
    Simulation(const SimParams &sim_params, int view_width, int view_height);
    void init_from_cursor_position(
        const SimParams &sim_params,
        Quaternion rotate, float scale,
        int offset_xy, int offset_yz, int offset_xz,
        const Vec2 &cursor_pos, const IVec3 &wave_num, float sigma
    );
    void init_from_cursor_positions(
        const SimParams &sim_params,
        Quaternion rotate, float scale,
        int offset_xy, int offset_yz, int offset_xz,
        const Vec2 &cursor_pos1, const Vec2 &cursor_pos2, float sigma
    );
    void init(const SimParams &sim_params,
              const Vec3 &tex_pos, const IVec3 &wave_num, float sigma);
    void set_potential_from_program(
        uint32_t program, const Uniforms &uniforms,
        const SimParams &sim_params);
    void time_step(const SimParams &sim_params);
    const RenderTarget &render_view(
        SimParams sim_params, Quaternion rotation, float scale,
        Vec2 screen_cursor_pos);
};

}

#endif