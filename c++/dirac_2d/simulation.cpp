#include "simulation.hpp"
#include "arrows2d.hpp"
#include "arrows3d2d.hpp"
#include "dirac_split_step2d.hpp"
#include "surface.hpp"
#include "visualization2d.hpp"
#include "visualization3d2d.hpp"
#include "gaussian_wavepacket2d.hpp"
#include "spinors.hpp"
#include <cmath>

using namespace sim_2d;

// static float norm_squared_cpu(
//     dirac_split_step2d::BiSpinorQuad &psi) {
    
// }

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

static int convert_side_length_selector_value(int val) {
    return std::powl(2, (long)(val + 7));
}

Frames::Frames(
    const SimParams &sim_params, int view_width, int view_height, 
    unsigned int min_filter, unsigned int mag_filter):
    view_tex_params(
        {
            .format=GL_RGBA16F,
            .width=(uint32_t)view_width,
            .height=(uint32_t)view_height,
            .wrap_s=GL_CLAMP_TO_EDGE,
            .wrap_t=GL_CLAMP_TO_EDGE,
            .min_filter=min_filter,
            .mag_filter=mag_filter,
        }
    ),
    sim_tex_params(
        {
            .format=GL_RGBA32F,
            .width=(uint32_t)convert_side_length_selector_value(
                sim_params.texelSideLengthSelector.selected),
            .height=(uint32_t)convert_side_length_selector_value(
                sim_params.texelSideLengthSelector.selected),
            .wrap_s=GL_REPEAT,
            .wrap_t=GL_REPEAT,
            .min_filter=min_filter,
            .mag_filter=mag_filter,
        }
    ),
    visual_intermediate(Quad(sim_tex_params)),
    psi({sim_tex_params}),
    potential(Quad(sim_tex_params)),
    temps {
            .psi_p {
                    {sim_tex_params}, {sim_tex_params}, 
                    // {sim_tex_params}, {sim_tex_params}
                },
            .psi_x {
                {sim_tex_params}, {sim_tex_params},
                {sim_tex_params}, {sim_tex_params},
            },
            .fft {.ind{Quad(sim_tex_params), Quad(sim_tex_params)}}
    },
    view(view_tex_params),
    quad(get_quad_wire_frame()),
    arrows(arrows2d::get_2d_vector_field_wire_frame({.ind{64, 64}})),
    arrows3d(arrows3d2d::get_2d_vector_field_wire_frame({.ind{64, 64}})),
    surface(get_surface_wireframe({.ind{1024, 1024}})) {

}

void Frames::change_simulation_dimensions(IVec2 d_2d) {
    unsigned int min_filter = this->sim_tex_params.min_filter;
    unsigned int mag_filter = this->sim_tex_params.mag_filter;
    this->sim_tex_params = {
        .format=GL_RGBA32F,
        .width=(uint32_t)d_2d[0],
        .height=(uint32_t)d_2d[1],
        .wrap_s=GL_REPEAT,
        .wrap_t=GL_REPEAT,
        .min_filter=min_filter,
        .mag_filter=mag_filter};
    this->visual_intermediate.reset(this->sim_tex_params);
    this->psi.upper.reset(this->sim_tex_params);
    this->psi.lower.reset(this->sim_tex_params);
    this->potential.reset(this->sim_tex_params);
    this->temps.psi_p[0].upper.reset(this->sim_tex_params);
    this->temps.psi_p[0].lower.reset(this->sim_tex_params);
    this->temps.psi_p[1].upper.reset(this->sim_tex_params);
    this->temps.psi_p[1].lower.reset(this->sim_tex_params);
    this->temps.psi_x[0].upper.reset(this->sim_tex_params);
    this->temps.psi_x[0].lower.reset(this->sim_tex_params);
    this->temps.psi_x[1].upper.reset(this->sim_tex_params);
    this->temps.psi_x[1].lower.reset(this->sim_tex_params);
    this->temps.psi_x[2].upper.reset(this->sim_tex_params);
    this->temps.psi_x[2].lower.reset(this->sim_tex_params);
    this->temps.psi_x[3].upper.reset(this->sim_tex_params);
    this->temps.psi_x[3].lower.reset(this->sim_tex_params);
    this->temps.fft.ind[0].reset(this->sim_tex_params);
    this->temps.fft.ind[1].reset(this->sim_tex_params);
}

GLSLPrograms::GLSLPrograms() {
    this->split_operator = {
        .momentum_step
            =Quad::make_program_from_path(
                "./shaders/split-step/kinetic-f.frag"),
        .spatial_step
            =Quad::make_program_from_path(
                "./shaders/split-step/spatial.frag"),
        .add
            =Quad::make_program_from_path(
                "./shaders/util/add2.frag"
            ),
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
    this->uniform_color = Quad::make_program_from_path(
        "./shaders/util/uniform-color.frag"
    );
    this->add2 = Quad::make_program_from_path(
        "./shaders/util/add2.frag"
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
    this->pseudoscalar = Quad::make_program_from_path(
        "./shaders/scalar/pseudoscalar.frag"
    );
    this->arrows = make_program_from_paths(
        "./shaders/arrows/arrows2d.vert",
        "./shaders/util/uniform-color.frag");
    this->arrows3d = make_program_from_paths(
        "./shaders/arrows/arrows3d2d.vert",
        "./shaders/util/uniform-color.frag"
    );
    this->copy = Quad::make_program_from_path(
        "./shaders/util/copy.frag"
    );
    this->scale = Quad::make_program_from_path(
        "./shaders/util/scale.frag"
    );
    this->harmonic = Quad::make_program_from_path(
        "./shaders/potential/harmonic.frag"
    );
    this->all_alpha = Quad::make_program_from_path(
        "./shaders/util/all-alpha.frag"
    );
    this->combine_potential_view = Quad::make_program_from_path(
        "./shaders/potential/combine-potential-view.frag"
    );
    this->sketch_potential = Quad::make_program_from_path(
        "./shaders/sketch/potential2d.frag"
    );
    this->erase_vec_potential = Quad::make_program_from_path(
        "./shaders/sketch/reduce-vec-potential2d.frag"
    );
    this->surface_domain_coloring = make_program_from_paths(
        "./shaders/surface/surface.vert",
        "./shaders/surface/domain-coloring.frag");
    this->surface_all_alpha = make_program_from_paths(
        "./shaders/surface/surface.vert",
        "./shaders/surface/all-alpha.frag");
    this->surface_single_color = make_program_from_paths(
        "./shaders/surface/surface.vert",
        "./shaders/surface/single-color.frag"
    );
    this->electric = Quad::make_program_from_path(
        "./shaders/em-fields/electric2d.frag"
    );
    this->magnetic = Quad::make_program_from_path(
        "./shaders/em-fields/magnetic2d.frag"
    );
}

Simulation::Simulation(
    const SimParams &sim_params, TextureParams default_tex_params):
    m_programs(),
    m_frames(sim_params,
        (int)default_tex_params.width,
        (int)default_tex_params.height,
        default_tex_params.min_filter,
        default_tex_params.mag_filter)
    {

}

void Simulation::time_steps(const SimParams &params) {
    int texel_side_length = convert_side_length_selector_value(
        params.texelSideLengthSelector.selected
    );
    for (int i = 0; i < params.stepsPerFrame; i++) {
        float dt = params.cdtdx 
            * ((params.sideLength/float(texel_side_length))/params.c);
        dirac_split_step2d::split_step(
            m_frames.psi,
            m_frames.potential,
            m_frames.psi,
            m_frames.temps,
            m_programs.split_operator,
            {
                .dt=dt*(params.useNegativeTimeStep? -1.0F: 1.0F),
                .m=params.m,
                .c=params.c,
                .hbar=params.hbar,
                .dimensions2d=get_dimensions(params.sideLength),
                .texel_dimensions2d
                    =get_texel_dimensions(texel_side_length),});
    }
}

const RenderTarget & Simulation::render_view(
    SimParams params, Vec2 cursor_pos) {
    int texel_side_length 
        = convert_side_length_selector_value(
            params.texelSideLengthSelector.selected);
    m_frames.view.clear();
    visualization2d::Options options {};
    options.current_time_component=params.showCurrent0;
    options.pseudocurrent_time_component=params.showPsuedocurrent0;
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
    options.electric_field = params.showElectric;
    options.magnetic_field = params.showMagnetic;
    visualization2d::scalar_or_single_component_quantities(
        m_frames.view,
        m_frames.quad, 
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
            .m=params.m,
            .c=params.c,
            .t=params.t,
            .brightness=params.brightness, 
            .potential_brightness=params.potentialBrightness}
    );
    visualization2d::spin_quantities(
        m_frames.view,
        m_frames.arrows,
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
    visualization2d::vector_quantities(
        m_frames.view, 
        m_frames.arrows,
        m_frames.visual_intermediate, 
        m_frames.psi, m_frames.potential,
        options,
        {
            .arrows=m_programs.arrows,
            .current=m_programs.current,
            .pseudocurrent=m_programs.pseudocurrent,
            .electric=m_programs.electric,
            .magnetic=m_programs.magnetic
        },
        {
            .hbar=params.hbar,
            .dt=params.cdtdx 
                * ((params.sideLength/float(texel_side_length))/params.c),
            .representation=0,
            .arrows_max_length=params.arrowMaxLength,
            .arrows_scale=params.arrowScale,
            .texel_dimensions=get_texel_dimensions(texel_side_length),
            .dimensions=get_dimensions(params.sideLength)
        }
    );
    return m_frames.view;
}

const RenderTarget & Simulation::render_view(
    SimParams params,
    Vec2 cursor_pos,
    Quaternion rotation, float scale) {
    if (!params.show3D)
        return this->render_view(params, cursor_pos);
    int texel_side_length 
        = convert_side_length_selector_value(
            params.texelSideLengthSelector.selected);
    m_frames.view.clear();
    visualization3d2d::Options options {};
    options.current_time_component=params.showCurrent0;
    options.pseudocurrent_time_component=params.showPsuedocurrent0;
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
    options.electric_field = params.showElectric;
    options.magnetic_field = params.showMagnetic;
    IVec2 screen_dimensions {.ind{
        (int)m_frames.view_tex_params.width,
        (int)m_frames.view_tex_params.height
    }};
    m_frames.view.draw(
        m_programs.uniform_color,
        {{"color", Vec4{.r=0.3, .g=0.3, .b=0.3, .a=0.1}}},
        m_frames.quad
    );
    glEnable(GL_DEPTH_TEST);
    visualization3d2d::scalar_or_single_component_quantities(
        m_frames.view,
        m_frames.surface,
        m_frames.quad,
        m_frames.visual_intermediate,
        m_frames.psi, 
        m_frames.potential, 
        options, 
        {
            .copy=m_programs.copy,
            .surface_all_alpha=m_programs.surface_all_alpha,
            .surface_domain_coloring=m_programs.surface_domain_coloring,
            .surface_single_color=m_programs.surface_single_color,
            .uniform_color=m_programs.uniform_color,
            .current=m_programs.current,
            .pseudocurrent=m_programs.pseudocurrent,
            .scalar=m_programs.scalar,
            .pseudoscalar=m_programs.pseudoscalar}, 
        {
            .hbar=params.hbar,
            .brightness=params.brightness,
            .m=params.m,
            .c=params.c,
            .t=params.t,
            .potential_brightness=params.potentialBrightness,
            .rotation=rotation,
            .scale=scale,
            .screen_dimensions=screen_dimensions}
    );
    visualization3d2d::vector_quantities(
        m_frames.view,
        m_frames.arrows3d,
        m_frames.visual_intermediate,
        m_frames.psi,
        m_frames.potential,
        options,
        {
            .arrows=m_programs.arrows3d,
            .current=m_programs.current,
            .pseudocurrent=m_programs.pseudocurrent,
            .electric=m_programs.electric,
            .magnetic=m_programs.magnetic
        },
        {
            .hbar=params.hbar,
            .dt=params.cdtdx 
                * ((params.sideLength/float(texel_side_length))/params.c),
            .representation=0,
            .arrows_max_length=params.arrowMaxLength,
            .arrows_scale=params.arrowScale,
            .rotation=rotation,
            .scale=scale,
            .screen_dimensions=screen_dimensions,
            .texel_dimensions=get_texel_dimensions(texel_side_length),
            .dimensions=get_dimensions(params.sideLength)
        });
    visualization3d2d::spin_quantities(
        m_frames.view,
        m_frames.arrows3d,
        m_frames.visual_intermediate,
        m_frames.psi,
        options,
        {
            .arrows=m_programs.arrows3d,
            .spin=m_programs.spin,
        },
        {
            .arrows_max_length=params.arrowMaxLength,
            .arrows_scale=params.arrowScale,
            .rotation=rotation,
            .scale=scale,
            .screen_dimensions=screen_dimensions
        });
    glDisable(GL_DEPTH_TEST);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    return m_frames.view;
}

void Simulation::new_momentum_space_wave_function(
    const SimParams &params,
    const Vec2 &tex_pos, const Vec2 &wave_num) {
    int texel_side_length 
        = convert_side_length_selector_value(
            params.texelSideLengthSelector.selected);
    Vec3 pos_spin_dir = params.posSpinDir.normalized();
    // Vec3 pos_spin_dir = Vec3{.x=0.0, .y=0.0, .z=1.0};
    Vec3 neg_spin_dir = params.negSpinDir.normalized();
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
    float pos_amount = sqrt(params.posE);
    float neg_amount = negative_coeff(pos_amount);
    std::complex<float> c0 = neg_amount*inner_prod(p_u, neg_state);
    std::complex<float> c1 = pos_amount*inner_prod(p_u, pos_state);
    std::complex<float> c2 = neg_amount*inner_prod(p_d, neg_state);
    std::complex<float> c3 = pos_amount*inner_prod(p_d, pos_state);
    bool invert_negative_energy_momentum = true;
    if (invert_negative_energy_momentum) {
        c0 = neg_amount*inner_prod(p_d, neg_state);
        c2 = neg_amount*inner_prod(p_u, neg_state);
    }
    // std::complex<float> c1 = {1.0, 0.0};
    // std::complex<float> c2 = {0.0, 0.0};
    // std::complex<float> c3 = {0.0, 0.0};
    // std::complex<float> c0 = {0.0, 0.0};
    printf("+ spin up direction: (%g, %g, %g)",
        pos_spin_dir.x, pos_spin_dir.y, pos_spin_dir.z);
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
    std::complex<float> imag_unit (0.0, 1.0);
    // spinors::Spinor neg_d = get_spin_down_state(neg_spin_dir, 1.0);
    gaussian_wave_packet2d::momentum_init(
        m_frames.psi, m_frames.temps.fft,
        m_programs.split_operator.fft,
        m_programs.momentum_init, {
            .amplitude=1.0F,
            .sigma={.x=params.sigma, .y=params.sigma},
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
            .invert_negative_energy_momentum=invert_negative_energy_momentum,
            .dimensions2d=get_dimensions(params.sideLength),
            .texel_dimensions2d=get_texel_dimensions(texel_side_length),
            .coefficients={
                c0, c1, c2, c3
                // {0.0}, {1.0}, {0.0}, {0.0},
                // {0.0}, {1.0F/std::sqrt(2.0F)}, {0.0}, {imag_unit/std::sqrt(2.0F)}
            },
            .m=params.m,
            .c=params.c,
            .hbar=params.hbar});
}

void Simulation::new_position_space_wave_function(
    const SimParams &params,
    const Vec2 &tex_pos,
    const Vec2 &wave_num) {
    int texel_side_length 
        = convert_side_length_selector_value(
            params.texelSideLengthSelector.selected);
    Vec3 pos_spin_dir = params.posSpinDir.normalized();
    Vec3 neg_spin_dir = params.negSpinDir.normalized();
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
    float pos_amount = sqrt(params.posE);
    float neg_amount = negative_coeff(pos_amount);
    std::complex<float> c0 = neg_amount*inner_prod(p_u, neg_state);
    std::complex<float> c1 = pos_amount*inner_prod(p_u, pos_state);
    std::complex<float> c2 = neg_amount*inner_prod(p_d, neg_state);
    std::complex<float> c3 = pos_amount*inner_prod(p_d, pos_state);
    bool invert_negative_energy_momentum = false;
    if (invert_negative_energy_momentum) {
        c0 = neg_amount*inner_prod(p_d, neg_state);
        c2 = neg_amount*inner_prod(p_u, neg_state);
    }
    Vec2 d_2d = get_dimensions(params.sideLength);
    printf("+ spin up direction: (%g, %g, %g)",
        pos_spin_dir.x, pos_spin_dir.y, pos_spin_dir.z);
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
    gaussian_wave_packet2d::spatial_init(
        m_frames.psi, m_programs.wave_packet,
        {
            .wave_number=wave_num,
            .offset_tex_coord=tex_pos,
            .amplitude=0.5,
            .sigma_tex_coord={
                .x=params.sigma/d_2d.x, .y=params.sigma/d_2d.y},
            .s {
                spinors::BiSpinor(
                    spinors::Spinor(0.0, 0.0),
                    spinors::Spinor(0.0, 0.0))
            },
            .use_energy_states_combinations=int(1),
            .invert_negative_energy_momentum
                =invert_negative_energy_momentum,
            .dimensions2d=get_dimensions(params.sideLength),
            .texel_dimensions2d=get_texel_dimensions(texel_side_length),
            .coefficients={c0, c1, c2, c3},
            .m=params.m,
            .c=params.c
        });
    // m_frames.temps.psi_x[1].u.draw(
    //     m_programs.add2,
    //     {
    //         {"tex1", &m_frames.temps.psi_x[0][0]},
    //         {"tex2", &m_frames.psi[0]},
    //     }
    // );
    // m_frames.temps.psi_x[1].v.draw(
    //     m_programs.add2,
    //     {
    //         {"tex1", &m_frames.temps.psi_x[0][1]},
    //         {"tex2", &m_frames.psi[1]},
    //     }
    // );
    // m_frames.psi.u.draw(
    //     m_programs.copy,
    //     {{"tex", &m_frames.temps.psi_x[1].u}}
    // );
    // m_frames.psi.v.draw(
    //     m_programs.copy,
    //     {{"tex", &m_frames.temps.psi_x[1].v}}
    // );
}

void Simulation::new_wave_function(
    const SimParams &params,
    const Vec2 &tex_pos, const Vec2 &wave_num) {
    if (params.momentumSpaceInit)
        new_momentum_space_wave_function(params, tex_pos, wave_num);
    else
        new_position_space_wave_function(params, tex_pos, wave_num);
}

void Simulation::sketch_modify_scalar_potential(
    const SimParams &sim_params, const Vec2 &pos) {
    m_frames.visual_intermediate.draw(
        m_programs.copy,
        {{"tex", {&m_frames.potential}}}
    );
    Vec2 sigma = Vec2{
        .ind{
            sim_params.sketchSize/sim_params.sideLength,
            sim_params.sketchSize/sim_params.sideLength,
        }
    };
    m_frames.potential.draw(
        m_programs.sketch_potential,
        {
            {"tex", {&m_frames.visual_intermediate}},
            {"offsetTexCoord", {pos}},
            {"sigmaTexCoord", sigma},
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
    Vec2 sigma = Vec2{
        .ind{
            sim_params.sketchSize/sim_params.sideLength,
            sim_params.sketchSize/sim_params.sideLength,
        }
    };
    m_frames.potential.draw(
        m_programs.sketch_potential,
        {
            {"tex", {&m_frames.visual_intermediate}},
            {"offsetTexCoord", {pos}},
            {"sigmaTexCoord", sigma},
            {"amplitude", {Vec4{.x=dir.x, .y=dir.y, .z=0.0, .w=0.0}}},
            {"maxScalarValue", {80.0F}},
            {"maxVectorMag", {80.0F}},
        }
    );
}

void Simulation::erase_modify_scalar_potential(
    const SimParams &sim_params, const Vec2 &pos) {
    m_frames.visual_intermediate.draw(
        m_programs.copy,
        {{"tex", {&m_frames.potential}}}
    );
    Vec2 sigma = Vec2{
        .ind{
            sim_params.sketchSize/sim_params.sideLength,
            sim_params.sketchSize/sim_params.sideLength,
        }
    };
    m_frames.potential.draw(
        m_programs.sketch_potential,
        {
            {"tex", {&m_frames.visual_intermediate}},
            {"offsetTexCoord", {pos}},
            {"sigmaTexCoord", sigma},
            {"amplitude", {Vec4{.x=0.0, .y=0.0, .z=0.0, .w=-10.0}}},
            {"maxScalarValue", {80.0F}},
            {"maxVectorMag", {80.0F}},
        }
    );
}

void Simulation::erase_modify_vector_potential(
    const SimParams &sim_params, const Vec2 &pos, const Vec2 &dir) {
    m_frames.visual_intermediate.draw(
        m_programs.copy,
        {{"tex", {&m_frames.potential}}}
    );
    Vec2 sigma = Vec2{
        .ind{
            sim_params.sketchSize/sim_params.sideLength,
            sim_params.sketchSize/sim_params.sideLength,
        }
    };
    m_frames.potential.draw(
        m_programs.erase_vec_potential,
        {
            {"tex", {&m_frames.visual_intermediate}},
            {"offsetTexCoord", {pos}},
            {"sigmaTexCoord", sigma},
            {"amplitude", 80.0F},
        }
    );
}

void Simulation::modify_potential_with_user_program(
    const SimParams &sim_params, uint32_t program,
    std::map<std::string, float> variables
) {
    Uniforms uniforms {};
    for (auto &e: variables)
        uniforms.insert({e.first, Vec2{.x=e.second, .y=0.0}});
    uniforms.insert({"width", Vec2{.x=sim_params.sideLength, .y=0.0}});
    uniforms.insert({"height", Vec2{.x=sim_params.sideLength, .y=0.0}});
    uniforms.insert({"depth", Vec2{.x=sim_params.sideLength, .y=0.0}});
    uniforms.insert({"useRealPartOfExpression", int(1)});
    for (auto &e: uniforms) {
        printf("%s, %g\n", &e.first[0], e.second.f32);
    }
    m_frames.potential.draw(program, uniforms);
}

void Simulation::increment_time(SimParams &params) {
    int texel_side_length 
        = convert_side_length_selector_value(
            params.texelSideLengthSelector.selected);
    float dt = params.cdtdx
        * ((params.sideLength/float(texel_side_length))/params.c);
    float time_elapsed = params.stepsPerFrame*dt
            * (params.useNegativeTimeStep? -1.0: 1.0);
    params.t += time_elapsed;
}

void Simulation::change_simulation_dimensions(const SimParams &params) {
    IVec2 d_2d = {.ind{
        convert_side_length_selector_value(
            params.texelSideLengthSelector.selected), 
        convert_side_length_selector_value(
            params.texelSideLengthSelector.selected)
    }};
    m_frames.change_simulation_dimensions(d_2d);
}
