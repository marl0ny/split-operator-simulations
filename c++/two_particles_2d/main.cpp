#include "gl_wrappers.hpp"
#include "glfw_window.hpp"
#include "split_step4d.hpp"
#include "reduce4d.hpp"
#include "interactor.hpp"


const IVec4 DIMENSIONS_4D {.ind{64, 64, 64, 64}};
// const IVec4 DIMENSIONS_4D {.ind{32, 32, 32, 32}};
const double PI = 3.141592653589793;

Quad quad_with_dimensions(
    uint32_t width, uint32_t height
) {
    return Quad(
        TextureParams {
            .format=GL_RG32F,
            .width=width, .height=height,
            .generate_mipmap=1,
            .wrap_s=GL_REPEAT, .wrap_t=GL_REPEAT,
            .min_filter=GL_LINEAR, .mag_filter=GL_LINEAR
        }
    );
}

struct TransposedQuads {
    Quad ind[2];
};

Quad &transpositions(TransposedQuads &transposed,
                     uint32_t transpose_program,
                     std::vector<IVec4> transpose_ops,
                     IVec4 dimensions_4d,
                     const Quad &src) {
    int indices[2] = {0, 1};
    for (int i = 0; i < transpose_ops.size(); i++) {
        IVec4 t = transpose_ops[i];
        transposed.ind[indices[1]].draw(
            transpose_program,
            {
                {"tex", {(i == 0)? &src: &transposed.ind[indices[0]]}},
                {"indices", {t}},
                {"texelDimensions4D", {dimensions_4d}}
            }
        );
        std::swap(indices[0], indices[1]);
    }
    return transposed.ind[indices[0]];
}

int main(int argc, char **argv) {

    // Quads
    // Main quad
    auto main_quad = MainGLFWQuad(1024, 1024);
    TextureParams tex_param {
        .format=GL_RG32F,
        .width=uint32_t(DIMENSIONS_4D[0]*DIMENSIONS_4D[1]),
        .height=uint32_t(DIMENSIONS_4D[2]*DIMENSIONS_4D[3]),
        .generate_mipmap=1,
        .wrap_s=GL_REPEAT, .wrap_t=GL_REPEAT,
        .min_filter=GL_LINEAR, .mag_filter=GL_LINEAR
    };
    TextureParams tex_param2 {
        .format=GL_RGBA32F,
        .width=uint32_t(DIMENSIONS_4D[0]*DIMENSIONS_4D[1]),
        .height=uint32_t(DIMENSIONS_4D[2]*DIMENSIONS_4D[3]),
        .generate_mipmap=1,
        .wrap_s=GL_REPEAT, .wrap_t=GL_REPEAT,
        .min_filter=GL_LINEAR, .mag_filter=GL_LINEAR
    };
    // Additional quads
    std::vector<Quad> psi_v {Quad(tex_param), Quad(tex_param)};
    split_step4d::QuadTemps quad_temps = split_step4d::QuadTemps {
        .psi_p{Quad(tex_param), Quad(tex_param)},
        .psi_x{Quad(tex_param), Quad(tex_param)},
        .fft{.ind{Quad(tex_param), Quad(tex_param)}}
    };
    TransposedQuads transposed
        {.ind{Quad(tex_param), Quad(tex_param)}};
    std::vector<Quad> projected_views {
        Quad(tex_param), Quad(tex_param)
    };
    Quad final_view {tex_param2};
    Quad additional_view {tex_param2};
    Quad prob_density {tex_param};
    Quad int_potential {tex_param};
    Quad ext_potential {tex_param};
    Quad potential {tex_param};
    // Summation quads
    std::vector<Quad> sum_quads {};
    reduce4d::initialize_sum_quads(
        sum_quads, tex_param,
        DIMENSIONS_4D[0]*DIMENSIONS_4D[1], DIMENSIONS_4D[0]);
    TextureParams tex_param_slice_xy {
        .format=GL_RG32F,
        .width=uint32_t(DIMENSIONS_4D[0]),
        .height=uint32_t(DIMENSIONS_4D[1]),
        .generate_mipmap=1,
        .wrap_s=GL_REPEAT, .wrap_t=GL_REPEAT,
        .min_filter=GL_LINEAR, .mag_filter=GL_LINEAR
    };
    TextureParams tex_param_slice_zw {
        .format=GL_RG32F,
        .width=uint32_t(DIMENSIONS_4D[2]),
        .height=uint32_t(DIMENSIONS_4D[3]),
        .generate_mipmap=1,
        .wrap_s=GL_REPEAT, .wrap_t=GL_REPEAT,
        .min_filter=GL_LINEAR, .mag_filter=GL_LINEAR
    };
    Quad xy_slice {tex_param_slice_xy};
    Quad zw_slice {tex_param_slice_zw};

    // Parameters
    split_step4d::SplitStepParameters split_step_params {
        .dt=0.64, .m1=1.0, .m2=1.0, .c=137.036, .hbar = 1.0, 
        .dimensions4d {Vec4{.ind{
            float(DIMENSIONS_4D[0]), float(DIMENSIONS_4D[0]), 
            float(DIMENSIONS_4D[0]), float(DIMENSIONS_4D[0])}}},
        .texel_dimensions4d {DIMENSIONS_4D},
    };

    // Programs
    uint32_t scale_program 
        = Quad::make_program_from_path("./shaders/util/scale.frag");
    uint32_t add2_program
        = Quad::make_program_from_path("./shaders/util/add2.frag");
    uint32_t add4_r_program
        = Quad::make_program_from_path("./shaders/util/add4-r.frag");
    uint32_t cross_program
        = Quad::make_program_from_path("./shaders/util/cross.frag");
    uint32_t norm_squared_program
        = Quad::make_program_from_path(
            "./shaders/util/norm-squared.frag");
    uint32_t slice_program
        = Quad::make_program_from_path(
            "./shaders/util/slice-of-4d.frag"
        );
    uint32_t domain_coloring_program
        = Quad::make_program_from_path(
            "./shaders/util/domain-coloring.frag");
    uint32_t transpose_program = Quad::make_program_from_path(
        "./shaders/util/transpose-hypercube.frag");
    uint32_t wave_packet_program = Quad::make_program_from_path(
        "./shaders/wavepacket/gaussian.frag"
    );
    uint32_t harmonic_program = Quad::make_program_from_path(
        "./shaders/potentials/harmonic.frag"
    );
    uint32_t interaction_program = Quad::make_program_from_path(
        "./shaders/potentials/coulomb-interaction-like.frag"
    );
    uint32_t rgb_combine_program = Quad::make_program_from_path(
        "./shaders/util/rgb-combine.frag"
    );
    split_step4d::Programs split_step_programs {
        .momentum_step = Quad::make_program_from_path(
            "./shaders/split-step/kinetic.frag"),
        .spatial_step = Quad::make_program_from_path(
            "./shaders/split-step/spatial.frag"),
        .fft{
            .fft_iter = Quad::make_program_from_path(
                "./shaders/fft/fft-iter-hypercube.frag"),
            .rev_bit_sort2 = Quad::make_program_from_path(
                "./shaders/fft/rev-bit-sort2-4d.frag")}};

    int_potential.draw(
        interaction_program,
        {
            {"texelDimensions4D", {DIMENSIONS_4D}},
            {"dimensions4D", {split_step_params.dimensions4d}},
            {"largestAllowedPotentialValue", 
                {float(split_step_params.hbar*PI/split_step_params.dt)}
            }
        }
    );
    ext_potential.draw(
        harmonic_program,
        {
            {"texelDimensions4D", {DIMENSIONS_4D}},
            {"dimensions4D", {split_step_params.dimensions4d}},
            {"r0", Vec2{.ind{
                    (float)split_step_params.dimensions4d[0]/2.0F,
                    (float)split_step_params.dimensions4d[1]/2.0F}}},
            {"omega", {0.0F/float(DIMENSIONS_4D[0])}},
            {"m1", split_step_params.m1},
            {"m2", split_step_params.m2}}
    );
    potential.draw(
        add2_program, 
        {
            {"tex1", {&int_potential}},
            {"tex2", {&ext_potential}}
        }
    );
    psi_v[0].draw(
        wave_packet_program, {
            {"symmetryFactor", {float(-1.0)}},
            {"amplitude1", {1.0F}},
            {"amplitude2", {1.0F}},
            {"sigma1", {Vec2{.ind{0.05, 0.05}}}},
            {"sigma2", {Vec2{.ind{0.05, 0.05}}}},
            {"texOffset1", {Vec2{.ind{0.25, 0.25}}}},
            {"texOffset2", {Vec2{.ind{0.75, 0.75}}}},
            {"waveNumber1", {Vec2{.ind{8.0, 8.0}}}},
            {"waveNumber2", {Vec2{.ind{-8.0, -8.0}}}},
            {"texelDimensions4D", {DIMENSIONS_4D}}
        }
    );
    std::vector<int> indices = {0, 1};
    int max_texture_size = 0;
    glGetIntegerv(GL_MAX_TEXTURE_SIZE, &max_texture_size);
    fprintf(stdout, "Max texture size: %d\n", max_texture_size);
    Interactor interactor(main_quad.get_window());
    while (!glfwWindowShouldClose(main_quad.get_window())) {
        split_step4d::split_step(
            psi_v[indices[1]], 
            potential, 
            psi_v[indices[0]], 
            quad_temps, split_step_programs, split_step_params);
        std::swap(indices[0], indices[1]);
        prob_density.draw(
            norm_squared_program,
            {{"tex", {&psi_v[indices[0]]}}}
        );
        std::vector<std::vector<IVec4>> transpose_ops_collection = {
            {{.ind{0, 2, 1, 3}}},
            {{.ind{1, 0, 2, 3}}, {.ind{3, 1, 2, 0}}}
        };
        for (int i = 0; i < 2; i++) {
            std::vector<IVec4> transpose_ops = transpose_ops_collection[i];
            Quad &transposed_res = transpositions(
            transposed, transpose_program, 
            transpose_ops, DIMENSIONS_4D, prob_density);
            reduce4d::reduce(sum_quads, scale_program, transposed_res);
            projected_views[i].draw(
                scale_program,
                {
                    {"tex", {&sum_quads[sum_quads.size() - 1]}}, 
                    {"scale", 
                    {float(1.0/float(DIMENSIONS_4D[0]*DIMENSIONS_4D[1]))
                    }}
                }
            );
        }
        Vec2 mouse_pos = interactor.get_mouse_position();
        IVec2 slice_coord = {.ind{
            int(std::floor(mouse_pos.x*DIMENSIONS_4D[2])), 
            int(std::floor(mouse_pos.y*DIMENSIONS_4D[3]))}};
        xy_slice.draw(
            slice_program,
            {
                {"tex", {&prob_density}},
                {"texelDimensions4D", {DIMENSIONS_4D}},
                {"sliceCoordinates", {slice_coord}},
                {"sliceIndices", {IVec2{.ind{2, 3}}}},
                {"sampleIndices", {IVec2{.ind{0, 1}}}}
            }
        );
        // Quad &transposed_res = transpositions(
        //     transposed, transpose_program, 
        //     {{.ind{0, 2, 1, 3}}}, DIMENSIONS_4D, prob_density);
        // xy_slice.draw(
        //     scale_program,
        //     {
        //         {"tex", {&transposed_res}},
        //         {"scale", {1.0F}}
        //     },
        //     Config::viewport(
        //         DIMENSIONS_4D[0]*DIMENSIONS_4D[1]/2,
        //         DIMENSIONS_4D[2]*DIMENSIONS_4D[3]/2, 
        //         64, 64)
        // );
        additional_view.draw(
            cross_program,
            {
                {"texelDimensions2D", IVec2{.ind{
                    DIMENSIONS_4D[0]*DIMENSIONS_4D[1],
                    DIMENSIONS_4D[2]*DIMENSIONS_4D[3]}}},
                {"center", mouse_pos}
            }
        );
        final_view.draw(
            add4_r_program,
            {
                {"tex0", {&projected_views[0]}},
                {"scale0", {Vec4{.ind{0.05, 0.0, 0.0, 1.0}}}},
                {"tex1", {&projected_views[1]}},
                {"scale1", {Vec4{.ind{0.0, 0.0, 0.05, 1.0}}}},
                {"tex2", {&additional_view}},
                {"scale2", {Vec4{.ind{1.0, 1.0, 1.0, 1.0}}}},
                {"tex3", {&xy_slice}},
                {"scale3", {Vec4{.ind{0.005, 0.005, 0.005, 1.0}}}},
            }
        );
        // main_quad.draw(xy_slice);
        main_quad.draw(final_view);
        glfwPollEvents();
        interactor.click_update(main_quad.get_window());
        glfwSwapBuffers(main_quad.get_window());
    }
    return 0;
}