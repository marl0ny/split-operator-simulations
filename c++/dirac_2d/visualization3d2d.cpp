#include "visualization3d2d.hpp"
#include <complex>

static Vec4 encode_2x2(float m00, float m11, std::complex<float> m01) {
    return {
        .ind{m00, m11, 
        std::real(m01), std::imag(m01)}};
}

struct DrawCurrentParams {
    float hbar;
    int representation;
};

static void compute_current(
    Quad &current, const dirac_split_step2d::BiSpinorQuad &psi,
    uint32_t draw_current_program,
    DrawCurrentParams params) {
    float hbar = params.hbar;
    std::complex<float> i (0.0, 1.0);
    current.draw(
        draw_current_program,
        {
            {"sigmaX", {encode_2x2(0.0, 0.0, hbar/2.0F)}},
            {"sigmaY", {encode_2x2(0.0, 0.0, -i*hbar/2.0F)}},
            {"sigmaZ", {encode_2x2(hbar/2.0F, -hbar/2.0F, 0.0)}},
            {"uTex", {&psi.u}},
            {"vTex", {&psi.v}},
            {"representation", {params.representation}}
        }
    );
}

static void compute_scalar(
    Quad &scalar, const dirac_split_step2d::BiSpinorQuad &psi,
    uint32_t draw_scalar_program,
    int representation
) {
    scalar.draw(
        draw_scalar_program,
        {
            {"uTex", {&psi.u}},
            {"vTex", {&psi.v}},
            {"representation", {int(0)}}
        }
    );
}

enum {
    REAL_DATA_TYPE = 0,
    COMPLEX_DATA_TYPE_FRONT = 1,
    COMPLEX_DATA_TYPE_BACK = 2,
    FOUR_VEC_GET_LAST_TYPE = 3,
};


void visualization3d2d::scalar_or_single_component_quantities(
    RenderTarget &dst_render,
    WireFrame &surface_wireframe,
    WireFrame &quad_wireframe,
    Quad &intermediate_quantity,
    const dirac_split_step2d::BiSpinorQuad &psi,
    const Quad &potential,
    const Options &options,
    const ScalarQuantitiesPrograms &programs,
    const ScalarQuantitiesParams &params
) {
    bool current_computed_stored = false;
    if (options.current_time_component) {
        compute_current(
            intermediate_quantity, psi, programs.current,
            {.hbar=params.hbar, .representation=int(0)});
        current_computed_stored = true;
    }
    if (options.pseudocurrent_time_component) {
        compute_current(
            intermediate_quantity, psi, programs.pseudocurrent,
            {.hbar=params.hbar, .representation=int(0)});
        current_computed_stored = false;
    }
    if (options.current_time_component
        || options.pseudocurrent_time_component) {
       dst_render.draw(
           programs.surface_all_alpha, {
               {"heightTex", &intermediate_quantity},
               {"rotation", params.rotation},
               {"screenDimensions", params.screen_dimensions},
               {"translate", Vec3{.ind{0.0, 0.0, 0.0}}},
               {"heightScale", 0.5F},
               {"scale", params.scale},
               {"dimensions2D", 
                   IVec2{.ind{1024, 1024}}},
               {"tex", &intermediate_quantity},
               {"brightness", params.brightness},
               {"heightDataType", int(FOUR_VEC_GET_LAST_TYPE)}
           },
           surface_wireframe
       );
   }
    if (options.scalar) {
        compute_scalar(
            intermediate_quantity, psi, programs.scalar, 0
        );
        dst_render.draw(
            programs.surface_domain_coloring, {
                {"heightTex", &intermediate_quantity},
                {"rotation", params.rotation},
                {"screenDimensions", params.screen_dimensions},
                {"translate", Vec3{.ind{0.0, 0.0, 0.0}}},
                {"heightScale", 0.5F},
                {"scale", params.scale},
                {"dimensions2D", 
                    IVec2{.ind{1024, 1024}}},
                {"tex", &intermediate_quantity},
                {"brightness", params.brightness},
                {"heightDataType", int(COMPLEX_DATA_TYPE_FRONT)}
            },
            surface_wireframe
        );
        current_computed_stored = false;
    }
    if (options.component_magnitude_w_phase[0] 
        || options.component_magnitude_w_phase[1]
        || options.component_magnitude_w_phase[2]
        || options.component_magnitude_w_phase[3]) {
        const Quad *height_tex;
        int data_type, index;
        if (options.component_magnitude_w_phase[0]) {
            height_tex = &psi.u;
            index = 0;
            data_type = COMPLEX_DATA_TYPE_FRONT;
        } else if (options.component_magnitude_w_phase[1]) {
            height_tex = &psi.u;
            index = 1;
            data_type = COMPLEX_DATA_TYPE_BACK;
        } else if (options.component_magnitude_w_phase[2]) {
            height_tex = &psi.v;
            index = 0;
            data_type = COMPLEX_DATA_TYPE_FRONT;
        } else {
            height_tex = &psi.v;
            index = 1;
            data_type = COMPLEX_DATA_TYPE_BACK;
        }
        dst_render.draw(
            programs.surface_domain_coloring, {
                {"heightTex", height_tex},
                {"rotation", params.rotation},
                {"screenDimensions", params.screen_dimensions},
                {"translate", Vec3{.ind{0.0, 0.0, 0.0}}},
                {"heightScale", 1.0F},
                {"scale", params.scale},
                {"dimensions2D", 
                    IVec2{.ind{1024, 1024}}},
                {"tex", height_tex},
                {"brightness", params.brightness},
                {"index", int(index)},
                {"heightDataType", int(data_type)}
            },
            surface_wireframe
        );
    }
    if (options.scalar_potential) {
        dst_render.draw(
            programs.surface_single_color, {
                {"heightTex", &potential},
                {"rotation", params.rotation},
                {"screenDimensions", params.screen_dimensions},
                {"translate", Vec3{.ind{0.0, 0.0, 0.1}}},
                {"heightScale", 0.01F},
                {"scale", params.scale},
                {"dimensions2D", 
                    IVec2{.ind{1024, 1024}}},
                {"tex", &potential},
                {"brightness", params.brightness},
                {"color", Vec4{.r=1.0, 1.0, 1.0, 0.5}},
                {"heightDataType", FOUR_VEC_GET_LAST_TYPE}
            },
            surface_wireframe
        );
    }
}