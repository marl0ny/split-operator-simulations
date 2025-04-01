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

static void compute_electric(
    Quad &electric,
    const Quad &potential_prev, const Quad &potential_curr,
    uint32_t electric_program, 
    float dt, IVec2 texel_dimensions_2d, Vec2 dimensions_2d
) {
    electric.draw(
        electric_program,
        {
            {"prevATex", &potential_prev},
            {"currATex", &potential_curr},
            {"texelDimensions2D", texel_dimensions_2d},
            {"dimensions2D", dimensions_2d},
            {"dt", float(dt)}
        }
    );
}

static void compute_magnetic(
    Quad &magnetic, const Quad &potential, uint32_t magnetic_program,
    IVec2 texel_dimensions_2d, Vec2 dimensions_2d
) {
    magnetic.draw(
        magnetic_program,
        {
            {"vecPotentialTex", &potential},
            {"texelDimensions2D", texel_dimensions_2d},
            {"dimensions2D", dimensions_2d}
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
    if (options.pseudoscalar) {
        compute_scalar(
            intermediate_quantity, psi, 
            programs.pseudoscalar, 0
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
        float phase_adjust;
        if (options.component_magnitude_w_phase[0]) {
            height_tex = &psi.u;
            index = 0;
            data_type = COMPLEX_DATA_TYPE_FRONT;
            phase_adjust = params.c*params.c*params.m*params.t;
        } else if (options.component_magnitude_w_phase[1]) {
            height_tex = &psi.u;
            index = 1;
            data_type = COMPLEX_DATA_TYPE_BACK;
            phase_adjust = params.c*params.c*params.m*params.t;
        } else if (options.component_magnitude_w_phase[2]) {
            height_tex = &psi.v;
            index = 0;
            data_type = COMPLEX_DATA_TYPE_FRONT;
            phase_adjust = -params.c*params.c*params.m*params.t;
        } else {
            height_tex = &psi.v;
            index = 1;
            data_type = COMPLEX_DATA_TYPE_BACK;
            phase_adjust = -params.c*params.c*params.m*params.t;
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
                {"heightDataType", int(data_type)},
                {"phaseAdjust", phase_adjust}
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

static void draw_arrows(
    RenderTarget &dst_render,
    WireFrame &arrows_wireframe,
    const Quad &src,
    const visualization3d2d::Options &options,
    const visualization3d2d::VectorQuantitiesPrograms &programs,
    const visualization3d2d::VectorQuantitiesParams &params
) {
    dst_render.draw(
        programs.arrows,
        {
            {"vecTex", &src},
            {"arrowsScale", params.arrows_scale},
            {"maxLength", params.arrows_max_length},
            {"rotation", params.rotation},
            {"translate", Vec3{.x=0.0, .y=0.0, .z=0.0}},
            {"scale", params.scale},
            {"screenDimensions", params.screen_dimensions},
            {"color", Vec4{.r=1.0, .g=1.0, .b=1.0, .a=1.0}}
        },
        arrows_wireframe
    );
}

void visualization3d2d::vector_quantities(
    RenderTarget &dst_render,
    WireFrame &arrows_wireframe,
    Quad &intermediate_quantity,
    dirac_split_step2d::BiSpinorQuad &psi,
    const Quad &potential,
    const Options &options,
    const VectorQuantitiesPrograms &programs,
    const VectorQuantitiesParams &params
) {
    if (options.spatial_current) {
        compute_current(
            intermediate_quantity, psi, programs.current,
            {
                .hbar=params.hbar, .representation=params.representation,
            }
        );
        draw_arrows(
            dst_render, arrows_wireframe, intermediate_quantity, 
            options, programs, params);
    }
    if (options.spatial_pseudocurrent) {
        compute_current(
            intermediate_quantity, psi, programs.pseudocurrent,
            {
                .hbar=params.hbar, .representation=params.representation
            }
        );
        draw_arrows(
            dst_render, arrows_wireframe, intermediate_quantity, 
            options, programs, params);
    }
    if (options.vector_potential) {
        draw_arrows(
            dst_render, arrows_wireframe, potential, 
            options, programs, params);
    }
    if (options.electric_field) {
        compute_electric(intermediate_quantity,
            potential, potential, programs.electric, 
            params.dt, params.texel_dimensions, params.dimensions);
        draw_arrows(
            dst_render, arrows_wireframe, intermediate_quantity, 
            options, programs, params);
    }
    if (options.magnetic_field) {
        compute_magnetic(intermediate_quantity,
            potential, programs.magnetic, 
            params.texel_dimensions, params.dimensions);
        draw_arrows(
            dst_render, arrows_wireframe, intermediate_quantity, 
            options, programs, params);
    }
}

static void draw_spins(
    RenderTarget &dst_render,
    WireFrame &arrows_wireframe,
    const Quad &src,
    const visualization3d2d::Options &options,
    const visualization3d2d::SpinQuantitiesPrograms &programs,
    const visualization3d2d::SpinQuantitiesParams &params
) {
    dst_render.draw(
        programs.arrows,
        {
            {"vecTex", &src},
            {"arrowsScale", params.arrows_scale},
            {"maxLength", params.arrows_max_length},
            {"rotation", params.rotation},
            {"translate", Vec3{.x=0.0, .y=0.0, .z=0.0}},
            {"scale", params.scale},
            {"screenDimensions", params.screen_dimensions},
            {"color", Vec4{.r=1.0, .g=1.0, .b=1.0, .a=1.0}}
        },
        arrows_wireframe
    );
}

void visualization3d2d::spin_quantities(
    RenderTarget &dst_render,
    WireFrame &arrows_wireframe, 
    Quad &intermediate_quantity,
    dirac_split_step2d::BiSpinorQuad &psi,
    const Options &options,
    const SpinQuantitiesPrograms &programs,
    const SpinQuantitiesParams &params
) {
    if (options.spin[0]) {
        intermediate_quantity.draw(
            programs.spin,
            {
                {"psiTex", {&psi.ind[0]}},
            }
        );
        draw_spins(
            dst_render, arrows_wireframe, intermediate_quantity, 
            options, programs, params);
    }
    if (options.spin[1]) {
        intermediate_quantity.draw(
            programs.spin,
            {
                {"psiTex", {&psi.ind[1]}},
            }
        );
        draw_spins(
            dst_render, arrows_wireframe, intermediate_quantity, 
            options, programs, params);
    }
}