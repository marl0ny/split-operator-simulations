#include "gl_wrappers.hpp"
#include "dirac_split_step2d.hpp"

#ifndef _VISUALIZATION3D2D_
#define _VISUALIZATION3D2D_

namespace visualization3d2d {

struct Options {
    bool current_time_component = false;
    bool pseudocurrent_time_component = false;
    bool scalar_potential = false;
    bool scalar = false;
    bool pseudoscalar = false;
    bool total_magnitude_w_phase[4] {false, false, false, false};
    bool component_magnitude_w_phase[4] {false, false, false, false};
    bool spatial_current = false;
    bool spatial_pseudocurrent = false;
    bool vector_potential = false;
    bool electric_field = false;
    bool magnetic_field = false;
    bool spin[2] {false, false};
};

struct ScalarQuantitiesParams {
    float hbar;
    float brightness;
    float m;
    float c;
    float t;
    float potential_brightness;
    Quaternion rotation;
    float scale;
    IVec2 screen_dimensions;
};

struct ScalarQuantitiesPrograms {
    uint32_t copy;
    uint32_t surface_all_alpha;
    uint32_t surface_domain_coloring;
    uint32_t surface_single_color;
    // uint32_t domain_color;
    // uint32_t all_alpha;
    // uint32_t add_scalar_potential;
    uint32_t uniform_color;
    uint32_t current;
    uint32_t pseudocurrent;
    uint32_t scalar;
    uint32_t pseudoscalar;
};

void scalar_or_single_component_quantities(
    RenderTarget &dst_render, 
    WireFrame &surface_wireframe,
    WireFrame &quad_wireframe,
    Quad &intermediate_quantity,
    const dirac_split_step2d::BiSpinorQuad &psi,
    const Quad &potential,
    const Options &options,
    const ScalarQuantitiesPrograms &programs,
    const ScalarQuantitiesParams &params
);

struct VectorQuantitiesParams {
    float hbar, dt;
    int representation;
    float arrows_max_length;
    float arrows_scale;
    Quaternion rotation;
    float scale;
    IVec2 screen_dimensions;
    IVec2 texel_dimensions;
    Vec2 dimensions;
};

struct VectorQuantitiesPrograms {
    uint32_t arrows;
    uint32_t current;
    uint32_t pseudocurrent;
    uint32_t electric;
    uint32_t magnetic;
};

void vector_quantities(
    RenderTarget &dst_render,
    WireFrame &arrows_wireframe,
    Quad &intermediate_quantity,
    dirac_split_step2d::BiSpinorQuad &psi,
    const Quad &potential,
    const Options &options,
    const VectorQuantitiesPrograms &programs,
    const VectorQuantitiesParams &params
);

struct SpinQuantitiesParams {
    float arrows_max_length;
    float arrows_scale;
    Quaternion rotation;
    float scale;
    IVec2 screen_dimensions;
};

struct SpinQuantitiesPrograms {
    uint32_t arrows;
    uint32_t spin;
};

void spin_quantities(
    RenderTarget &dst_render,
    WireFrame &arrows_wireframe, 
    Quad &intermediate_quantity,
    dirac_split_step2d::BiSpinorQuad &psi,
    const Options &options,
    const SpinQuantitiesPrograms &programs,
    const SpinQuantitiesParams &params
);

}

#endif