#include "simulation.hpp"
#include <cstdint>
#include "spinors.hpp"
#include "vector_field.hpp"
#include "planar_slice.hpp"
#include <complex>
#include <numeric>

using namespace::sim_3d;

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

static std::vector<float> get_quad_vertices() {
    return {
        -1.0, -1.0, 0.0, 
        -1.0, 1.0, 0.0,
        1.0, 1.0, 0.0, 
        1.0, -1.0, 0.0};
}

static std::vector<int> get_quad_elements() {
    return {0, 1, 2, 0, 2, 3};  
}

static WireFrame get_quad_wire_frame() {
    return WireFrame(
        {{"position", Attribute{
            3, GL_FLOAT, false,
            0, 0}}},
        get_quad_vertices(),
        get_quad_elements(),
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
            .width=(uint32_t)get_2d_from_3d_dimensions(
                IVec3{.ind={
                    sim_params.texelSideLength, 
                    sim_params.texelSideLength, 
                    sim_params.texelSideLength}})[0],
            .height=(uint32_t)get_2d_from_3d_dimensions(
                IVec3{.ind={
                    sim_params.texelSideLength, 
                    sim_params.texelSideLength, 
                    sim_params.texelSideLength}})[1],
            .wrap_s=GL_REPEAT, .wrap_t=GL_REPEAT,
            .min_filter=GL_LINEAR, .mag_filter=GL_LINEAR,
        }
    ),
    main_render(RenderTarget(view_tex_params)),
    temps {
        Quad(sim_tex_params),
        Quad(sim_tex_params),
        Quad(sim_tex_params),
        Quad(sim_tex_params),
        Quad(sim_tex_params),
        Quad(sim_tex_params),
        Quad(sim_tex_params),
        Quad(sim_tex_params),
        Quad(sim_tex_params),
        Quad(sim_tex_params)
    },
    spinors {
        {Quad(sim_tex_params), Quad(sim_tex_params)},
        {Quad(sim_tex_params), Quad(sim_tex_params)},
    },
    potential (Quad(sim_tex_params)),
    tmp {Quad(sim_tex_params), Quad(sim_tex_params)} {}

GLSLPrograms::GLSLPrograms() {
    copy = Quad::make_program_from_path("./shaders/util/copy.frag");
    add2 = Quad::make_program_from_path("./shaders/util/add2.frag");
    init = Quad::make_program_from_path("./shaders/wavepacket/init.frag");
    momentum_step = Quad::make_program_from_path("./shaders/split-step/kinetic.frag");
    spatial_step = Quad::make_program_from_path("./shaders/split-step/spatial.frag");
    current = Quad::make_program_from_path("./shaders/current/current.frag");
    pseudo_current = Quad::make_program_from_path("./shaders/current/pseudocurrent.frag");
    scalar = Quad::make_program_from_path("./shaders/scalar/scalar.frag");
    // pseudoscalar = Quad::make_program_from_path("./shaders/scalar/pseudoscalar.frag")
    // fft_iter = Quad::make_program_from_path("./shaders/fft/fft-iter.frag");
    fft_iter_cube = Quad::make_program_from_path("./shaders/fft/fft-iter-cube.frag");
    rev_bit_sort2 = Quad::make_program_from_path("./shaders/fft/rev-bit-sort2.frag");
    fft_shift = Quad::make_program_from_path("./shaders/fft/fftshift.frag");
    uniform_color = Quad::make_program_from_path("./shaders/util/uniform-color.frag");
    domain_coloring = Quad::make_program_from_path("./shaders/util/domain-coloring.frag");
    all_alpha = Quad::make_program_from_path("./shaders/util/all-alpha.frag");
}

Simulation::Simulation(
    const SimParams &sim_params, int view_width, int view_height):
    m_programs(), 
    m_frames(sim_params, view_width, view_height),
    m_quad_wire_frame(get_quad_wire_frame()),
    m_planar_slices(m_frames.view_tex_params) {
    this->init(sim_params, Vec3{0.5, 0.5, 0.5}, {.ind{8, 0, 0}}, 0.05);
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

void Simulation::fft(Quad *dst, Quad *src, SimParams sim_params) {
    IVec3 id_3d = get_3d_texel_dimensions(sim_params.texelSideLength);
    rev_bit_sort2(m_programs.rev_bit_sort2, dst, src, id_3d);
    Quad *iter_quads[2] = {dst, &m_frames.tmp[0]};
    Quad *res = fft_iter_cube(
        m_programs.fft_iter_cube, iter_quads, false, id_3d);
    *dst = *res;
}

void Simulation::ifft(Quad *dst, Quad *src, SimParams sim_params) {
    IVec3 id_3d = get_3d_texel_dimensions(sim_params.texelSideLength);
    rev_bit_sort2(m_programs.rev_bit_sort2, dst, src, id_3d);
    Quad *iter_quads[2] = {dst, &m_frames.tmp[1]};
    Quad *res = fft_iter_cube(
        m_programs.fft_iter_cube, iter_quads, true, id_3d);
    *dst = *res;
}

void Simulation::split_step_momentum(
    Quad &dst, int index,
    const Quad &u, const Quad &v, SimParams sim_params) {
    IVec3 id_3d = get_3d_texel_dimensions(sim_params.texelSideLength);
    Vec3 d_3d = get_3d_dimensions(sim_params.sideLength);
    IVec2 id_2d = get_2d_from_3d_dimensions(id_3d);
    dst.draw(
        m_programs.momentum_step,
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
        m_programs.spatial_step,
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

// #include <iostream>
void Simulation::init(const SimParams &sim_params,
    const Vec3 &tex_pos, const IVec3 &wave_num, float sigma) {
    IVec2 id_2d = IVec2{.x=int(m_frames.sim_tex_params.width), 
                       .y=int(m_frames.sim_tex_params.height)};
    IVec3 id_3d = get_3d_texel_dimensions(sim_params.texelSideLength);
    Vec3 d_3d = get_3d_dimensions(sim_params.sideLength);
    using namespace::spinors;
    Vec3 p = get_momentum(wave_num, d_3d);
    BiSpinor s = get_spinor_plane_wave(
        sim_params, p, {0.0, 0.0, 1.0, 0.0}, 0);
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
                    {"texOffset", {tex_pos}},
                    {"sigma", {Vec3{.ind={sigma, sigma, sigma}}}},
                    {"texelDimensions2D", {id_2d}},
                    {"texelDimensions3D", {id_3d}},
                    {"spinor", {s[i].store_as_vec4()}},
                    {"useEnergyStatesCombinations", {true}},
                    {"dimensions3D", {d_3d}},
                    {"spinorIndex", {int(i)}},
                    {"representation", {int(0)}},
                    {"c0", {Vec2{.ind{0.0, 0.0}}}},
                    {"c1", {Vec2{.ind{1.0, 0.0}}}},
                    {"c2", {Vec2{.ind{0.0, 0.0}}}},
                    {"c3", {Vec2{.ind{0.0, 0.0}}}},
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
void Simulation::set_potential_from_program(
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
}

void Simulation::time_step(const SimParams &sim_params) {
    split_step(sim_params);
}

static Vec4 encode_2x2(float m00, float m11, std::complex<float> m01) {
    return {
        .ind{m00, m11, 
        std::real(m01), std::imag(m01)}};
}

const RenderTarget& Simulation::render_view(
    SimParams sim_params, Quaternion rotation, float scale, 
    Vec2 screen_cursor_pos) {
    // m_frames.main_render.draw(
    //     m_programs.domain_coloring,
    //     {{"tex", {&m_frames.spinors[0][0]}}, {"brightness", {1.0F}}},
    //     m_quad_wire_frame
    // );
    {
        float hbar = sim_params.hbar;
        std::complex<float> i (0.0, 1.0);
        m_frames.tmp[0].draw(
            m_programs.current,
            {
                {"sigmaX", {encode_2x2(0.0, 0.0, hbar/2.0F)}},
                {"sigmaY", {encode_2x2(0.0, 0.0, -i*hbar/2.0F)}},
                {"sigmaZ", {encode_2x2(hbar/2.0F, -hbar/2.0F, 0.0)}},
                {"uTex", {&m_frames.spinors[0][0]}},
                {"vTex", {&m_frames.spinors[0][1]}},
            }
        );
    }
    m_frames.tmp[1].draw(
        m_programs.all_alpha,
        {
            {"tex", {&m_frames.tmp[0]}},
            {"scale", {0.02F}},
        }
    );
    // m_frames.tmp[0].draw(
    //     m_programs.domain_coloring,
    //     {{"tex", {&m_frames.spinors[0][0]}}, {"brightness", {1.0F}}}
    // );
    IVec3 id_3d = get_3d_texel_dimensions(sim_params.texelSideLength);
    const RenderTarget &view = 
        m_planar_slices.view(
            m_frames.tmp[1], id_3d,
            rotation,
            scale,
            sim_params.texelSideLength/2,
            sim_params.texelSideLength/2,
            sim_params.texelSideLength/2,
            screen_cursor_pos
        );
    m_frames.main_render.draw(
        m_programs.copy,
        {
            {"tex", {&view}}
        },
        m_quad_wire_frame
    );
    // volatile Enables _ ({GL_DEPTH_TEST, GL_BLEND});
    return m_frames.main_render;
}