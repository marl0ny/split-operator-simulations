#include "gl_wrappers.hpp"
#include "parameters.hpp"
#include "volume_render.hpp"
#include "planar_slice.hpp"
#include "line_arrows3d.hpp"
#include "conical_arrow3d.hpp"

#ifndef _SIMULATION_
#define _SIMULATION_

using namespace sim_3d;

struct Frames {
    TextureParams view_tex_params;
    TextureParams sim_tex_params;
    TextureParams data_reduce_tex_params;
    RenderTarget render_tmp;
    RenderTarget render;
    Quad data_reduce;
    Quad temps[4];
    Quad spinors[2][2];
    Quad potential;
    Quad potential_prev;
    WireFrame quad_wire_frame;
    WireFrame arrows3d_frame;
    WireFrame conical_arrows3d_frame;
    Frames(const TextureParams &default_tex_params, const SimParams &params);
    void reset_simulation_dimensions(IVec3 texel_dimensions_3d);
    void reset_data_reduce_dimensions(IVec3 data_reduce_dimensions_3d);
};

struct Programs {
    unsigned int copy;
    unsigned int user_defined;
    unsigned int roll_0to3;
    struct {
        unsigned int domain_color;
        unsigned int blur;
        unsigned int gradient;
        unsigned int cube_outline;
        unsigned int cursor_outline;
        unsigned int axes_3d;
        unsigned int axes_labels_3d;
        unsigned int scalar;
        unsigned int current;
        unsigned int vector_potential;
    } visualization;
    struct {
        unsigned int position;
        unsigned int momentum;
    } wavepacket;
    struct {
        unsigned int scalar_potential;
        unsigned int vector_potential;
        unsigned int erase_vector_potential;
    } sketch;
    struct {
        unsigned int momentum, spatial;
    } split_step;
    struct {
        unsigned int current, pseudo_current;
        unsigned int scalar, pseudo_scalar;
    } quantities;
    struct {
        unsigned int e, m;
    } em_field;
    struct {
        unsigned int iter_cube, rev_bit_sort2, shift;
    } fft;
    Programs();
};

class Simulation {
    volume_render::VolumeRender m_volume_render;
    planar_slice::PlanarSlices m_planar_slices;
    line_arrows3d::Arrows m_arrows3d;
    conical_arrows3d::Arrows m_conical_arrows3d;
    Vec3 m_cursor_location;
    Programs m_programs;
    Frames m_frames;
    std::vector<unsigned char> m_image_rgba_arr;
    std::vector<unsigned char> m_image_data;
    bool is_time_dependent_potential = false;
    const RenderTarget
    &view_volume_render(
        SimParams &params, ::Quaternion rotation, float scale);
    const RenderTarget
    &view_planar_slices(
        SimParams &params, ::Quaternion rotation, float scale);

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
    void arrows_view(
        const SimParams &params,
        const std::optional<Vec2> &hover,
        ::Quaternion rotation, float scale);
    void handle_all_arrow_views(
        const SimParams &params,
        const std::optional<Vec2> &hover,
        ::Quaternion rotation, float scale
    );

    public:
    Simulation(const TextureParams &default_tex_params,
               const SimParams &params);
    void time_step(const SimParams &sim_params);
    const RenderTarget 
    &view(const SimParams &params,
        const std::optional<Vec2> &hover,
        ::Quaternion rotation, float scale);

    const RenderTarget &view_data_texture(
        SimParams &params, ::Quaternion rotation, float scale
    );
    const RenderTarget &view_volume_texture(
        SimParams &params, ::Quaternion rotation, float scale
    );

    void add_user_defined(
        const SimParams &params,
        unsigned int program,
        const std::map<std::string, float> &uniforms,
        bool is_time_dependent);

    void reset_simulation_dimensions(IVec3 sim_dimensions_3d);
    void reset_data_reduce_dimensions(IVec3 texel_dimensions_3d);
    void reset_volume_dimensions(IVec3 volume_dimensions_3d);
    void reset_volume_filtering(unsigned int filtering);

    Vec3 get_cursor_location();
    Vec3 get_scaled_cursor_location(const SimParams &params);
    std::vector<unsigned char> &get_image_data();

    void init(const SimParams &sim_params,
        const Vec3 &tex_pos, const IVec3 &wave_num, float sigma);
    void init_momentum(const SimParams &params,
        const Vec3 &tex_pos, const IVec3 &wave_num, float sigma);
    void init_from_cursor_position(
        const SimParams &sim_params,
        Quaternion rotate, float scale,
        int offset_xy, int offset_yz, int offset_xz,
        const Vec2 &cursor_pos, const IVec3 &wave_num, float sigma);
    void init_from_cursor_positions(
        const SimParams &sim_params,
        Quaternion rotate, float scale,
        int offset_xy, int offset_yz, int offset_xz,
        const Vec2 &cursor_pos1, const Vec2 &cursor_pos2, float sigma);
    void init_from_cursor_positions(
        const SimParams &sim_params,
        Quaternion rotate, float scale,
        const Vec2 &cursor_pos1, const Vec2 &cursor_pos2, float sigma);
    void sketch_modify_potential(
        const SimParams &sim_params,
        Quaternion rotate, float scale, const Vec2 cursor_pos,
        float amplitude, float size
    );
    void sketch_modify_potential(
        const SimParams &sim_params,
        Quaternion rotate, float scale, 
        const Vec2 cursor_pos1, const Vec2 cursor_pos2,
        float amplitude, float size
    );
    void erase_modify_potential(
        const SimParams &sim_params,
        Quaternion rotate, float scale, 
        const Vec2 cursor_pos1,
        float amplitude, float size
    );
    float get_max_free_particle_energy(const SimParams &sim_params) const;
    bool is_inside(
        const SimParams &params,
        Quaternion rotate, float scale,
        const Vec2 &cursor_pos) const;
};

#endif