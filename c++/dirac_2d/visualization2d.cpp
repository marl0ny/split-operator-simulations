#include "visualization2d.hpp"

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

void visualization2d::scalar_or_single_component_quantities(
    RenderTarget &dst_render, WireFrame &dst_wireframe,
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
        dst_render.draw(
            programs.all_alpha,
            {
                {"tex", {&intermediate_quantity}},
                {"scale", {params.brightness}}
            },
            dst_wireframe
        );
    }
    if (options.pseudocurrent_time_component) {
        compute_current(
            intermediate_quantity, psi, programs.pseudocurrent,
            {.hbar=params.hbar, .representation=int(0)});
        current_computed_stored = false;
        dst_render.draw(
            programs.all_alpha,
            {
                {"tex", {&intermediate_quantity}},
                {"scale", {params.brightness}}
            },
            dst_wireframe
        );
    }
    if (options.scalar) {
        compute_scalar(
            intermediate_quantity, psi, programs.scalar, 0
        );
        current_computed_stored = false;
        dst_render.draw(
            programs.domain_color,
            {
                {"tex", {&intermediate_quantity}},
                {"index", {int(0)}},
                {"brightness", {params.brightness}},
            },
            dst_wireframe
        );
    }
    // TODO!
    /* if (options.pseudoscalar) {
        current_computed_stored = false;
    }*/
    if (options.total_magnitude_w_phase[0]) {
        if (!current_computed_stored)
            compute_current(
                intermediate_quantity, psi, programs.current,
                {.hbar=params.hbar, .representation=int(0)});
    }
    if (options.total_magnitude_w_phase[1]) {
        if (!current_computed_stored)
            compute_current(
                intermediate_quantity, psi, programs.current,
                {.hbar=params.hbar, .representation=int(0)});
    } else if (options.total_magnitude_w_phase[2]) {
        if (!current_computed_stored)
            compute_current(
                intermediate_quantity, psi, programs.current,
                {.hbar=params.hbar, .representation=int(0)});
    }
    if (options.total_magnitude_w_phase[3]) {
        if (!current_computed_stored)
            compute_current(
                intermediate_quantity, psi, programs.current,
                {.hbar=params.hbar, .representation=int(0)});
    }
    if (options.component_magnitude_w_phase[0]) {
        dst_render.draw(
            programs.domain_color,
            {
                {"tex", {&psi.u}},
                {"index", {int(0)}},
                {"brightness", {params.brightness}},
                {"phaseAdjust", params.c*params.c*params.m*params.t}
            },
            dst_wireframe
        );
    }
    if (options.component_magnitude_w_phase[1]) {
        dst_render.draw(
            programs.domain_color,
            {
                {"tex", {&psi.u}},
                {"index", {int(1)}},
                {"brightness", {params.brightness}},
                {"phaseAdjust", params.c*params.c*params.m*params.t}
            },
            dst_wireframe
        );
    }
    if (options.component_magnitude_w_phase[2]) {
        dst_render.draw(
            programs.domain_color,
            {
                {"tex", {&psi.v}},
                {"index", {int(0)}},
                {"brightness", {params.brightness}},
                {"phaseAdjust", -params.c*params.c*params.m*params.t}
            },
            dst_wireframe
        );
    }
    if (options.component_magnitude_w_phase[3]) {
        dst_render.draw(
            programs.domain_color,
            {
                {"tex", {&psi.v}},
                {"index", {int(1)}},
                {"brightness", {1.0F}},
                {"phaseAdjust", -params.c*params.c*params.m*params.t}
            },
            dst_wireframe
        );
    }
    if (options.scalar_potential) {
        intermediate_quantity.draw(
            programs.add_scalar_potential,
            {
                {"initialTex", {&dst_render}},
                {"potentialBrightness", {params.potential_brightness}},
                {"potentialTex", {&potential}}
            }
        );
        dst_render.draw(
            programs.copy,
            {
                {"tex", {&intermediate_quantity}}
            },
            dst_wireframe
        );

    }
}

void visualization2d::vector_quantities(
    RenderTarget &dst_render, WireFrame &dst_wireframe,
    Quad &intermediate_quantity,
    const dirac_split_step2d::BiSpinorQuad &psi,
    const Quad &potential,
    const Options &options,
    const VectorQuantitiesPrograms &programs,
    const VectorQuantitiesParams &params) {
    if (options.spatial_current) {
        compute_current(
                intermediate_quantity, psi, 
                programs.current, {
                    .hbar=params.hbar, .representation=params.representation});
        dst_render.draw(
            programs.arrows,
            {
                {"tex", {&psi.u}},
                {"scale", {10.0F}},
                {"vecTex", {&intermediate_quantity}},
                {"arrowScale", {params.arrows_scale}},
                {"maxLength", {params.arrows_max_length}},
                {"color", {Vec4{.ind{2.0, 2.0, 2.0, 2.0}}}}
            },
            dst_wireframe
        );
    }
    if (options.spatial_pseudocurrent) {
        compute_current(
            intermediate_quantity, psi, 
            programs.pseudocurrent, {
                .hbar=params.hbar, .representation=params.representation});
        dst_render.draw(
            programs.arrows,
            {
                {"tex", {&psi.u}},
                {"scale", {10.0F}},
                {"vecTex", {&intermediate_quantity}},
                {"arrowScale", {params.arrows_scale}},
                {"maxLength", {params.arrows_max_length}},
                {"color", {Vec4{.ind{2.0, 2.0, 2.0, 2.0}}}}
            },
            dst_wireframe
        );
    }
    if (options.vector_potential) {
        dst_render.draw(
            programs.arrows,
            {
                {"tex", {&potential}},
                {"scale", {10.0F}},
                {"vecTex", {&potential}},
                {"arrowScale", {params.arrows_scale}},
                {"maxLength", {params.arrows_max_length}},
                {"color", {Vec4{.ind{2.0, 2.0, 2.0, 2.0}}}}
            },
            dst_wireframe
        );
    }
    if (options.electric_field) {
        // TODO
    }
    if (options.magnetic_field) {
        // TODO
    }
}

void visualization2d::spin_quantities(
    RenderTarget &dst_render, WireFrame &dst_wireframe, 
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
        dst_render.draw(
            programs.arrows,
            {
                {"tex", {&psi.u}},
                {"scale", {10.0F}},
                {"vecTex", {&intermediate_quantity}},
                {"arrowScale", {params.arrows_scale}},
                {"maxLength", {params.arrows_max_length}},
                {"color", {Vec4{.ind{0.0, 0.0, 1.0, 1.0}}}}
            },
            dst_wireframe
        );
    }
    if (options.spin[1]) {
        intermediate_quantity.draw(
            programs.spin,
            {
                {"psiTex", {&psi.v}},
            }
        );
        dst_render.draw(
            programs.arrows,
            {
                {"tex", {&psi.v}},
                {"scale", {10.0F}},
                {"vecTex", {&intermediate_quantity}},
                {"arrowScale", {params.arrows_scale}},
                {"maxLength", {params.arrows_max_length}},
                {"color", {Vec4{.ind{1.0, 0.0, 0.0, 1.0}}}}
            },
            dst_wireframe
        );
    }
}