#include "simulation.hpp"
#include "cube_outline.hpp"
#include "cursor_outline3d.hpp"
#include "axes3d.hpp"
#include "bmp.hpp"
#include "spinors.hpp"

#include <iostream>

using namespace sim_3d;


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
    this->copy = Quad::make_program_from_path(
        "./shaders/util/copy.frag"
    );
    this->user_defined = 0;
    this->visualization.domain_color = Quad::make_program_from_path(
        "./shaders/vol-render/domain-coloring.frag"
    );
    this->visualization.gradient = Quad::make_program_from_path(
        "./shaders/gradient/gradient3d.frag"
    );
    this->visualization.blur = Quad::make_program_from_path(
        "./shaders/util/blur.frag"
    );
    this->visualization.cube_outline = make_program_from_paths(
        "./shaders/cube-outline/cube-outline.vert",
        "./shaders/util/uniform-color.frag"
    );
    this->visualization.cursor_outline = make_program_from_paths(
        "./shaders/cursor/outline3d.vert",
        "./shaders/util/uniform-color.frag"
    );
    this->visualization.axes_3d = make_program_from_paths(
        "./shaders/axes/axes3d.vert",
        "./shaders/axes/axes3d.frag"
    );
    this->visualization.axes_labels_3d = make_program_from_paths(
        "./shaders/axes/axes-labels3d.vert",
        "./shaders/axes/axes3d.frag"
    );
    this->init = Quad::make_program_from_path(
        "./shaders/wavepacket/gaussian-position-space.frag");
    this->init_momentum = Quad::make_program_from_path(
        "./shaders/wavepacket/gaussian-momentum-space.frag"
    );
    this->split_step.momentum = Quad::make_program_from_path(
        "./shaders/split-step/kinetic.frag"
    );
    this->split_step.spatial = Quad::make_program_from_path(
        "./shaders/split-step/spatial.frag"
    );
    this->quantities.current = Quad::make_program_from_path(
        "./shaders/current/current.frag"
    );
    this->quantities.pseudo_current = Quad::make_program_from_path(
        "./shaders/current/pseudocurrent.frag"
    );
    this->quantities.scalar = Quad::make_program_from_path(
        "./shaders/scalar/scalar.frag"
    );
    this->quantities.pseudo_scalar = Quad::make_program_from_path(
        "./shaders/scalar/pseudoscalar.frag"
    );
    this->fft.iter_cube = Quad::make_program_from_path(
        "./shaders/fft/fft-iter-cube.frag"
    );
    this->fft.rev_bit_sort2 = Quad::make_program_from_path(
        "./shaders/fft/rev-bit-sort2.frag"
    );
    this->fft.shift = Quad::make_program_from_path(
        "./shaders/fft/fftshift.frag"
    );
}

Frames::
Frames(const TextureParams &default_tex_params, const SimParams &params):
    view_tex_params(default_tex_params),
    sim_tex_params({
        .format=GL_RGBA32F,
        .width=(unsigned int)get_2d_from_3d_dimensions(
            params.simulationDimensions3D)[0],
        .height=(unsigned int)get_2d_from_3d_dimensions(
            params.simulationDimensions3D)[1],
        .generate_mipmap=default_tex_params.generate_mipmap,
        .min_filter=default_tex_params.min_filter,
        .mag_filter=default_tex_params.mag_filter,
        .wrap_s=GL_REPEAT,
        .wrap_t=GL_REPEAT
    }),
    data_reduce_tex_params({
        .format=GL_RGBA32F,
        .width=(unsigned int)get_2d_from_3d_dimensions(
            params.dataTexelDimensions3D)[0],
        .height=(unsigned int)get_2d_from_3d_dimensions(
            params.dataTexelDimensions3D)[1],
        .generate_mipmap=default_tex_params.generate_mipmap,
        .min_filter=default_tex_params.min_filter,
        .mag_filter=default_tex_params.mag_filter,
        .wrap_s=GL_REPEAT,
        .wrap_t=GL_REPEAT
    }),
    render_tmp(default_tex_params),
    render(default_tex_params),
    data_reduce(data_reduce_tex_params),
    data_reduce_tmp(data_reduce_tex_params),
    temps{
        Quad(sim_tex_params), Quad(sim_tex_params),
        Quad(sim_tex_params), Quad(sim_tex_params),
        Quad(sim_tex_params), Quad(sim_tex_params)
    },
    spinors {
        {Quad(sim_tex_params), Quad(sim_tex_params)},
        {Quad(sim_tex_params), Quad(sim_tex_params)},
    },
    potential (Quad(sim_tex_params)),
    quad_wire_frame(get_quad_wire_frame()),
    arrows3d_frame(
        line_arrows3d::get_3d_vector_field_wire_frame(
            params.arrowDimensions)),
    conical_arrows3d_frame(
        conical_arrows3d::get_3d_vector_field_wire_frame(
            params.arrowDimensions, 13)) {
}

void Frames::reset_simulation_dimensions(IVec3 texel_dimensions3d) {
    IVec2 texel_dimensions2d = get_2d_from_3d_dimensions(texel_dimensions3d);
    this->sim_tex_params.width = texel_dimensions2d[0];
    this->sim_tex_params.height = texel_dimensions2d[1];
    for (int i = 0; i < 6; i++)
        this->temps[i].reset(this->sim_tex_params);
    for (int i = 0; i < 2; i++)
        for (int j = 0; j < 2; j++)
            this->spinors[i][j].reset(this->sim_tex_params);
    potential.reset(this->sim_tex_params);
}

void Frames::reset_data_reduce_dimensions(IVec3 texel_dimensions3d) {
     IVec2 texel_dimensions2d = get_2d_from_3d_dimensions(texel_dimensions3d);
    this->data_reduce_tex_params.width = texel_dimensions2d[0];
    this->data_reduce_tex_params.height = texel_dimensions2d[1];
    this->data_reduce.reset(this->data_reduce_tex_params);
    this->data_reduce_tmp.reset(this->data_reduce_tex_params);
}

void Simulation::reset_simulation_dimensions(IVec3 simulation_dimensions3d) {
    this->m_frames.reset_simulation_dimensions(simulation_dimensions3d);
}

static Vec3 scale_rotate(Vec3 r, float scale, Quaternion rotation) {
    Vec3 r2 = r - Vec3{.x=0.5, 0.5, 0.0};
    Quaternion q = rotate(
        Quaternion{.real=1.0, r2.x, r2.y, r2.z},
        rotation.conj());
    return Vec3{.x=q.i/scale, q.j/scale, q.k/scale};
}

static void take_screenshot(
    const SimParams &params, RenderTarget &render,
    std::vector<unsigned char> &image_data,
    std::vector<unsigned char> &image_rgba_arr) {
    if (params.takeScreenshots.is_recording) {
        BMPHeader header (
            params.takeScreenshots.width, 
            params.takeScreenshots.height);
        memcpy(
            (unsigned char *)&image_data[0], 
            &header, sizeof(BMPHeader));
        render.fill_array_with_contents(
            (unsigned char *)&image_rgba_arr[0]);
        for (int i = 0; i < params.takeScreenshots.height; i++) {
            for (int j = 0; j < params.takeScreenshots.width; j++) {
                // unsigned char a = image_rgba_arr[
                //     4*(i*params.takeScreenshots.width + j)];
                unsigned char r = image_rgba_arr[
                    4*(i*params.takeScreenshots.width + j) + 2];
                unsigned char g = image_rgba_arr[
                    4*(i*params.takeScreenshots.width + j) + 1];
                unsigned char b = image_rgba_arr[
                    4*(i*params.takeScreenshots.width + j)];
                image_data[
                    54 + 3*(i*params.takeScreenshots.width + j)
                ] = r;
                image_data[
                    54 + 3*(i*params.takeScreenshots.width + j) + 1
                ] = g;
                image_data[
                    54 + 3*(i*params.takeScreenshots.width + j) + 2
                ] = b;
            }
        }
        BMPHeader *header_ptr = (BMPHeader *)(&image_data[0]);
        int max_val = 0;
        for (int i = 54; i < image_data.size(); i++)
            max_val = (image_data[i] > max_val)? image_data[i]: max_val;
        printf("Max val: %d\n", max_val);
        print_bmp_header(*header_ptr);
    }
}

Simulation::
Simulation(const TextureParams &default_tex_params, const SimParams &params
) : m_volume_render(default_tex_params,
    params.volumeTexelDimensions3D,
    params.dataTexelDimensions3D),
    m_planar_slices(default_tex_params),
    m_arrows3d(params.arrowDimensions, default_tex_params),
    m_conical_arrows3d(params.arrowDimensions, 13, default_tex_params),
    m_frames(default_tex_params, params) {
    m_image_data = std::vector<unsigned char>(
        54 + get_bmp_row_byte_size(params.takeScreenshots.width)
        *params.takeScreenshots.height, 0
    );
    m_image_rgba_arr = std::vector<unsigned char>(
        4*params.takeScreenshots.width*params.takeScreenshots.height, 0);
}

static Quad* fft_iter_cube(
    uint32_t fft_iter_cube_program,
    Quad *iter_quads[2],
    bool is_inverse, IVec3 texel_dimensions_3d) {
    int size = texel_dimensions_3d[0];
    IVec2 texel_dimensions_2d
         = get_2d_from_3d_dimensions(texel_dimensions_3d);
    for (int block_size = 2; block_size <= size; block_size *= 2) {
        float angle_sign = (is_inverse)? 1.0: -1.0;
        float tex_block_size = double(block_size)/double(size);
        float scale = (is_inverse && block_size == size)?
            (1.0/double(size)): 1.0;
        iter_quads[1]->draw(
            fft_iter_cube_program,
            {
                {"tex", {iter_quads[0]}},
                {"blockSize", {tex_block_size}},
                {"angleSign", {angle_sign}},
                {"scale", {scale}},
                {"size", {float(size)}},
                // {"useCosTable", {false}},
                {"texelDimensions2D", {IVec2{texel_dimensions_2d}}},
                {"texelDimensions3D", {IVec3{texel_dimensions_3d}}}
            }
        );
        // Quad *tmp = iter_quads[0];
        // iter_quads[0] = iter_quads[1];
        // iter_quads[1]  = tmp;
        std::swap(iter_quads[0], iter_quads[1]);
    }
    return iter_quads[0];
}

static void rev_bit_sort2(
    uint32_t rev_bit_sort2_program,
    Quad *dst, const Quad *src, IVec3 texel_dimensions_3d) {
    IVec2 texel_dimensions_2d
        = get_2d_from_3d_dimensions(texel_dimensions_3d);
    dst->draw(
        rev_bit_sort2_program,
        {
            {"tex", {src}},
            {"texelDimensions2D", {IVec2{texel_dimensions_2d}}},
            {"texelDimensions3D", {IVec3{texel_dimensions_3d}}},
        }
    );
}

static Vec3 get_3d_dimensions(float side_length) {
    return {.ind{
        side_length, side_length, side_length
    }};
}

static IVec3 get_3d_texel_dimensions(int texel_side_length) {
    return {.ind{
        texel_side_length, texel_side_length, texel_side_length
    }};
}

void Simulation::fft(Quad *dst, Quad *src, SimParams sim_params) {
    IVec3 id_3d = get_3d_texel_dimensions(sim_params.texelSideLength);
    rev_bit_sort2(m_programs.fft.rev_bit_sort2, dst, src, id_3d);
    Quad *iter_quads[2] = {dst, &m_frames.temps[0]};
    Quad *res = fft_iter_cube(
        m_programs.fft.iter_cube, iter_quads, false, id_3d);
    *dst = *res;
}

void Simulation::ifft(Quad *dst, Quad *src, SimParams sim_params) {
    IVec3 id_3d = get_3d_texel_dimensions(sim_params.texelSideLength);
    rev_bit_sort2(m_programs.fft.rev_bit_sort2, dst, src, id_3d);
    Quad *iter_quads[2] = {dst, &m_frames.temps[1]};
    Quad *res = fft_iter_cube(
        m_programs.fft.iter_cube, iter_quads, true, id_3d);
    *dst = *res;
}

void Simulation::split_step_momentum(
    Quad &dst, int index,
    const Quad &u, const Quad &v, SimParams sim_params) {
    IVec3 id_3d = get_3d_texel_dimensions(sim_params.texelSideLength);
    Vec3 d_3d = get_3d_dimensions(sim_params.sideLength);
    IVec2 id_2d = get_2d_from_3d_dimensions(id_3d);
    dst.draw(
        m_programs.split_step.momentum,
        {
            {"numberOfDimensions", {int(3)}},
            {"texelDimensions2D", {id_2d}},
            {"texelDimensions3D", {id_3d}},
            {"dimensions3D", {d_3d}},
            {"uTex", {&u}},
            {"vTex", {&v}},
            {"dt", {sim_params.dt}},
            {"m", {sim_params.m}},
            {"c", {sim_params.c}},
            {"hbar", {sim_params.hbar}},
            {"spinorIndex", {index}},
            {"representation", {int(0)}},
        }
    );
}

void Simulation::split_step_spatial(
    Quad &dst, int index,
    const Quad &u, const Quad &v, const Quad &potential,
    SimParams sim_params, float dt) {
    // dst.draw(m_programs.add2, 
    // {{"tex1", {&u}}, {{"tex2"}, {&v}}});
    dst.draw(
        m_programs.split_step.spatial,
        {
            {"dt", {dt}},
            {"m", {sim_params.m}},
            {"c", {sim_params.c}},
            {"hbar", {sim_params.hbar}},
            {"uTex", {&u}},
            {"vTex", {&v}},
            {"potentialTex", {&potential}},
            {"spinorIndex", {index}},
            {"representation", {int(0)}},
        }
    );
}

void Simulation::split_step(const SimParams &sim_params) {
    int next = 1, last = 0;

    for (int i = 0; i < 2; i++)
        this->split_step_spatial(
            m_frames.spinors[next][i], i, 
            m_frames.spinors[last][0], m_frames.spinors[last][1], 
            m_frames.potential, 
            sim_params, sim_params.dt/2.0);
    
    std::swap(next, last);
    for (int i = 0; i < 2; i++)
        this->fft(&m_frames.spinors[next][i], 
            &m_frames.spinors[last][i], sim_params);
    
    std::swap(next, last);
    for (int i = 0; i < 2; i++)
        this->split_step_momentum(
            m_frames.spinors[next][i], i,
            m_frames.spinors[last][0], m_frames.spinors[last][1], sim_params);
    
    std::swap(next, last);
    for (int i = 0; i < 2; i++)
        this->ifft(&m_frames.spinors[next][i], 
            &m_frames.spinors[last][i], sim_params);

    std::swap(next, last);
    for (int i = 0; i < 2; i++)
        this->split_step_spatial(
            m_frames.spinors[next][i], i, 
            m_frames.spinors[last][0], m_frames.spinors[last][1], 
            m_frames.potential, 
            sim_params, sim_params.dt/2.0);
    
    if (next != 0) {
        m_frames.spinors[0][0].draw(
            m_programs.copy, {{"tex", {&m_frames.spinors[1][0]}}});
        m_frames.spinors[0][1].draw(
            m_programs.copy, {{"tex", {&m_frames.spinors[1][1]}}});
    }
}

#define PI 3.141592653589793

static Vec3 get_momentum(IVec3 wave_num, Vec3 d_3d) {
    return {
        .x=(float)(2.0*PI*wave_num.x/d_3d.x),
        .y=(float)(2.0*PI*wave_num.y/d_3d.y),
        .z=(float)(2.0*PI*wave_num.z/d_3d.z)
    };
}

static Vec3 wave_number_to_momentum(
    Vec3 wave_number, IVec3 dimensions3d
) {
    return {
        .x=float(2.0F*PI*wave_number.x/float(dimensions3d.x)),
        .y=float(2.0F*PI*wave_number.y/float(dimensions3d.y)),
        .z=float(2.0F*PI*wave_number.z/float(dimensions3d.z)),
    };
}

static float negative_coeff(float positive_coeff) {
    return std::sqrt(1.0F - positive_coeff*positive_coeff);
}

/* void momentum_init(
    dirac_split_step2d::BiSpinorQuad &dst,
    fft2d::QuadTemps &temps,
    fft2d::Programs fft_programs,
    uint32_t momentum_init_program,
    MomentumInitParams params) {
    Vec2 c0, c1, c2, c3;
    c0.x = std::real(params.coefficients[0]);
    c0.y = std::imag(params.coefficients[0]);
    c1.x = std::real(params.coefficients[1]);
    c1.y = std::imag(params.coefficients[1]);
    c2.x = std::real(params.coefficients[2]);
    c2.y = std::imag(params.coefficients[2]);
    c3.x = std::real(params.coefficients[3]);
    c3.y = std::imag(params.coefficients[3]);
    for (int spinor_index = 0; spinor_index < 2; spinor_index++) {
        dst[spinor_index].draw(
            momentum_init_program, 
            {
                {"amplitude", {params.amplitude}},
                {"sigma", {params.sigma}},
                {"p0", {params.p0}},
                {"x0", {params.x0}},
                {"spinor", {params.s[spinor_index].store_as_vec4()}},
                {"useEnergyStatesCombinations",
                    {int(params.use_energy_states_combinations)}},
                {"invertNegativeEnergyMomentum", 
                    {int(params.invert_negative_energy_momentum)}},
                {"dimensions2D", {params.dimensions2d}},
                {"texelDimensions2D", {params.texel_dimensions2d}},
                {"spinorIndex", {int(spinor_index)}},
                {"representation", {int(0)}},
                {"coefficient0", {c0}},
                {"coefficient1", {c1}},
                {"coefficient2", {c2}},
                {"coefficient3", {c3}},
                {"m", {params.m}},
                {"c", {params.c}},
                {"hbar", {params.hbar}},
            }
        );
    }
    ifft(dst, dst, temps, fft_programs, params.texel_dimensions2d);
}*/

static Vec3 wave_number_to_momentum(
    IVec3 wave_number, Vec3 dimensions3d
) {
    return {
        .x=2.0F*float(PI)*float(wave_number.x)/dimensions3d.x,
        .y=2.0F*float(PI)*float(wave_number.y)/dimensions3d.y,
        .z=2.0F*float(PI)*float(wave_number.z)/dimensions3d.z,
    };
}

static Vec3 tex_to_sim_coordinates(
    Vec3 tex_coord, Vec3 dimensions3d
) {
    return {
        .x=tex_coord.x*dimensions3d.x,
        .y=tex_coord.y*dimensions3d.y,
        .z=tex_coord.z*dimensions3d.z
    };
}

void Simulation::init_momentum(
    const SimParams &sim_params,
    const Vec3 &tex_pos, const IVec3 &wave_num, float sigma
) {
    Vec3 pos_spin_dir = sim_params.posSpinDir.normalized();
    Vec3 neg_spin_dir = sim_params.negSpinDir.normalized();
    spinors::Spinor pos_state = spinors::get_spin_up_state(pos_spin_dir, 1.0);
    spinors::Spinor neg_state = spinors::get_spin_up_state(neg_spin_dir, 1.0);
    // Vec3 p_xyz = wave_number_to_momentum(
    //     wave_num, get_dimensions(sim_params.sideLength));
    // Vec3 p {.ind{p_xyz.x, p_xyz.y, p_xyz.z}};
    IVec2 id_2d = IVec2{.x=int(m_frames.sim_tex_params.width), 
                       .y=int(m_frames.sim_tex_params.height)};
    IVec3 id_3d = get_3d_texel_dimensions(sim_params.texelSideLength);
    Vec3 d_3d = get_3d_dimensions(sim_params.sideLength);
    Vec3 p = get_momentum(wave_num, d_3d);
    float length_p = p.length();
    spinors::Spinor p_u
        = spinors::get_spin_up_state(p, length_p);
    spinors::Spinor p_d
        = spinors::get_spin_down_state(p, length_p);
    float pos_amount = sqrt(sim_params.posE);
    float neg_amount = negative_coeff(pos_amount);
    std::complex<float> c0 = neg_amount*inner_prod(p_u, neg_state);
    std::complex<float> c1 = pos_amount*inner_prod(p_u, pos_state);
    std::complex<float> c2 = neg_amount*inner_prod(p_d, neg_state);
    std::complex<float> c3 = pos_amount*inner_prod(p_d, pos_state);
    Quad *tmp_quads[2] = {&m_frames.temps[2], &m_frames.temps[3]};
    for (int spinor_index = 0; spinor_index < 2; spinor_index++) {
        tmp_quads[spinor_index]->draw(
            m_programs.init_momentum, 
            {
                {"amplitude", {1.0F}},
                {"sigma", Vec3{
                        .x=sim_params.sigma,
                        .y=sim_params.sigma,
                        .z=sim_params.sigma}},
                {"p0", wave_number_to_momentum(sim_params.wavenumber, d_3d)},
                {"x0", tex_to_sim_coordinates(tex_pos, d_3d)},
                {"useEnergyStatesCombinations",
                    {int(1)}},
                {"invertNegativeEnergyMomentum", 
                    {int(0)}},
                {"dimensions3D", {d_3d}},
                {"texelDimensions2D", {id_2d}},
                {"texelDimensions3D", {id_3d}},
                {"spinorIndex", {int(spinor_index)}},
                {"representation", {int(0)}},
                {"coefficient0", Vec2{.ind{c0.real(), c0.imag()}}},
                {"coefficient1", Vec2{.ind{c1.real(), c1.imag()}}},
                {"coefficient2", Vec2{.ind{c2.real(), c2.imag()}}},
                {"coefficient3", Vec2{.ind{c3.real(), c3.imag()}}},
                {"m", {sim_params.m}},
                {"c", {sim_params.c}},
                {"hbar", {sim_params.hbar}},
            }
        );
    }
    ifft(&m_frames.spinors[0][0], tmp_quads[0], sim_params);
    ifft(&m_frames.spinors[0][1], tmp_quads[1], sim_params);
    m_frames.spinors[1][0] = m_frames.spinors[0][0];
    m_frames.spinors[1][1] = m_frames.spinors[0][1];
}

// #include <iostream>
void Simulation::init(const SimParams &sim_params,
    const Vec3 &tex_pos, const IVec3 &wave_num, float sigma) {
    if (sim_params.momentumSpaceInit) {
        this->init_momentum(sim_params, tex_pos, wave_num, sigma);
        return;
    }
    IVec2 id_2d = IVec2{.x=int(m_frames.sim_tex_params.width), 
                       .y=int(m_frames.sim_tex_params.height)};
    IVec3 id_3d = get_3d_texel_dimensions(sim_params.texelSideLength);
    Vec3 d_3d = get_3d_dimensions(sim_params.sideLength);
    Vec3 p = get_momentum(wave_num, d_3d);
    Vec3 pos_spin_dir = sim_params.posSpinDir.normalized();
    Vec3 neg_spin_dir = sim_params.negSpinDir.normalized();
    spinors::Spinor pos_state = spinors::get_spin_up_state(pos_spin_dir, 1.0);
    spinors::Spinor neg_state = spinors::get_spin_up_state(neg_spin_dir, 1.0);
    // Vec3 p_xyz = wave_number_to_momentum(
    //     wave_num, get_dimensions(sim_params.sideLength));
    // Vec3 p {.ind{p_xyz.x, p_xyz.y, p_xyz.z}};
    float length_p = p.length();
    spinors::Spinor p_u
        = spinors::get_spin_up_state(p, length_p);
    spinors::Spinor p_d
        = spinors::get_spin_down_state(p, length_p);
    float pos_amount = sqrt(sim_params.posE);
    float neg_amount = negative_coeff(pos_amount);
    std::complex<float> c0 = neg_amount*inner_prod(p_u, neg_state);
    std::complex<float> c1 = pos_amount*inner_prod(p_u, pos_state);
    std::complex<float> c2 = neg_amount*inner_prod(p_d, neg_state);
    std::complex<float> c3 = pos_amount*inner_prod(p_d, pos_state);
    // BiSpinor s (Spinor(1.0, 0.0), Spinor(0.0, 0.0));
    // std::cout << s[0][0] << std::endl;
    // std::cout << s[0][1] << std::endl;
    // std::cout << s[1][0] << std::endl;
    // std::cout << s[1][1] << std::endl;
    // m_frames.potential.draw(
    //     m_programs.uniform_color,
    //     {{"color", {Vec4{.ind={0.0, 0.0, 0.0, 0.0}}}}}
    // );
    for (int j = 0; j < 2; j++) {
        for (int i = 0; i < 2; i++) {
            m_frames.spinors[j][i].draw(
                m_programs.init,
                {
                    {"amplitude", {1.0F}},
                    {"waveNumber", {Vec3{.ind={
                            (float)wave_num.x,
                            (float)wave_num.y,
                            (float)wave_num.z}}}},
                    {"offsetTexCoord", {tex_pos}},
                    {"sigmaTexCoord", {Vec3{.ind={sigma, sigma, sigma}}}},
                    {"texelDimensions2D", {id_2d}},
                    {"texelDimensions3D", {id_3d}},
                   // {"spinor", {s[i].store_as_vec4()}},
                    {"useEnergyStatesCombinations", int(1)},
                    {"dimensions3D", {d_3d}},
                    {"spinorIndex", {int(i)}},
                    {"representation", {int(0)}},
                    {"c0", Vec2{.ind{c0.real(), c0.imag()}}},
                    {"c1", Vec2{.ind{c1.real(), c1.imag()}}},
                    {"c2", Vec2{.ind{c2.real(), c2.imag()}}},
                    {"c3", Vec2{.ind{c3.real(), c3.imag()}}},
                    {"m", {sim_params.m}},
                    {"c", {sim_params.c}},
                }
            );
        }
    }
}

void Simulation::init_from_cursor_position(
    const SimParams &sim_params,
    Quaternion rotate, float scale,
    int offset_xy, int offset_yz, int offset_xz,
    const Vec2 &cursor_pos, const IVec3 &wave_num, float sigma
    ) {
    IVec3 id_3d = {.ind={
        sim_params.texelSideLength,
        sim_params.texelSideLength, 
        sim_params.texelSideLength
    }};
    auto intersection 
        = m_planar_slices.most_perpendicular_intersection(
        id_3d, rotate, scale, offset_xy, offset_yz, offset_xz, cursor_pos);
    intersection = intersection/2.0 + Vec3{.ind{0.5, 0.5, 0.5}};
    // std::cout << "Cursor Position: "<< cursor_pos.x << ", " << cursor_pos.y << "\n";
    // intersection.z = -intersection.z;
    this->init(sim_params, intersection, wave_num, sigma);
}

void Simulation::init_from_cursor_positions(
    const SimParams &sim_params,
    Quaternion rotate, float scale,
    int offset_xy, int offset_yz, int offset_xz,
    const Vec2 &cursor_pos1, const Vec2 &cursor_pos2, float sigma
    ) {
    IVec3 id_3d = {.ind={
        sim_params.texelSideLength,
        sim_params.texelSideLength, 
        sim_params.texelSideLength
    }};
    auto intersection1 
        = m_planar_slices.most_perpendicular_intersection(
        id_3d, rotate, scale, offset_xy, offset_yz, offset_xz, cursor_pos1);
    auto intersection2
        = m_planar_slices.most_perpendicular_intersection(
        id_3d, rotate, scale, offset_xy, offset_yz, offset_xz, cursor_pos2);
    auto intersection = intersection1/2.0 + Vec3{.ind{0.5, 0.5, 0.5}};
    auto r = (intersection2 - intersection1);
    // auto dist =  r.length();
    // auto wave_num_f = 0.5F*r*(float)sim_params.texelSideLength;
    auto wave_num = IVec3{};
    for (int i = 0; i < 3; i++)
        wave_num[i] = int(std::max(
            std::min(
                (float)sim_params.texelSideLength/4, 
                0.25F*r[i]*sim_params.texelSideLength),
            -(float)sim_params.texelSideLength/4));
    // std::cout << "Cursor Position: "<< cursor_pos.x << ", " << cursor_pos.y << "\n";
    // intersection.z = -intersection.z;
    this->init(sim_params, intersection, wave_num, sigma);
}

#include <iostream>

/* void Simulation::set_potential_from_program(
    uint32_t program, const Uniforms &uniforms, const SimParams &sim_params) {
    Uniforms uniforms_mod = uniforms;
    // auto t = Uniform((float)sim_params.t);
    uniforms_mod.insert({"t", Uniform((float)sim_params.t)});
    // uniforms_mod["t"] = (float)sim_params.t;
    uniforms_mod.insert({"width",
        Uniform(Vec2{.x=(float)sim_params.sideLength, .y=0.0})});
    uniforms_mod.insert({"height",
        Uniform(Vec2{.x=(float)sim_params.sideLength, .y=0.0})});
    uniforms_mod.insert({"depth",
        Uniform(Vec2{.x=(float)sim_params.sideLength, .y=0.0})});
    IVec3 tex_dimensions_3d {.ind={
        sim_params.texelSideLength,
        sim_params.texelSideLength,
        sim_params.texelSideLength}};
    IVec2 tex_dimensions_2d = get_2d_from_3d_dimensions(tex_dimensions_3d);
    uniforms_mod.insert({"texelDimensions2D",
        Uniform(tex_dimensions_2d)});
    uniforms_mod.insert({"texelDimensions3D",
        Uniform(tex_dimensions_3d)});
    uniforms_mod.insert({"useRealPartOfExpression", Uniform(int(1))});
    m_frames.potential.draw(
        program, uniforms_mod
    );
    // for (auto &e: uniforms_mod) {
    //     std::cout << e.first << std::endl;
    //     std::cout << e.second.vec2[0] << std::endl;
    // }
}*/

void Simulation::time_step(const SimParams &sim_params) {
    split_step(sim_params);
}

static Vec4 encode_2x2(float m00, float m11, std::complex<float> m01) {
    return {
        .ind{m00, m11, 
        std::real(m01), std::imag(m01)}};
}


const RenderTarget &Simulation
::view(
    const SimParams &params,
    const std::optional<Vec2> &hover,
    ::Quaternion rotation, float scale) {
    enum {VOL_RENDER_VIEW=0, PLANAR_SLICES_VIEW=1, VECTOR_FIELD_VIEW=2, 
        PLANR_SLICES_VECTOR_FIELD_VIEW=3, VOL_RENDER_VECTOR_FIELD_VIEW=4};
    m_frames.data_reduce.draw(
        m_programs.visualization.domain_color,
        {
            {"tex", &m_frames.spinors[0][0]},
            {"phaseAdjust", (float)params.c*params.c*params.m*params.t},
            {"brightness", (float)params.brightness},
            {"brightnessMode", int(1)},

        }
    );
    // WireFrame wf = get_quad_wire_frame();
    // m_frames.data_reduce.draw(m_programs.copy, {{"tex", &m_frames.spinors[0][0]}});
    // m_frames.render.draw(m_programs.copy, {{"tex", &m_frames.data_reduce}}, wf);
    // return m_frames.render;
    switch(params.visualizationSelect.selected) {
        case PLANAR_SLICES_VIEW: case PLANR_SLICES_VECTOR_FIELD_VIEW: {
            this->m_frames.render.clear();
            this->m_frames.render_tmp.clear();
            Vec2 scaled_hover;
            if (hover.has_value()) {
                IVec2 tex_dims = m_frames.render.texture_dimensions();
                scaled_hover = Vec2{
                    .x=hover->x,
                    .y=hover->y*(float(tex_dims[1])/float(tex_dims[0]))
                        + 0.5F*(1.0F - float(tex_dims[1])/float(tex_dims[0])) 
                };
            }
            m_planar_slices.view(
                this->m_frames.render,
                this->m_frames.data_reduce, params.dataTexelDimensions3D,
                rotation, scale,
                int(params.dataTexelDimensions3D.z
                    *params.planarNormCoordOffsets[0]),
                int(params.dataTexelDimensions3D.x
                    *params.planarNormCoordOffsets[1]),
                int(params.dataTexelDimensions3D.y
                    *params.planarNormCoordOffsets[2]),
                (hover.has_value())? scaled_hover: Vec2{.ind {0.0, 0.0}},
                params.usePerspectiveProjection
            );
            this->m_cursor_location = m_planar_slices.most_perpendicular_intersection(
                params.dataTexelDimensions3D,
                rotation, scale,
                int(params.dataTexelDimensions3D.z
                    *params.planarNormCoordOffsets[0]),
                int(params.dataTexelDimensions3D.x
                    *params.planarNormCoordOffsets[1]),
                int(params.dataTexelDimensions3D.y
                    *params.planarNormCoordOffsets[2]),
                (hover.has_value())? scaled_hover: Vec2{.ind {0.0, 0.0}}
            );
            {
                IVec3 arrows_d3d = params.arrowDimensions;
                IVec2 arrows_d2d = get_2d_from_3d_dimensions(arrows_d3d);
                IVec3 tex_d3d = params.dataTexelDimensions3D;
                IVec2 tex_d2d = get_2d_from_3d_dimensions(tex_d3d);
                Vec3 dr = Vec3{.x=1.0F, 1.0F, 1.0F};
                this->m_frames.data_reduce_tmp.draw(
                    m_programs.visualization.gradient,
                    {
                        {"tex", &m_frames.data_reduce},
                        {"orderOfAccuracy", int(4)},
                        {"staggeredMode", int(0)},
                        {"index", int(0)},
                        {"texelDimensions3D", tex_d3d},
                        {"texelDimensions2D", tex_d2d},
                        {"dr", dr},
                        {"dimensions3D", params.simulationDimensions3D}

                    }
                );

                this->m_frames.render_tmp.clear();
                // this->m_frames.render.clear();
                if (params.visualizationSelect.selected 
                        == PLANR_SLICES_VECTOR_FIELD_VIEW) {
                    if (params.useCones) {
                        m_conical_arrows3d.view(
                            this->m_frames.render, this->m_frames.data_reduce_tmp,
                            2.0*scale, rotation, 
                            params.arrowDimensions,
                            params.dataTexelDimensions3D,
                            {
                                {"useOrthogonalProjection",
                                        (params.usePerspectiveProjection)? 
                                        int(0): int(1)},
                                {"rescaleZ", int(0)}
                            });
                    } else {
                        m_arrows3d.view(
                            this->m_frames.render, this->m_frames.data_reduce_tmp,
                            2.0*scale, rotation, 
                            params.arrowDimensions,
                            params.dataTexelDimensions3D,
                            {
                                {"useOrthogonalProjection",
                                        (params.usePerspectiveProjection)? 
                                        int(0): int(1)},
                                {"rescaleZ", int(0)}
                            });
                    }
                }
                
            }
            WireFrame axes = axes3d::get_axes_wireframe();
            WireFrame axes_labels = axes3d::get_xyz_axes_labels_wireframe();
            axes3d::draw_axes(
                this->m_frames.render,
                {.axes=m_programs.visualization.axes_3d, 
                           .labels=m_programs.visualization.axes_labels_3d},
                axes, axes_labels,
                rotation, 110, 0.0F,
                params.usePerspectiveProjection, 
                m_frames.render.texture_dimensions());
            /*glDisable(GL_DEPTH_TEST);
            WireFrame cube_outline = get_cube_outline_wire_frame();
            this->m_frames.render.draw(
                m_programs.cube_outline,
                {
                    {"rotation", rotation},
                    {"viewScale", scale},
                    {"color", Vec4{.ind{1.0, 1.0, 1.0, 0.5}}},
                    {"usePerspectiveProjection", int(0)},
                    {"rescaleZ", int(0)}
                },
                cube_outline
            );*/
            take_screenshot(
                params, m_frames.render, 
                m_image_data, m_image_rgba_arr);
            return m_frames.render;
        }
        case VECTOR_FIELD_VIEW: {
            IVec3 arrows_d3d = params.arrowDimensions;
            IVec2 arrows_d2d = get_2d_from_3d_dimensions(arrows_d3d);
            IVec3 tex_d3d = params.dataTexelDimensions3D;
            IVec2 tex_d2d = get_2d_from_3d_dimensions(tex_d3d);
            Vec3 dr = Vec3{.x=1.0F, 1.0F, 1.0F};
            this->m_frames.data_reduce_tmp.draw(
                m_programs.visualization.gradient,
                {
                    {"tex", &m_frames.data_reduce},
                    {"orderOfAccuracy", int(4)},
                    {"staggeredMode", int(0)},
                    {"index", int(0)},
                    {"texelDimensions3D", tex_d3d},
                    {"texelDimensions2D", tex_d2d},
                    {"dr", dr},
                    {"dimensions3D", params.simulationDimensions3D}

                }
            );
            this->m_frames.render_tmp.clear();
            this->m_frames.render.clear();
            if (params.useCones) {
                m_conical_arrows3d.view(
                    this->m_frames.render, this->m_frames.data_reduce_tmp,
                    2.0*scale, rotation,
                    params.arrowDimensions,
                    params.dataTexelDimensions3D,
                    {
                        {"useOrthogonalProjection", 
                                (params.usePerspectiveProjection)? int(0): int(1)},
                        {"rescaleZ", int(0)}
                    });
            } else {
                m_arrows3d.view(
                    this->m_frames.render, this->m_frames.data_reduce_tmp,
                    2.0*scale, rotation, 
                    params.arrowDimensions,
                    params.dataTexelDimensions3D,
                    {
                        {"useOrthogonalProjection", 
                                (params.usePerspectiveProjection)? int(0): int(1)},
                        {"rescaleZ", int(0)}
                    });
            }
            WireFrame cube_outline = get_cube_outline_wire_frame();
            this->m_frames.render.draw(
                m_programs.visualization.cube_outline,
                {
                    {"rotation", rotation},
                    {"viewScale", scale},
                    {"color", Vec4{.ind{1.0, 1.0, 1.0, 0.5}}},
                    {"usePerspectiveProjection",
                        (params.usePerspectiveProjection)? int(1): int(0)},
                    {"screenDimensions", m_frames.render.texture_dimensions()}
                },
                cube_outline
            );
            WireFrame axes = axes3d::get_axes_wireframe();
            WireFrame axes_labels = axes3d::get_xyz_axes_labels_wireframe();
            axes3d::draw_axes(
                this->m_frames.render,
                {.axes=m_programs.visualization.axes_3d,
                           .labels=m_programs.visualization.axes_labels_3d},
                axes, axes_labels,
                rotation, 110, 0.0F,
                params.usePerspectiveProjection, 
                m_frames.render.texture_dimensions());
            if (hover.has_value()) {
                IVec2 tex_dims = m_frames.render.texture_dimensions();
                Vec3 r = Vec3{
                    .x=hover->x,
                    .y=hover->y*(float(tex_dims[1])/float(tex_dims[0]))
                        + 0.5F*(1.0F - float(tex_dims[1])/float(tex_dims[0])),
                    .z=0.0};
                r = 2.0*scale_rotate(r, scale, rotation);
                if (r.x >= -1.0 && r.x < 1.0 && 
                    r.y >= -1.0 && r.y < 1.0 &&
                    r.z >= -1.0 && r.z < 1.0) {
                    this->m_cursor_location = r;
                    std::cout << r.x << ", " << r.y << ", " << r.z << std::endl;
                    WireFrame cursor_frame 
                        = cursor_outline3d::get_cursor_wire_frame();
                    this->m_frames.render.draw(
                        m_programs.visualization.cursor_outline,
                        {
                            {"rotation", rotation},
                            {"viewScale", scale},
                            {"cursorPosition", r},
                            {"color", Vec4{.ind{0.3, 0.3, 0.3, 0.1}}},
                            {"usePerspectiveProjection",
                                (params.usePerspectiveProjection)? int(1): int(0)}
                        },
                        cursor_frame
                    );
                }
            }
            take_screenshot(
                params, m_frames.render, 
                m_image_data, m_image_rgba_arr);
            return this->m_frames.render;
        }
        case VOL_RENDER_VIEW: case VOL_RENDER_VECTOR_FIELD_VIEW: {
            this->m_frames.render.clear();
            this->m_frames.render_tmp.clear();
            // this->m_frames.render_tmp2.clear();
            WireFrame cube_outline = get_cube_outline_wire_frame();
            m_volume_render.view(
                this->m_frames.render, this->m_frames.data_reduce,
                scale, rotation,
                params.alphaBrightness, 
                params.colorBrightness,
                params.usePerspectiveProjection
                // {{"noiseScale", params.noiseScale}}
            );
            if (params.blurSize >= 1 && params.applyBlur) { 
                this->m_frames.render_tmp.draw(
                    m_programs.visualization.blur,
                    {{"tex", {this->m_frames.render}}, 
                    {"textureDimensions2D",
                            m_frames.render.texture_dimensions()},
                    {"orientation", int(0)},
                    {"size", int(params.blurSize)}},
                    m_frames.quad_wire_frame
                );
                this->m_frames.render.draw(
                    m_programs.visualization.blur,
                    {{"tex", {this->m_frames.render_tmp}}, 
                    {"textureDimensions2D",
                        m_frames.render.texture_dimensions()},
                    {"orientation", int(1)},
                    {"size", int(params.blurSize)}},
                    m_frames.quad_wire_frame
                );
            }
            // this->m_frames.render.draw(
            //     m_programs.copy,
            //     {{"tex", {this->m_frames.render_tmp2}}},
            //     m_frames.quad_wire_frame
            // );
            if (params.visualizationSelect.selected
                    == VOL_RENDER_VECTOR_FIELD_VIEW) {
                IVec3 arrows_d3d = params.arrowDimensions;
                IVec2 arrows_d2d = get_2d_from_3d_dimensions(arrows_d3d);
                IVec3 tex_d3d = params.dataTexelDimensions3D;
                IVec2 tex_d2d = get_2d_from_3d_dimensions(tex_d3d);
                Vec3 dr = Vec3{.x=1.0F, 1.0F, 1.0F};
                this->m_frames.data_reduce_tmp.draw(
                    m_programs.visualization.gradient,
                    {
                        {"tex", &m_frames.data_reduce},
                        {"orderOfAccuracy", int(4)},
                        {"staggeredMode", int(0)},
                        {"index", int(0)},
                        {"texelDimensions3D", tex_d3d},
                        {"texelDimensions2D", tex_d2d},
                        {"dr", dr},
                        {"dimensions3D", params.simulationDimensions3D}

                    }
                );
                if (params.useCones) {
                    m_conical_arrows3d.view(
                        this->m_frames.render, this->m_frames.data_reduce_tmp,
                        2.0*scale, rotation, 
                        params.arrowDimensions,
                        params.dataTexelDimensions3D,
                        {
                            {"useOrthogonalProjection",
                                (params.usePerspectiveProjection)? int(0): int(1)},
                            {"rescaleZ", int(1)}
                        });
                } else {
                    m_arrows3d.view(
                        this->m_frames.render, this->m_frames.data_reduce_tmp,
                        2.0*scale, rotation, 
                        params.arrowDimensions,
                        params.dataTexelDimensions3D,
                        {
                            {"useOrthogonalProjection",
                                (params.usePerspectiveProjection)? int(0): int(1)},
                            {"rescaleZ", int(1)}
                        });
                }
            }
            this->m_frames.render.draw(
                m_programs.visualization.cube_outline,
                {
                    {"rotation", rotation},
                    {"viewScale", scale},
                    {"color", Vec4{.ind{1.0, 1.0, 1.0, 0.5}}},
                    {"usePerspectiveProjection", 
                            int(params.usePerspectiveProjection)},
                    {"screenDimensions", m_frames.render.texture_dimensions()}
                },
                cube_outline
            );
            if (hover.has_value()) {
                IVec2 tex_dims = m_frames.render.texture_dimensions();
                Vec3 r = Vec3{
                    .x=hover->x,
                    .y=hover->y*(float(tex_dims[1])/float(tex_dims[0]))
                        + 0.5F*(1.0F - float(tex_dims[1])/float(tex_dims[0])),
                    .z=0.0};
                r = 2.0*scale_rotate(r, scale, rotation);
                if (r.x >= -1.0 && r.x < 1.0 && 
                    r.y >= -1.0 && r.y < 1.0 &&
                    r.z >= -1.0 && r.z < 1.0) {
                    this->m_cursor_location = r;
                    // std::cout << r.x << ", " << r.y << ", " << r.z << std::endl;
                    WireFrame cursor_frame 
                        = cursor_outline3d::get_cursor_wire_frame();
                    this->m_frames.render.draw(
                        m_programs.visualization.cursor_outline,
                        {
                            {"rotation", rotation},
                            {"viewScale", scale},
                            {"cursorPosition", r},
                            {"color", Vec4{.ind{0.3, 0.3, 0.3, 0.1}}},
                            {"usePerspectiveProjection", 
                                    int(params.usePerspectiveProjection)},
                            {"screenDimensions", m_frames.render.texture_dimensions()}
                        },
                        cursor_frame
                    );
                }
            }
            WireFrame axes = axes3d::get_axes_wireframe();
            WireFrame axes_labels = axes3d::get_xyz_axes_labels_wireframe();
            axes3d::draw_axes(
                this->m_frames.render,
                {.axes=m_programs.visualization.axes_3d,
                          .labels=m_programs.visualization.axes_labels_3d},
                axes, axes_labels,
                rotation, 110, 0.0F,
                params.usePerspectiveProjection, 
                m_frames.render.texture_dimensions());
            take_screenshot(
                params, m_frames.render, 
                m_image_data, m_image_rgba_arr);
            return this->m_frames.render;
        }
    }
}

const RenderTarget &Simulation
::view_data_texture(SimParams &params, ::Quaternion rotation, float scale) {
    m_frames.render.draw(
        m_programs.copy,
        {{"tex", &m_frames.data_reduce}},
        m_frames.quad_wire_frame
    );
    return m_frames.render;
}

const RenderTarget &Simulation
::view_volume_texture(
    SimParams &params, ::Quaternion rotation, float scale
    ) {
    m_frames.render.draw(
        m_programs.copy,
        {{"tex", &m_frames.data_reduce}},
        m_frames.quad_wire_frame
    );
    return m_frames.render;
}

void Simulation::add_user_defined(
    const SimParams &sim_params,
    unsigned int program, const std::map<std::string, float> &input_uniforms) {
    this->m_programs.user_defined = program;
    Uniforms uniforms;
    for (const auto &e: input_uniforms)
        uniforms.insert({e.first, Vec2{.ind{e.second, 0.0}}});
    if (input_uniforms.count("t") > 0)
        uniforms.at("t").vec2.x = sim_params.t;
    else
        uniforms.insert({"t", Vec2{.ind{sim_params.t, 0.0}}});
    uniforms.insert(
        {"width",
            Vec2{.ind{sim_params.sideLength, 0.0}}});
    uniforms.insert(
        {"height",
            Vec2{.ind{sim_params.sideLength, 0.0}}});
    uniforms.insert(
        {"depth",
            Vec2{.ind{sim_params.sideLength, 0.0}}});
    uniforms.insert(
        {
            "texelDimensions2D",
            get_2d_from_3d_dimensions(sim_params.dataTexelDimensions3D)
        }
    );
    uniforms.insert(
        {
            "texelDimensions3D",
            sim_params.dataTexelDimensions3D
        }
    );
    enum outputModeSelect {
        MODE_4VECTOR_REAL_OR_COMPLEX=0,
        MODE_COMPLEX4=4
    };
    uniforms.insert(
        {"outputModeSelect",int(MODE_4VECTOR_REAL_OR_COMPLEX)}
    );
    uniforms.insert(
        {"useRealPartOfExpression", int(1)});
    m_frames.potential.draw(program, uniforms);
    /* m_frames.potential.draw(
        m_programs.visualization.domain_color,
        {
            {"tex", &m_frames.tmp},
            {"brightness", sim_params.brightness},
            {"brightnessMode", int(1)},

        }
    ); */
}

void Simulation::reset_data_reduce_dimensions(IVec3 texel_dimensions_3d) {
    m_volume_render.reset_data_dimensions(texel_dimensions_3d);
    m_frames.reset_data_reduce_dimensions(texel_dimensions_3d);
}

void Simulation::reset_volume_dimensions(IVec3 texel_dimensions_3d) {
    m_volume_render.reset_volume_dimensions(texel_dimensions_3d);
}

void Simulation::reset_volume_filtering(unsigned int filtering) {
    m_volume_render.reset_filtering(filtering);
}

Vec3 Simulation::get_cursor_location() {
    return m_cursor_location;
}

Vec3 Simulation::get_scaled_cursor_location(const SimParams &params) {
    return Vec3{
        .x=m_cursor_location.x*params.simulationDimensions3D.x/2.0F,
        .y=m_cursor_location.y*params.simulationDimensions3D.y/2.0F,
        .z=m_cursor_location.z*params.simulationDimensions3D.z/2.0F,
    };
}

std::vector<unsigned char> &Simulation::get_image_data() {
    return m_image_data;
}

