#include "simulation.hpp"
#include "arrows2d.hpp"
#include "visualization2d.hpp"
#include "gaussian_wavepacket2d.hpp"
#include "spinors.hpp"

using namespace sim_2d;

static Vec2 get_dimensions(float side_length) {
    return {.ind{side_length, side_length}};
}

static IVec2 get_texel_dimensions(int texel_side_length) {
    return {.ind{texel_side_length, texel_side_length}};
}

static float negative_coeff(float positive_coeff) {
    return std::sqrt(1.0F - positive_coeff*positive_coeff);
}

static WireFrame get_quad_wire_frame() {
    return WireFrame(
        {{"position", Attribute{
            3, GL_FLOAT, false,
            0, 0}}},
        {-1.0, -1.0, 0.0, -1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, -1.0, 0.0},
        {0, 1, 2, 0, 2, 3},
        WireFrame::TRIANGLES
    );
}

Frames::Frames(
    const SimParams &sim_params, int view_width, int view_height):
    view_tex_params(
        {
            .format=GL_RGBA16F,
            .width=(uint32_t)view_width,
            .height=(uint32_t)view_height,
            .wrap_s=GL_CLAMP_TO_EDGE,
            .wrap_t=GL_CLAMP_TO_EDGE,
            .min_filter=GL_LINEAR,
            .mag_filter=GL_LINEAR,
        }
    ),
    sim_tex_params(
        {
            .format=GL_RGBA32F,
            .width=(uint32_t)sim_params.texelSideLength,
            .height=(uint32_t)sim_params.texelSideLength,
            .wrap_s=GL_REPEAT,
            .wrap_t=GL_REPEAT,
            .min_filter=GL_LINEAR,
            .mag_filter=GL_LINEAR,
        }
    ),
    visual_intermediate(Quad(sim_tex_params)),
    psi({sim_tex_params}),
    potential(Quad(sim_tex_params)),
    temps {
            .psi_p {{sim_tex_params}, {sim_tex_params}},
            .psi_x {{sim_tex_params}, {sim_tex_params}},
            .fft {.ind{Quad(sim_tex_params), Quad(sim_tex_params)}}
    },
    view(view_tex_params) {

}

GLSLPrograms::GLSLPrograms() {
    this->split_operator = {
        .momentum_step
            =Quad::make_program_from_path(
                "./shaders/split-step/kinetic.frag"),
        .spatial_step
            =Quad::make_program_from_path(
                "./shaders/split-step/spatial.frag"),
        .fft={
            .fft_iter
                = Quad::make_program_from_path(
                    "./shaders/fft/fft-iter-square.frag"),
            .rev_bit_sort2
                = Quad::make_program_from_path(
                    "./shaders/fft/rev-bit-sort2-2d.frag")
        }
    };
    this->domain_color = Quad::make_program_from_path(
        "./shaders/util/domain-coloring.frag"
    );
    this->wave_packet = Quad::make_program_from_path(
        "./shaders/wavepacket/position-gaussian2d.frag"
    );
    this->momentum_init = Quad::make_program_from_path(
        "./shaders/wavepacket/momentum-gaussian2d.frag"
    );
    this->current = Quad::make_program_from_path(
        "./shaders/current/current.frag"
    );
    this->pseudocurrent = Quad::make_program_from_path(
        "./shaders/current/pseudocurrent.frag"
    );
    this->spin = Quad::make_program_from_path(
        "./shaders/spin/expectation.frag"
    );
    this->scalar = Quad::make_program_from_path(
        "./shaders/scalar/scalar.frag"
    );
    this->arrows = make_program_from_paths(
        "./shaders/util/arrows2d.vert",
        "./shaders/util/uniform-color.frag");
    this->copy = Quad::make_program_from_path(
        "./shaders/util/copy.frag"
    );
    this->scale = Quad::make_program_from_path(
        "./shaders/util/scale.frag"
    );
    this->harmonic = Quad::make_program_from_path(
        "./shaders/harmonic.frag"
    );
    this->all_alpha = Quad::make_program_from_path(
        "./shaders/util/all-alpha.frag"
    );
    this->combine_potential_view = Quad::make_program_from_path(
        "./shaders/combine-potential-view.frag"
    );
    this->sketch_potential = Quad::make_program_from_path(
        "./shaders/sketch/potential2d.frag"
    );
}

Simulation::Simulation(
    const SimParams &sim_params, int view_width, int view_height):
    m_programs(),
    m_frames(sim_params, view_width, view_height),
    m_quad_wire_frame(get_quad_wire_frame()),
    m_arrows_wire_frame(get_2d_vector_field_wire_frame({.ind{64, 64}}))
    {

}

void Simulation::time_steps(const SimParams &params) {
    for (int i = 0; i < params.stepsPerFrame; i++)
        dirac_split_step2d::split_step(
            m_frames.psi,
            m_frames.potential,
            m_frames.psi,
            m_frames.temps,
            m_programs.split_operator,
            {
                .dt=params.dt,
                .m=params.m,
                .c=params.c,
                .hbar=params.hbar,
                .dimensions2d=get_dimensions(params.sideLength),
                .texel_dimensions2d
                    =get_texel_dimensions(params.texelSideLength),

    });
}

const RenderTarget & Simulation::render_view(
    SimParams params, Vec2 cursor_pos) {
    m_frames.view.clear();
    visualization2d::Options options {};
    options.current_time_component=params.showCurrent0,
    options.component_magnitude_w_phase[0]=params.showPsi0WPhase;
    options.component_magnitude_w_phase[1]=params.showPsi1WPhase;
    options.component_magnitude_w_phase[2]=params.showPsi2WPhase;
    options.component_magnitude_w_phase[3]=params.showPsi3WPhase;
    options.spatial_current = params.showSpatialCurrent;
    options.spatial_pseudocurrent = params.showPseudospatialCurrent;
    options.scalar_potential = params.showScalarPotential;
    options.scalar = params.showScalar;
    options.pseudoscalar = params.showPseudoscalar;
    options.vector_potential = params.showVectorPotential;
    options.spin[0] = params.showPsi01Spin;
    options.spin[1] = params.showPsi23Spin;
    scalar_or_single_component_quantities(
        m_frames.view,
        m_quad_wire_frame, 
        m_frames.visual_intermediate,
        m_frames.psi, 
        m_frames.potential, 
        options, 
        {
            .domain_color=m_programs.domain_color,
            .all_alpha=m_programs.all_alpha,
            .current=m_programs.current,
            .pseudocurrent=m_programs.pseudocurrent,
            .scalar=m_programs.scalar,
            .pseudoscalar=m_programs.pseudoscalar,
            .add_scalar_potential=m_programs.combine_potential_view,
            .copy=m_programs.copy}, 
        {
            .hbar=params.hbar,
            .brightness=params.brightness, 
            .potential_brightness=params.potentialBrightness}
    );
    spin_quantities(
        m_frames.view,
        m_arrows_wire_frame,
        m_frames.visual_intermediate,
        m_frames.psi,
        options,
        {
            .arrows=m_programs.arrows,
            .spin=m_programs.spin
        },
        {
            .arrows_max_length=params.arrowMaxLength,
            .arrows_scale=params.arrowScale
        }
    );
    vector_quantities(
        m_frames.view, 
        m_arrows_wire_frame,
        m_frames.visual_intermediate, 
        m_frames.psi, m_frames.potential,
        options,
        {
            .arrows=m_programs.arrows,
            .current=m_programs.current,
            .pseudocurrent=m_programs.pseudocurrent,
        },
        {
            .hbar=params.hbar,
            .representation=0,
            .arrows_max_length=params.arrowMaxLength,
            .arrows_scale=params.arrowScale
        }
    );
    return m_frames.view;
}

void Simulation::new_wave_function(
    const SimParams &params,
    const Vec2 &tex_pos, const Vec2 &wave_num) {
    Vec3 pos_spin_dir = Vec3{.ind{
        params.posX, params.posY, params.posZ
    }}.normalized();
    Vec3 neg_spin_dir = Vec3{.ind{
        params.negX, params.negY, params.negZ
    }}.normalized();
    spinors::Spinor pos_state = spinors::get_spin_up_state(pos_spin_dir, 1.0);
    spinors::Spinor neg_state = spinors::get_spin_up_state(neg_spin_dir, 1.0);
    Vec2 p_xy = gaussian_wave_packet2d::wave_number_to_momentum(
        wave_num, get_dimensions(params.sideLength));
    Vec3 p {.ind{p_xy.x, p_xy.y, 0.0F}};
    float length_p = p.length();
    spinors::Spinor p_u 
        = spinors::get_spin_up_state(p, length_p);
    spinors::Spinor p_d
        = spinors::get_spin_down_state(p, length_p);
    float pos_amount = params.posE;
    float neg_amount = negative_coeff(pos_amount);
    std::complex<float> c0 = neg_amount*inner_prod(neg_state, p_u);
    std::complex<float> c1 = pos_amount*inner_prod(pos_state, p_u);
    std::complex<float> c2 = neg_amount*inner_prod(neg_state, p_d);
    std::complex<float> c3 = pos_amount*inner_prod(pos_state, p_d);
    printf("p/|p| = (%g, %g, %g)\n", 
        p.normalized().x, p.normalized().y, p.normalized().z);
    printf("|+> = [\n\t%g + (%g) i,\n\t%g + (%g) i\n] \n", 
        pos_state[0].real(), pos_state[0].imag(), 
        pos_state[1].real(), pos_state[1].imag());
    printf("|p up> = [\n\t%g + (%g) i,\n\t%g + (%g) i\n] \n", 
        p_u[0].real(), p_u[0].imag(), p_u[1].real(), p_u[1].imag());
    printf("c0 = %g + (%g) i\n", c0.real(), c0.imag());
    printf("c1 = %g + (%g) i\n", c1.real(), c1.imag());
    printf("c2 = %g + (%g) i\n", c2.real(), c2.imag());
    printf("c3 = %g + (%g) i\n", c3.real(), c3.imag());
    // std::complex<float> imag_unit (0.0, 1.0);
    // spinors::Spinor neg_d = get_spin_down_state(neg_spin_dir, 1.0);
    gaussian_wave_packet2d::momentum_init(
        m_frames.psi, m_frames.temps.fft,
        m_programs.split_operator.fft,
        m_programs.momentum_init, {
            .amplitude=1.0,
            .sigma={
                gaussian_wave_packet2d::tex_to_sim_coordinates(
                    Vec2{.x=params.sigma, .y=params.sigma},
                    get_dimensions(params.sideLength))
            },
            .p0 {
                gaussian_wave_packet2d::wave_number_to_momentum(
                    wave_num, get_dimensions(params.sideLength))},
            .x0 {
                gaussian_wave_packet2d::tex_to_sim_coordinates(
                    tex_pos, get_dimensions(params.sideLength))
            },
            .s {
                spinors::BiSpinor(
                    spinors::Spinor(0.0, 0.0),
                    spinors::Spinor(0.0, 0.0))
            },
            .use_energy_states_combinations=int(1),
            .invert_negative_energy_momentum=int(0),
            .dimensions2d=get_dimensions(params.sideLength),
            .texel_dimensions2d=get_texel_dimensions(params.texelSideLength),
            .coefficients={
                c0, c1, c2, c3
                // {0.0}, {1.0}, {0.0}, {0.0},
                // {0.0}, {1.0F/std::sqrt(2.0F)}, {0.0}, {imag_unit/std::sqrt(2.0F)}
            },
            .m=params.m,
            .c=params.c,
            .hbar=params.hbar});
}

void Simulation::sketch_modify_scalar_potential(
    const SimParams &sim_params, const Vec2 &pos) {
    m_frames.visual_intermediate.draw(
        m_programs.copy,
        {{"tex", {&m_frames.potential}}}
    );
    m_frames.potential.draw(
        m_programs.sketch_potential,
        {
            {"tex", {&m_frames.visual_intermediate}},
            {"offsetTexCoord", {pos}},
            {"sigmaTexCoord", {Vec2{.x=0.01, .y=0.01}}},
            {"amplitude", {Vec4{.x=0.0, .y=0.0, .z=0.0, .w=10.0}}},
            {"maxScalarValue", {80.0F}},
            {"maxVectorMag", {80.0F}},
        }
    );
}

void Simulation::sketch_modify_vector_potential(
    const SimParams &sim_params, const Vec2 &pos, const Vec2 &dir) {
    m_frames.visual_intermediate.draw(
        m_programs.copy,
        {{"tex", {&m_frames.potential}}}
    );
    m_frames.potential.draw(
        m_programs.sketch_potential,
        {
            {"tex", {&m_frames.visual_intermediate}},
            {"offsetTexCoord", {pos}},
            {"sigmaTexCoord", {Vec2{.x=0.01, .y=0.01}}},
            {"amplitude", {Vec4{.x=dir.x, .y=dir.y, .z=0.0, .w=0.0}}},
            {"maxScalarValue", {80.0F}},
            {"maxVectorMag", {80.0F}},
        }
    );
}
