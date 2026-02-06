#include "simulation.hpp"

#include <cmath>

static const double PI = 3.141592653589793;

static const std::vector<float> QUAD_VERTICES = {
    -1.0, -1.0, 0.0, -1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, -1.0, 0.0};
static const std::vector<int> QUAD_ELEMENTS = {0, 1, 2, 0, 2, 3};
static WireFrame get_quad_wire_frame() {
    return WireFrame(
        {{"position", Attribute{
            3, GL_FLOAT, false,
            0, 0}}},
        QUAD_VERTICES, QUAD_ELEMENTS,
        WireFrame::TRIANGLES
    );
}

Programs::Programs() {
    this->scale = Quad::make_program_from_path(
        "./shaders/util/scale.frag"
    );
    this->add2 = Quad::make_program_from_path(
        "./shaders/util/add2.frag"
    );
    this->add4_r = Quad::make_program_from_path(
        "./shaders/util/add4-r.frag"
    );
    this->cross = Quad::make_program_from_path(
        "./shaders/util/cross.frag"
    );
    this->norm_squared = Quad::make_program_from_path(
        "./shaders/util/norm-squared.frag"
    );
    this->slice = Quad::make_program_from_path(
        "./shaders/util/slice-of-4d.frag"
    );
    this->domain_coloring = Quad::make_program_from_path(
        "./shaders/util/domain-coloring.frag"
    );
    this->transpose = Quad::make_program_from_path(
        "./shaders/util/transpose-hypercube.frag"
    );
    this->wave_packet = Quad::make_program_from_path(
         "./shaders/wavepacket/gaussian.frag"
    );
    this->harmonic = Quad::make_program_from_path(
         "./shaders/potentials/harmonic.frag"
    );
    this->interaction = Quad::make_program_from_path(
        "./shaders/potentials/coulomb-interaction-like.frag"
    );
    this->rgb_combine = Quad::make_program_from_path(
        "./shaders/util/rgb-combine.frag"
    );
    this->split_step.momentum = Quad::make_program_from_path(
        "./shaders/split-step/kinetic.frag"
    );
    this->split_step.spatial = Quad::make_program_from_path(
        "./shaders/split-step/spatial.frag"
    );
    this->split_step.fft.rev_bit_sort2 = Quad::make_program_from_path(
        "./shaders/fft/rev-bit-sort2-4d.frag"
    );
    this->split_step.fft.fft_iter = Quad::make_program_from_path(
        "./shaders/fft/fft-iter-hypercube.frag"
    );
}

static unsigned int power2(unsigned int pow) {
    if (pow == 0)
        return 1;
    unsigned int res = 2;
    for (; pow > 1; pow--)
        res *= 2;
    return res;
}

static Vec4 get_dimensions_4d(int log2_size) {
    int size = power2(log2_size);
    float f_width = (float)size;
    return Vec4{.ind{f_width, f_width, f_width, f_width}};
}

static IVec4 get_texel_dimensions_4d(int log2_size) {
    int size = power2(log2_size);
    return IVec4{.ind{size, size, size, size}};
}

Frames::Frames(
    const TextureParams &default_tex_params, const SimParams &params) :
    sim_params({
        .format=GL_RG32F,
        .width=power2(2*params.log2TexWidth),
        .height=power2(2*params.log2TexWidth),
        .generate_mipmap=1,
        .min_filter=default_tex_params.min_filter,
        .mag_filter=default_tex_params.mag_filter,
        .wrap_s=GL_REPEAT,
        .wrap_t=GL_REPEAT
    }),
    slice_xy_params({
        .format=GL_RG32F,
        .width=power2(params.log2TexWidth),
        .height=power2(params.log2TexWidth),
        .generate_mipmap=1,
        .min_filter=default_tex_params.min_filter,
        .mag_filter=default_tex_params.mag_filter,
        .wrap_s=GL_REPEAT,
        .wrap_t=GL_REPEAT
    }),
    slice_zw_params({
        .format=GL_RG32F,
        .width=power2(params.log2TexWidth),
        .height=power2(params.log2TexWidth),
        .generate_mipmap=1,
        .min_filter=default_tex_params.min_filter,
        .mag_filter=default_tex_params.mag_filter,
        .wrap_s=GL_REPEAT,
        .wrap_t=GL_REPEAT
    }),
    psi {
        Quad(sim_params),
        Quad(sim_params)
    },
    split_step_tmp {
        .psi_p {Quad(sim_params), Quad(sim_params)},
        .psi_x {Quad(sim_params), Quad(sim_params)},
        .fft {Quad(sim_params), Quad(sim_params)}
    },
    transposed {
        Quad(sim_params),
        Quad(sim_params)
    },
    projected_views {
        Quad(sim_params),
        Quad(sim_params)
    },
    prob_density(Quad{sim_params}),
    int_potential(Quad{sim_params}),
    ext_potential(Quad{sim_params}),
    potential(Quad{sim_params}),
    xy_slice(Quad{sim_params}),
    zw_slice(Quad{sim_params}),
    render(RenderTarget{view_params}),
    quad_wire_frame(get_quad_wire_frame())
    {

}

void Simulation::initial_conditions(const SimParams &params) {
    Vec4 d_4d = get_dimensions_4d(params.log2TexWidth);
    IVec4 tex_d_4d = get_texel_dimensions_4d(params.log2TexWidth);
    m_frames.int_potential.draw(
        m_programs.interaction,
        {
            {"texelDimensions4D", {tex_d_4d}},
            {"dimensions4D", {d_4d}},
            {"largestAllowedPotentialValue", 
                {float(params.hbar*PI/params.dt)}
            }
        }
    );
    m_frames.ext_potential.draw(
        m_programs.harmonic,
        {
            {"texelDimensions4D", {tex_d_4d}},
            {"dimensions4D", {d_4d}},
            {"r0", Vec2{.ind{d_4d.x/2.0F, d_4d.y/2.0F}}},
            {"omega", 0.0F},
            {"m1", params.m1},
            {"m2", params.m2}}
    );
    m_frames.potential.draw(
        m_programs.add2, 
        {
            {"tex1", {&m_frames.int_potential}},
            {"tex2", {&m_frames.ext_potential}}
        }
    );
    m_frames.psi[0].draw(
        m_programs.wave_packet, {
            {"symmetryFactor", {float(-1.0)}},
            {"amplitude1", {1.0F}},
            {"amplitude2", {1.0F}},
            {"sigma1", {Vec2{.ind{0.05, 0.05}}}},
            {"sigma2", {Vec2{.ind{0.05, 0.05}}}},
            {"texOffset1", {Vec2{.ind{0.25, 0.25}}}},
            {"texOffset2", {Vec2{.ind{0.75, 0.75}}}},
            {"waveNumber1", {Vec2{.ind{8.0, 8.0}}}},
            {"waveNumber2", {Vec2{.ind{-8.0, -8.0}}}},
            {"texelDimensions4D", {d_4d}}
        }
    );
    std::vector<int> indices = {0, 1};
    int max_texture_size = 0;
    glGetIntegerv(GL_MAX_TEXTURE_SIZE, &max_texture_size);
    fprintf(stdout, "Max texture size: %d\n", max_texture_size);
}

Simulation::Simulation(
    const TextureParams &default_tex_params,
    const SimParams &params):
    m_programs(), 
    m_frames(default_tex_params, params) {
    initial_conditions(params);
}

void Simulation::step(const SimParams &params) {
    Vec4 d_4d = get_dimensions_4d(params.log2TexWidth);
    IVec4 tex_d_4d = get_texel_dimensions_4d(params.log2TexWidth);
    split_step4d::split_step(
        m_frames.psi[1], m_frames.potential, m_frames.psi[0],
        m_frames.split_step_tmp, 
        {
            .momentum_step=m_programs.split_step.momentum,
            .spatial_step=m_programs.split_step.spatial,
            .fft {
                .rev_bit_sort2=m_programs.split_step.fft.rev_bit_sort2,
                .fft_iter=m_programs.split_step.fft.fft_iter
            }
        }, 
        {
            .dt=params.dt, .m1=params.m1, .m2=params.m2, .c=params.c,
            .hbar=params.hbar, 
            .dimensions4d=d_4d,
            .texel_dimensions4d=tex_d_4d
        }
    );
}

const RenderTarget &Simulation::view(const SimParams &params) {
    Vec2 mouse_pos = Vec2{.x=0.5, .y=0.5};
    Vec4 d_4d = get_dimensions_4d(params.log2TexWidth);
    IVec4 tex_d_4d = get_texel_dimensions_4d(params.log2TexWidth);
    IVec2 slice_coord = {.ind{
        (int)std::floor(mouse_pos.x*tex_d_4d[0]), 
        (int)std::floor(mouse_pos.y*tex_d_4d[1])
    }};
    m_frames.xy_slice.draw(
        m_programs.slice,
        {
            {"tex", {&m_frames.prob_density}},
            {"texelDimensions4D", {tex_d_4d}},
            {"sliceCoordinates", {slice_coord}},
            {"sliceIndices", {IVec2{.ind{2, 3}}}},
            {"sampleIndices", {IVec2{.ind{0, 1}}}}
        }
    );
    m_frames.render.draw(
        m_programs.cross,
        {
            {"texelDimensions2D", IVec2{
                .ind{
                    tex_d_4d[0]*tex_d_4d[1],
                    tex_d_4d[2]*tex_d_4d[3]}
                }
            },
            {"center", mouse_pos}
        },
        m_frames.quad_wire_frame
    );
    m_frames.render.draw(
        m_programs.add4_r,
        {
            {"tex0", {&m_frames.projected_views[0]}},
            {"scale0", {Vec4{.ind{0.05, 0.0, 0.0, 1.0}}}},
            {"tex1", {&m_frames.projected_views[1]}},
            {"scale1", {Vec4{.ind{0.0, 0.0, 0.05, 1.0}}}},
            {"tex2", {&m_frames.render}},
            {"scale2", {Vec4{.ind{1.0, 1.0, 1.0, 1.0}}}},
            {"tex3", {&m_frames.xy_slice}},
            {"scale3", {Vec4{.ind{0.005, 0.005, 0.005, 1.0}}}},
        },
        m_frames.quad_wire_frame
    );
    return m_frames.render;

}
