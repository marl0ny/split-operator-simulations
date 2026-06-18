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
    this->roll_0to3 = Quad::make_program_from_path(
        "./shaders/util/roll-0to3.frag"
    );
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
    this->visualization.scalar = Quad::make_program_from_path(
        "./shaders/scalar/visualization.frag"
    );
    this->visualization.current = Quad::make_program_from_path(
        "./shaders/current/visualization.frag"
    );
    this->visualization.vector_potential = Quad::make_program_from_path(
        "./shaders/potential/three-vector-vis.frag"
    );
    this->visualization.spin = Quad::make_program_from_path(
        "./shaders/spin/expectation.frag"
    );
    this->wavepacket.position = Quad::make_program_from_path(
        "./shaders/wavepacket/gaussian-position-space.frag");
    this->wavepacket.momentum = Quad::make_program_from_path(
        "./shaders/wavepacket/gaussian-momentum-space.frag"
    );
    this->sketch.potential = Quad::make_program_from_path(
        "./shaders/potential/sketch.frag"
    );
    this->sketch.erase_vector_potential = Quad::make_program_from_path(
        "./shaders/potential/sketch-erase.frag"
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
    this->em_field.e = Quad::make_program_from_path(
        "./shaders/em-fields/electric3d.frag"  
    );
    this->em_field.m = Quad::make_program_from_path(
        "./shaders/em-fields/magnetic3d.frag"
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
    temps{
        Quad(sim_tex_params), Quad(sim_tex_params),
        Quad(sim_tex_params), Quad(sim_tex_params)
    },
    spinors {
        {Quad(sim_tex_params), Quad(sim_tex_params)},
        {Quad(sim_tex_params), Quad(sim_tex_params)},
    },
    potential (Quad(sim_tex_params)),
    potential_prev(Quad(sim_tex_params)),
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
    for (int i = 0; i < 4; i++)
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
    // this->data_reduce_tmp.reset(this->data_reduce_tex_params);
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
            {"useAbsorbingBoundaries", int(sim_params.useAbsorbingBoundaries)},
            {"absCoeff", sim_params.absCoeff},
            {"texelDimensions3D", sim_params.simulationDimensions3D},
            {"texelDimensions2D", 
                    IVec2{.ind{(int)m_frames.sim_tex_params.width,
                            (int)m_frames.sim_tex_params.height}}},
        }
    );
}

void Simulation::split_step(const SimParams &sim_params) {
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
    std::swap(next, last);
    // if (next != 0) {
    //     printf("Simple copy is called.\n");
    //     m_frames.spinors[0][0].draw(
    //         m_programs.copy, {{"tex", {&m_frames.spinors[1][0]}}});
    //     m_frames.spinors[0][1].draw(
    //         m_programs.copy, {{"tex", {&m_frames.spinors[1][1]}}});
    // }
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
    spinors::BiSpinor s = spinors::get_spinor_plane_wave(
        {.c=sim_params.c, .m=sim_params.m, .hbar=sim_params.hbar},
         p, {c0, c1, c2, c3}, 0);
    Quad *tmp_quads[2] = {&m_frames.temps[2], &m_frames.temps[3]};
    for (int spinor_index = 0; spinor_index < 2; spinor_index++) {
        tmp_quads[spinor_index]->draw(
            m_programs.wavepacket.momentum, 
            {
                {"amplitude", {1.0F}},
                {"sigma", Vec3{
                        .x=d_3d[0]*sim_params.sigma,
                        .y=d_3d[1]*sim_params.sigma,
                        .z=d_3d[2]*sim_params.sigma}},
                {"p0", get_momentum(wave_num, d_3d)},
                {"x0", tex_to_sim_coordinates(tex_pos, d_3d)},
                {"spinor", s[spinor_index].store_as_vec4()},
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
    IVec3 id_3d = get_3d_texel_dimensions(sim_params.texelSideLength);
    IVec2 id_2d = get_2d_from_3d_dimensions(id_3d);
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
    // printf("%g, %g, %g\n", tex_pos.x, tex_pos.y, tex_pos.z);
    for (int i = 0; i < 2; i++) {
        m_frames.spinors[0][i].draw(
            m_programs.wavepacket.position,
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
    this->last = 0;
    this->next = 1;
}

bool Simulation::is_inside(
    const SimParams &params, Quaternion rotate, float scale,
    const Vec3 &r) const {
    // return true;
    return (r.x > -0.5 && r.y > -0.5 && r.z > -0.5 && 
            r.x < 0.5 && r.y < 0.5 && r.z < 0.5);
}

bool Simulation::is_inside(
    const SimParams &params, Quaternion rotate, float scale,
    const Vec2 &cursor_pos) const {
    IVec2 tex_dims = m_frames.render.texture_dimensions();
    Vec3 r = Vec3{
        .x=cursor_pos.x,
        .y=cursor_pos.y*(float(tex_dims[1])/float(tex_dims[0]))
        + 0.5F*(1.0F - float(tex_dims[1])/float(tex_dims[0])),
        .z=0.0};
    r = scale_rotate(r, scale, rotate);
    return (r.x > -0.5 && r.y > -0.5 && r.z > -0.5 && 
            r.x < 0.5 && r.y < 0.5 && r.z < 0.5);
}

void Simulation::init_from_cursor_positions(
    const SimParams &sim_params,
    Quaternion rotate, float scale,
    const Vec2 &cursor_pos1, const Vec2 &cursor_pos2, float sigma
    ) {
    IVec2 tex_dims = m_frames.render.texture_dimensions();
    Vec3 r0 = Vec3{
        .x=cursor_pos1.x,
        .y=cursor_pos1.y*(float(tex_dims[1])/float(tex_dims[0]))
            + 0.5F*(1.0F - float(tex_dims[1])/float(tex_dims[0])),
        .z=0.0};
    r0 = scale_rotate(r0, scale, rotate) + Vec3{.x=0.5, 0.5, 0.5};
    Vec3 r1 = Vec3{
        .x=cursor_pos2.x,
        .y=cursor_pos2.y*(float(tex_dims[1])/float(tex_dims[0]))
            + 0.5F*(1.0F - float(tex_dims[1])/float(tex_dims[0])),
        .z=0.0};
    r1 = scale_rotate(r1, scale, rotate) + Vec3{.x=0.5, 0.5, 0.5};
    Vec3 r = r1 - r0;
    IVec3 wavenum = {.ind{
        int(r.x*sim_params.texelSideLength),
        int(r.y*sim_params.texelSideLength),
        int(r.z*sim_params.texelSideLength)
    }};
    for (int i = 0; i < 3; i++) {
        wavenum[i] = (wavenum[i] > sim_params.texelSideLength/4)?
            sim_params.texelSideLength/4: wavenum[i];
        wavenum[i] = (wavenum[i] < -sim_params.texelSideLength/4)?
            -sim_params.texelSideLength/4: wavenum[i];
    }
    // printf("%g, %g, %g\n", r.x, r.y, r.z);
    this->init(sim_params, r0, wavenum, sigma);
}

void Simulation::init_from_cursor_positions(
    const SimParams &sim_params,
    Quaternion rotate, float scale,
    const Vec3 &r0, const Vec3 &r1, float sigma) {
    // IVec2 tex_dims = m_frames.render.texture_dimensions();
    Vec3 r = r1 - r0;
    IVec3 wavenum = {.ind{
        int(r.x*sim_params.texelSideLength),
        int(r.y*sim_params.texelSideLength),
        int(r.z*sim_params.texelSideLength)
    }};
    for (int i = 0; i < 3; i++) {
        wavenum[i] = (wavenum[i] > sim_params.texelSideLength/4)?
            sim_params.texelSideLength/4: wavenum[i];
        wavenum[i] = (wavenum[i] < -sim_params.texelSideLength/4)?
            -sim_params.texelSideLength/4: wavenum[i];
    }
    // printf("%g, %g, %g\n", r.x, r.y, r.z);
    this->init(sim_params, r0, wavenum, sigma);
}

void Simulation::sketch_modify_potential(
    const SimParams &params,
    Quaternion rotation, float scale, const Vec2 cursor_pos,
    float amplitude, float size) {
    IVec2 tex_dims = m_frames.render.texture_dimensions();
    Vec3 r0 = Vec3{
        .x=cursor_pos.x,
        .y=cursor_pos.y*(float(tex_dims[1])/float(tex_dims[0]))
            + 0.5F*(1.0F - float(tex_dims[1])/float(tex_dims[0])),
        .z=0.0};
    r0 = scale_rotate(r0, scale, rotation) + Vec3{.x=0.5, 0.5, 0.5};
    // printf("%g, %g, %g\n", r0.x, r0.y, r0.z);
    Vec3 d_3d = Vec3{
        .x=params.sideLength, .y=params.sideLength, .z=params.sideLength};
    this->m_frames.temps[0].draw(
        m_programs.sketch.potential,
        {
            {"tex", &m_frames.potential},
            {"texelDimensions3D", params.simulationDimensions3D},
            {"texelDimensions2D", 
                    get_2d_from_3d_dimensions(params.simulationDimensions3D)},
            {"dimensions3D", d_3d},
            {"offsetTexCoord", r0},
            {"sigmaTexCoord", Vec3{.x=size, size, size}},
            {"amplitude", Vec4{.ind{amplitude, 0.0, 0.0, 0.0}}},
            {"maxScalarValue", params.maxPotentialSketchHeight},
            {"maxVectorMag", params.maxVectorSketchMag}
        }
    );
    this->m_frames.potential.draw(
        m_programs.copy,
        {
            {"tex", &m_frames.temps[0]}
        }
    );
}

void Simulation::sketch_modify_potential(
    const SimParams &params,
    Quaternion rotation, float scale, const Vec3 &r0,
    float amplitude, float size) {
    // IVec2 tex_dims = m_frames.render.texture_dimensions();
    // printf("%g, %g, %g\n", r0.x, r0.y, r0.z);
    Vec3 d_3d = Vec3{
        .x=params.sideLength, .y=params.sideLength, .z=params.sideLength};
    this->m_frames.temps[0].draw(
        m_programs.sketch.potential,
        {
            {"tex", &m_frames.potential},
            {"texelDimensions3D", params.simulationDimensions3D},
            {"texelDimensions2D", 
                    get_2d_from_3d_dimensions(params.simulationDimensions3D)},
            {"dimensions3D", d_3d},
            {"offsetTexCoord", r0},
            {"sigmaTexCoord", Vec3{.x=size, size, size}},
            {"amplitude", Vec4{.ind{amplitude, 0.0, 0.0, 0.0}}},
            {"maxScalarValue", params.maxPotentialSketchHeight},
            {"maxVectorMag", params.maxVectorSketchMag}
        }
    );
    this->m_frames.potential.draw(
        m_programs.copy,
        {
            {"tex", &m_frames.temps[0]}
        }
    );
}

void Simulation::erase_modify_potential(
    const SimParams &params,
    Quaternion rotation, float scale, 
    const Vec2 cursor_pos,
    float amplitude, float size
    ) {
    IVec2 tex_dims = m_frames.render.texture_dimensions();
    Vec3 r0 = Vec3{
        .x=cursor_pos.x,
        .y=cursor_pos.y*(float(tex_dims[1])/float(tex_dims[0]))
            + 0.5F*(1.0F - float(tex_dims[1])/float(tex_dims[0])),
        .z=0.0};
    r0 = scale_rotate(r0, scale, rotation) + Vec3{.x=0.5, 0.5, 0.5};
    this->erase_modify_potential(
        params, rotation, scale, r0, amplitude, size);
   
}

void Simulation::erase_modify_potential(
    const SimParams &params,
    Quaternion rotation, float scale, 
    const Vec3 &r0,
    float amplitude, float size
    ) {
    // IVec2 tex_dims = m_frames.render.texture_dimensions();
    this->m_frames.temps[0].draw(
        m_programs.sketch.erase_vector_potential,
        {
            {"tex", &m_frames.potential},
            {"texelDimensions3D", params.simulationDimensions3D},
            {"texelDimensions2D", 
                    get_2d_from_3d_dimensions(params.simulationDimensions3D)},
            // {"dimensions3D", d_3d},
            {"offsetTexCoord", r0},
            {"sigmaTexCoord", Vec3{.x=size, size, size}},
            {"amplitude", amplitude},
            // {"maxScalarValue", 10.0F},
            // {"maxVectorMag", 1000.0F}
        }
    );
    this->m_frames.potential.draw(
        m_programs.copy,
        {
            {"tex", &m_frames.temps[0]}
        }
    );
}

void Simulation::sketch_modify_potential(
    const SimParams &params,
    Quaternion rotation, float scale,
    const Vec2 cursor_pos1, const Vec2 cursor_pos2,
    float amplitude, float size) {
    IVec2 tex_dims = m_frames.render.texture_dimensions();
    Vec3 r0 = Vec3{
        .x=cursor_pos1.x,
        .y=cursor_pos1.y*(float(tex_dims[1])/float(tex_dims[0]))
            + 0.5F*(1.0F - float(tex_dims[1])/float(tex_dims[0])),
        .z=0.0};
    r0 = scale_rotate(r0, scale, rotation) + Vec3{.x=0.5, 0.5, 0.5};
    Vec3 r1 = Vec3{
        .x=cursor_pos2.x,
        .y=cursor_pos2.y*(float(tex_dims[1])/float(tex_dims[0]))
            + 0.5F*(1.0F - float(tex_dims[1])/float(tex_dims[0])),
        .z=0.0};
    r1 = scale_rotate(r1, scale, rotation) + Vec3{.x=0.5, 0.5, 0.5};
    Vec3 d_3d = Vec3{
        .x=params.sideLength, .y=params.sideLength, .z=params.sideLength};
    Vec3 r = (r1 - r0);
    if (r.length() > 1.0)
        r = r.normalized();
    r = amplitude*r;
    this->m_frames.temps[0].draw(
        m_programs.sketch.potential,
        {
            {"tex", &m_frames.potential},
            {"texelDimensions3D", params.simulationDimensions3D},
            {"texelDimensions2D", 
                    get_2d_from_3d_dimensions(params.simulationDimensions3D)},
            {"dimensions3D", d_3d},
            {"offsetTexCoord", r0},
            {"sigmaTexCoord", Vec3{.x=size, size, size}},
            {"amplitude", Vec4{.ind{0.0, r.x, r.y, r.z}}},
            {"maxScalarValue", params.maxPotentialSketchHeight},
            {"maxVectorMag", params.maxVectorSketchMag}
        }
    );
    this->m_frames.potential.draw(
        m_programs.copy,
        {
            {"tex", &m_frames.temps[0]}
        }
    );
}

void Simulation::sketch_modify_potential(
    const SimParams &params,
    Quaternion rotation, float scale,
    const Vec3 &r0, const Vec3 &r1,
    float amplitude, float size) {
    IVec2 tex_dims = m_frames.render.texture_dimensions();
    Vec3 d_3d = Vec3{
        .x=params.sideLength, .y=params.sideLength, .z=params.sideLength};
    Vec3 r = (r1 - r0);
    if (r.length() > 1.0)
        r = r.normalized();
    r = amplitude*r;
    this->m_frames.temps[0].draw(
        m_programs.sketch.potential,
        {
            {"tex", &m_frames.potential},
            {"texelDimensions3D", params.simulationDimensions3D},
            {"texelDimensions2D", 
                    get_2d_from_3d_dimensions(params.simulationDimensions3D)},
            {"dimensions3D", d_3d},
            {"offsetTexCoord", r0},
            {"sigmaTexCoord", Vec3{.x=size, size, size}},
            {"amplitude", Vec4{.ind{0.0, r.x, r.y, r.z}}},
            {"maxScalarValue", params.maxPotentialSketchHeight},
            {"maxVectorMag", params.maxVectorSketchMag}
        }
    );
    this->m_frames.potential.draw(
        m_programs.copy,
        {
            {"tex", &m_frames.temps[0]}
        }
    );
}

void Simulation::time_step(const SimParams &sim_params) {
    split_step(sim_params);
}

static Vec4 encode_2x2(float m00, float m11, std::complex<float> m01) {
    return {
        .ind{m00, m11, 
        std::real(m01), std::imag(m01)}};
}

void Simulation::arrows_view(
    const SimParams &params,
    const std::optional<Vec2> &hover,
    ::Quaternion rotation, float scale,
    const Vec3 &colour) {
    if (params.useCones) {
        m_conical_arrows3d.view(
            this->m_frames.render, this->m_frames.data_reduce,
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
            this->m_frames.render, this->m_frames.data_reduce,
            2.0*scale, rotation, 
            params.arrowDimensions,
            params.dataTexelDimensions3D,
            {
                {"useOrthogonalProjection", 
                        (params.usePerspectiveProjection)? int(0): int(1)},
                {"rescaleZ", int(0)}
            });
    }
}

void Simulation::handle_all_arrow_views(const SimParams &params,
        const std::optional<Vec2> &hover,
        ::Quaternion rotation, float scale) {
    int time_slice = this->last;
    // Assumes that handle_all_volume_render gets called first,
    // which if params.showMomentumSpace is set to true,
    // then the momentum space wave function is already computed.
    if (params.showMomentumSpace)
        time_slice = this->next;
    if (params.showPsi01Spin) {
        m_frames.data_reduce.draw(
            m_programs.visualization.spin,
            {
                {"psiTex", &m_frames.spinors[time_slice][0]}
            }
        );
        arrows_view(params, hover, rotation, scale, Vec3{.r=1.0});
    }
    if (params.showPsi23Spin) {
        m_frames.data_reduce.draw(
            m_programs.visualization.spin,
            {
                {"psiTex", &m_frames.spinors[time_slice][1]}
            }
        );
        arrows_view(params, hover, rotation, scale, Vec3{.r=1.0});
    }
    if (params.showSpatialCurrent) {
        m_frames.data_reduce.draw(
            m_programs.visualization.current,
            {
                {"uTex", &m_frames.spinors[time_slice][0]},
                {"vTex", &m_frames.spinors[time_slice][1]},
                {"currentType", int(2)},
                {"brightness", 10.0F*(float)params.brightness},
                {"sigmaX", Vec4{.ind{0.0, 0.0, 1.0, 0.0}}},
                {"sigmaY", Vec4{.ind{0.0, 0.0, 0.0, -1.0}}},
                {"sigmaZ", Vec4{.ind{1.0, -1.0, 0.0, 0.0}}},
                {"imposeAdditionalGrayScaleTex", int(0)}
            }
        );
        arrows_view(params, hover, rotation, scale, Vec3{.r=1.0});
    }
    if (params.showPseudospatialCurrent) {
        m_frames.data_reduce.draw(
            m_programs.visualization.current,
            {
                {"uTex", &m_frames.spinors[time_slice][0]},
                {"vTex", &m_frames.spinors[time_slice][1]},
                {"currentType", int(3)},
                {"brightness", (float)params.brightness},
                {"sigmaX", Vec4{.ind{0.0, 0.0, 1.0, 0.0}}},
                {"sigmaY", Vec4{.ind{0.0, 0.0, 0.0, -1.0}}},
                {"sigmaZ", Vec4{.ind{1.0, -1.0, 0.0, 0.0}}},
                {"imposeAdditionalGrayScaleTex", int(0)}
            }
        );
        arrows_view(params, hover, rotation, scale, Vec3{.r=1.0});
    }
    if (params.showVectorPotential && !params.showMomentumSpace) {
        m_frames.data_reduce.draw(
            m_programs.visualization.vector_potential,
            {
                {"tex", &m_frames.potential},
                {"scale", params.brightness}
            }
        );
        arrows_view(params, hover, rotation, scale, Vec3{.r=1.0});
    }
    if (params.showMagnetic && !params.showMomentumSpace) {
        m_frames.temps[0].draw(
            m_programs.roll_0to3,
            {
                {"tex", &m_frames.potential}
            }
        );
        m_frames.data_reduce.draw(
            m_programs.em_field.m,
            {
                {"vecPotentialTex", &m_frames.temps[0]},
                {"texelDimensions3D", params.simulationDimensions3D},
                {"texelDimensions2D", 
                    get_2d_from_3d_dimensions(params.simulationDimensions3D)},
                {"dimensions3D", 
                        Vec3{.ind{
                            params.sideLength,
                            params.sideLength,
                            params.sideLength
                        }}}
            }
        );
        arrows_view(params, hover, rotation, scale, Vec3{.r=1.0});
    }
    if (params.showElectric && !params.showMomentumSpace) {
        m_frames.temps[0].draw(
            m_programs.roll_0to3,
            {
                {"tex", (this->is_time_dependent_potential)? 
                    &m_frames.potential_prev: &m_frames.potential}
            }
        );
        m_frames.temps[1].draw(
            m_programs.roll_0to3,
            {
                {"tex", &m_frames.potential}
            }
        );
        m_frames.data_reduce.draw(
            m_programs.em_field.e,
            {
                {"prevATex", &m_frames.temps[0]},
                {"currATex", &m_frames.temps[1]},
                {"texelDimensions3D", params.simulationDimensions3D},
                {"texelDimensions2D", 
                    get_2d_from_3d_dimensions(params.simulationDimensions3D)},
                {"dimensions3D", 
                        Vec3{.ind{
                            params.sideLength,
                            params.sideLength,
                            params.sideLength
                        }}},
                {"dt", {params.dt}}
            }
        );
        arrows_view(params, hover, rotation, scale, Vec3{.r=1.0});
    }
}

void Simulation::handle_all_volume_render_views(
    const SimParams &params,
    const std::optional<Vec2> &hover,
    ::Quaternion rotation, float scale
) {
    int time_slice = this->last;
    if (params.showMomentumSpace) {
        for (int index = 0; index < 2; index++) {
            fft(
                &this->m_frames.temps[2],
                &m_frames.spinors[this->last][index], params);
            m_frames.spinors[this->next][index].draw(
                m_programs.fft.shift,
                {
                    {"tex", &this->m_frames.temps[2]},
                    {"texelDimensions3D", params.simulationDimensions3D},
                    {"texelDimensions2D",
                        get_2d_from_3d_dimensions(
                            params.simulationDimensions3D)},
                    {"applyScaling", int(1)},
                    {"scale", float(
                            1.0/sqrt(
                                params.simulationDimensions3D[0]
                                *params.simulationDimensions3D[1]
                                *params.simulationDimensions3D[2])
                        )}
                }
            );
        }
        time_slice = this->next;
    }
    int index = 0;
    bool useBA = false;
    if (params.showPsi0WPhase) {
        index = 0;
        useBA = false;
    } else if (params.showPsi1WPhase) {
        index = 0;
        useBA = true;
    } else if (params.showPsi2WPhase) {
        index = 1;
        useBA = false;
    } else if (params.showPsi3WPhase) {
        index = 1;
        useBA = true;
    }
    if (!params.showPsi0WPhase && !params.showPsi1WPhase 
        && !params.showPsi2WPhase  && !params.showPsi3WPhase
        && !params.showScalar && !params.showPseudoscalar 
        && !params.showCurrent0 && !params.showPsuedocurrent0) {
        if (!params.showScalarPotential) {
            m_frames.data_reduce.clear();
        } else {
            m_frames.data_reduce.draw(
            m_programs.visualization.domain_color,
            {
                {"brightness", 0.0F},
                {"imposeAdditionalGrayScaleTex", int(params.showScalarPotential)},
                {"tex2", &m_frames.potential},
                {"gsOffset", 0.0F},
                {"gsBrightness", (float)params.brightness},
                {"gsMaxBrightness", (params.showMomentumSpace)? 0.0F: 0.5F},
                }
            );
        }
    }
    if (params.showPsi0WPhase || params.showPsi1WPhase
        || params.showPsi2WPhase || params.showPsi3WPhase) {
        float phase_adj 
            = ((params.showPsi0WPhase || params.showPsi1WPhase)? 1.0: -1.0)
                * (float)params.c*params.c*params.m*params.t;
        if (params.showMomentumSpace)
            phase_adj = 0.0;
        m_frames.data_reduce.draw(
            m_programs.visualization.domain_color,
            {
                {"tex", &m_frames.spinors[time_slice][index]},
                {"phaseAdjust", phase_adj},
                {"brightness", (float)params.brightness},
                {"brightnessMode", int(1)},
                {"useBA", int(useBA)},
                {"imposeAdditionalGrayScaleTex", int(params.showScalarPotential)},
                {"tex2", &m_frames.potential},
                {"gsOffset", 0.0F},
                {"gsBrightness", (float)params.brightness},
                {"gsMaxBrightness", (params.showMomentumSpace)? 0.0F: 0.5F},

            }
        );
    }
    if (params.showScalar || params.showPseudoscalar)
        m_frames.data_reduce.draw(
            m_programs.visualization.scalar,
            {
                {"uTex", &m_frames.spinors[time_slice][0]},
                {"vTex", &m_frames.spinors[time_slice][1]},
                {"scalarType", int((params.showScalar)? 0: 1)},
                {"brightness", (float)params.brightness},
                {"imposeAdditionalGrayScaleTex", int(params.showScalarPotential)},
                {"tex2", &m_frames.potential},
                {"gsOffset", 0.0F},
                {"gsBrightness", (float)params.brightness},
                {"gsMaxBrightness", (params.showMomentumSpace)? 0.0F: 0.5F},
            }
        );
    if (params.showCurrent0 || params.showPsuedocurrent0)
        m_frames.data_reduce.draw(
            m_programs.visualization.current,
            {
                {"uTex", &m_frames.spinors[time_slice][0]},
                {"vTex", &m_frames.spinors[time_slice][1]},
                {"currentType", int((params.showCurrent0)? 0: 1)},
                {"brightness", (float)params.brightness},
                {"sigmaX", Vec4{.ind{0.0, 0.0, 1.0, 0.0}}},
                {"sigmaY", Vec4{.ind{0.0, 0.0, 0.0, -1.0}}},
                {"sigmaZ", Vec4{.ind{1.0, -1.0, 0.0, 0.0}}},
                {"imposeAdditionalGrayScaleTex", int(params.showScalarPotential)},
                {"tex2", &m_frames.potential},
                {"gsOffset", 0.0F},
                {"gsBrightness", (float)params.brightness},
                {"gsMaxBrightness", (params.showMomentumSpace)? 0.0F: 0.5F}
            }
        );

}


const RenderTarget &Simulation
::view(
    const SimParams &params,
    const std::optional<Vec2> &hover,
    ::Quaternion rotation, float scale) {
    this->handle_all_volume_render_views(params, hover, rotation, scale);
    switch(params.visualizationSelect.selected) {
        case PLANAR_SLICES_VIEW: {
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
            this->handle_all_arrow_views(params, hover, rotation, scale);
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
            return m_frames.render;
        }
        case VOL_RENDER_VIEW: {
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
            this->handle_all_arrow_views(params, hover, rotation, scale);
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
    unsigned int program, const std::map<std::string, float> &input_uniforms,
    bool is_time_dependent) {
    this->is_time_dependent_potential = false;
    if (is_time_dependent) {
        m_frames.potential_prev.draw(
            m_programs.copy,
            {{"tex", &m_frames.potential}}
        );
        is_time_dependent_potential = true;
    }
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
    if (params.showMomentumSpace) {
        return Vec3{
            .x=m_cursor_location.x*params.texelSideLength/2.0F,
            .y=m_cursor_location.y*params.texelSideLength/2.0F,
            .z=m_cursor_location.z*params.texelSideLength/2.0F
        };    
    }
    return Vec3{
        .x=m_cursor_location.x*params.sideLength/2.0F,
        .y=m_cursor_location.y*params.sideLength/2.0F,
        .z=m_cursor_location.z*params.sideLength/2.0F
    };
}

std::vector<unsigned char> &Simulation::get_image_data() {
    return m_image_data;
}

float Simulation::get_max_free_particle_energy(const SimParams &sim_params) const {
    float c = sim_params.c;
    float m = sim_params.m;
    float length = sim_params.sideLength;
    int texel_length = sim_params.texelSideLength;
    float p_1d = 2.0*PI*float(texel_length/2.0)/length;
    float p_max2 = 3*p_1d*p_1d;
    return sqrt(m*m*c*c*c*c  + c*c*p_max2);
}

bool Simulation::modify_from_mouse_touch_input_volumetric(
    const SimParams &params, Quaternion rotation, float scale,
    const std::vector<Vec2> &cursor_positions) {
    Vec2 cursor_pos0 = cursor_positions[0];
    Vec2 cursor_pos1 = cursor_positions[cursor_positions.size() - 1];
    if (params.showMomentumSpace)
        return false;
    if (params.mouseSelector.selected == 1 && 
        this->is_inside(params, rotation, 
        scale, cursor_pos0)) {
        // Vec3 cursor_location = sim.get_cursor_location();
        this->init_from_cursor_positions(
            params, rotation,
            scale, 
            cursor_pos0, 
            cursor_pos1,
            params.sigma);
        return true;
    } else if ((params.mouseSelector.selected == 2 
        || params.mouseSelector.selected == 3
        || params.mouseSelector.selected == 4
        || params.mouseSelector.selected == 5)
        && this->is_inside(params, rotation, scale, cursor_pos0)
    ) {
        float amplitude = params.potentialSketchHeight;
        if (params.mouseSelector.selected == 2) {
            this->sketch_modify_potential(
                params, rotation, scale,
                cursor_pos1,
                amplitude, 0.01);
        }
        if (params.mouseSelector.selected == 3) {
            float amplitude = -params.potentialSketchHeight;
            this->sketch_modify_potential(
                params, rotation, scale,
                cursor_pos1,
                amplitude, 0.01);
        }
        if (params.mouseSelector.selected == 4) {
            amplitude = params.vectorPotentialSketchMag;
            if (cursor_positions.size() > 1)
                this->sketch_modify_potential(
                    params, rotation, 
                    scale,
                    cursor_positions[cursor_positions.size() - 2],
                    cursor_positions[cursor_positions.size() - 1],
                    amplitude, 0.01);
        }
        if (params.mouseSelector.selected == 5) {
            amplitude = params.vectorPotentialSketchMag;
            this->erase_modify_potential(
                params, rotation, 
                scale,
                cursor_pos1,
                amplitude, 0.01);
        }
        return true;
    }
    return false;
}

bool Simulation::modify_from_mouse_touch_input_planar_slices(
    const SimParams &params, Quaternion rotation, float scale,
    const std::vector<Vec2> &cursor_positions
    ) {
    IVec2 tex_dims = m_frames.render.texture_dimensions();
    Vec2 cursor_pos0_2d =  Vec2{
        .x=cursor_positions[0].x,
        .y=cursor_positions[0].y*(float(tex_dims[1])/float(tex_dims[0]))
            + 0.5F*(1.0F - float(tex_dims[1])/float(tex_dims[0])),
    };
    Vec2 cursor_pos1_2d =  Vec2{
        .x=cursor_positions[cursor_positions.size() - 1].x,
        .y=cursor_positions[cursor_positions.size() - 1].y
            *(float(tex_dims[1])/float(tex_dims[0]))
            + 0.5F*(1.0F - float(tex_dims[1])/float(tex_dims[0])),
    };
    Vec3 cursor_pos0 = m_planar_slices.most_perpendicular_intersection(
        params.dataTexelDimensions3D,
        rotation, scale,
        int(params.dataTexelDimensions3D.z
            * params.planarNormCoordOffsets[0]),
        int(params.dataTexelDimensions3D.x
            * params.planarNormCoordOffsets[1]),
        int(params.dataTexelDimensions3D.y
            * params.planarNormCoordOffsets[2]),
        cursor_pos0_2d);
    cursor_pos0 = cursor_pos0/2.0 + Vec3{.x=0.5, 0.5, 0.5};
    Vec3 cursor_pos1 = m_planar_slices.most_perpendicular_intersection(
        params.dataTexelDimensions3D,
        rotation, scale,
        int(params.dataTexelDimensions3D.z
            * params.planarNormCoordOffsets[0]),
        int(params.dataTexelDimensions3D.x
            * params.planarNormCoordOffsets[1]),
        int(params.dataTexelDimensions3D.y
            * params.planarNormCoordOffsets[2]),
        cursor_pos1_2d);
    cursor_pos1 = cursor_pos1/2.0 + Vec3{.x=0.5, 0.5, 0.5};
    Vec3 cursor_pos_last;
    if (cursor_positions.size() > 1) {
        Vec2 cursor_pos_last_2d =  Vec2{
            .x=cursor_positions[cursor_positions.size() - 2].x,
            .y=cursor_positions[cursor_positions.size() - 2].y
                *(float(tex_dims[1])/float(tex_dims[0]))
                + 0.5F*(1.0F - float(tex_dims[1])/float(tex_dims[0])),
        };
        cursor_pos_last = m_planar_slices.most_perpendicular_intersection(
            params.dataTexelDimensions3D,
            rotation, scale,
            int(params.dataTexelDimensions3D.z
                * params.planarNormCoordOffsets[0]),
            int(params.dataTexelDimensions3D.x
                * params.planarNormCoordOffsets[1]),
            int(params.dataTexelDimensions3D.y
                * params.planarNormCoordOffsets[2]),
            cursor_pos_last_2d);
        cursor_pos_last = cursor_pos_last/2.0 + Vec3{.x=0.5, 0.5, 0.5};
    }
    if (params.showMomentumSpace)
        return false;
    if (params.mouseSelector.selected == 1 && 
        this->is_inside(
            params, rotation, scale, 
            cursor_pos0 - Vec3{.x=0.5, 0.5, 0.5})) {
        // printf("%g, %g, %g\n", cursor_pos0.x, cursor_pos0.y, cursor_pos0.z);
        // Vec3 cursor_location = sim.get_cursor_location();
        this->init_from_cursor_positions(
            params, rotation,
            scale, 
            cursor_pos0, 
            cursor_pos1,
            params.sigma);
        return true;
    } else if ((params.mouseSelector.selected == 2 
        || params.mouseSelector.selected == 3
        || params.mouseSelector.selected == 4
        || params.mouseSelector.selected == 5)
        && this->is_inside(params, rotation, scale, 
            cursor_pos0 - Vec3{.x=0.5, 0.5, 0.5})
    ) {
        float amplitude = params.potentialSketchHeight;
        if (params.mouseSelector.selected == 2) {
            this->sketch_modify_potential(
                params, rotation, scale,
                cursor_pos1,
                amplitude, 0.01);
        }
        if (params.mouseSelector.selected == 3) {
            float amplitude = -params.potentialSketchHeight;
            this->sketch_modify_potential(
                params, rotation, scale,
                cursor_pos1,
                amplitude, 0.01);
        }
        if (params.mouseSelector.selected == 4) {
            amplitude = params.vectorPotentialSketchMag;
            if (cursor_positions.size() > 1)
                this->sketch_modify_potential(
                    params, rotation, 
                    scale,
                    cursor_pos_last,
                    cursor_pos1,
                    amplitude, 0.01);
        }
        if (params.mouseSelector.selected == 5) {
            amplitude = params.vectorPotentialSketchMag;
            this->erase_modify_potential(
                params, rotation, 
                scale,
                cursor_pos1,
                amplitude, 0.01);
        }
        return true;
    }
    return false;
}

bool Simulation::modify_from_mouse_touch_input(
    const SimParams &params, Quaternion rotation, float scale,
    const std::vector<Vec2> &cursor_positions) {
    if (params.visualizationSelect.selected == VOL_RENDER_VIEW) {
        return this->modify_from_mouse_touch_input_volumetric(
            params, rotation, scale, cursor_positions);
    }
    if (params.visualizationSelect.selected == PLANAR_SLICES_VIEW) {
        return this->modify_from_mouse_touch_input_planar_slices(
            params, rotation, scale, cursor_positions);
    }
    return false;
}
