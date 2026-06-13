#include "line_arrows3d.hpp"

static std::vector<int> get_elements(IVec3 d_3d) {
    std::vector<int> elements {};
    for (int i = 0; i < d_3d[0]*d_3d[1]*d_3d[2]; i++) {
        elements.push_back(4*i);
        elements.push_back(4*i + 1);
        elements.push_back(4*i + 1);
        elements.push_back(4*i + 2);
        elements.push_back(4*i + 1);
        elements.push_back(4*i + 3);
    }
    return elements;
}

static std::vector<float> get_vertices(IVec3 d_3d) {
    IVec2 d_2d = get_2d_from_3d_dimensions(d_3d);
    // get_2d_from_3d_texture_coordinates(uvw, d_2d, IVec3 &dimensions_3d)
    std::vector<float> vertices {};
    for (int i = 0; i < d_2d[1]; i++) {
        for (int j = 0; j < d_2d[0]; j++) {
            float u = (float(j) + 0.5F)/float(d_2d[0]);
            float v = (float(i) + 0.5F)/float(d_2d[1]);
            float offset0 = 0.0;
            float offset1 = 1.0;
            float ratio = 0.1;
            vertices.push_back(u);
            vertices.push_back(v);
            vertices.push_back(0.0);
            vertices.push_back(offset0);
            vertices.push_back(u);
            vertices.push_back(v);
            vertices.push_back(0.0);
            vertices.push_back(offset1);
            vertices.push_back(u);
            vertices.push_back(v);
            vertices.push_back(ratio);
            vertices.push_back(offset1);
            vertices.push_back(u);
            vertices.push_back(v);
            vertices.push_back(-ratio);
            vertices.push_back(offset1);
        }
    }
    return vertices;
}

WireFrame line_arrows3d::get_3d_vector_field_wire_frame(IVec3 d_3d) {
    Attributes attributes = {
        {"position", {
            .size=4, .type=GL_FLOAT, .normalized=false, .stride=0, .offset=0
    }}};
    std::vector<float> vertices = get_vertices(d_3d);
    std::vector<int> elements = get_elements(d_3d);
    return WireFrame(attributes, vertices, elements, WireFrame::LINES);
}

line_arrows3d::Programs
::Programs() {
    this->arrows3d = make_program_from_paths(
        "./shaders/arrows/line-arrows3d.vert", 
        "./shaders/util/uniform-color.frag"
    );
}

line_arrows3d::Frames::
Frames(const TextureParams &default_tex_params, IVec3 d_3d) :
    arrows3d(get_3d_vector_field_wire_frame(d_3d)),
    dimensions3d(d_3d) {
}

void line_arrows3d::Frames
::reset_dimensions(IVec3 d_3d) {
    this->dimensions3d = d_3d;
    this->arrows3d = get_3d_vector_field_wire_frame(d_3d);
}

line_arrows3d::Arrows::
Arrows(IVec3 d_3d, TextureParams default_tex_params):
    m_programs(line_arrows3d::Programs()),
    m_frames(line_arrows3d::Frames(default_tex_params, d_3d)) {
}

void line_arrows3d::Arrows::
view(
    RenderTarget &dst, const Quad &src,
    float scale, Quaternion rotation,
    IVec3 arrows_dimensions3d,
    IVec3 src_texel_dimensions3d,
    Uniforms additional_uniforms) {
    if (arrows_dimensions3d.x != m_frames.dimensions3d.x ||
        arrows_dimensions3d.y != m_frames.dimensions3d.y ||
        arrows_dimensions3d.z != m_frames.dimensions3d.z)
        m_frames.reset_dimensions(arrows_dimensions3d);
    this->view(
        dst, src, scale, rotation, 
        src_texel_dimensions3d, additional_uniforms);
}

void line_arrows3d::Arrows::
view(
    RenderTarget &dst, const Quad &src,
    float scale, Quaternion rotation,
    IVec3 src_texel_dimensions3d,
    Uniforms additional_uniforms) {
    IVec3 tex_d3d = src_texel_dimensions3d;
    IVec2 tex_d2d = get_2d_from_3d_dimensions(tex_d3d);
    IVec2 arrows_2d = get_2d_from_3d_dimensions(m_frames.dimensions3d);
    Uniforms uniforms = {
        {"vecTex", &src},
        {"arrowScale", float(1.0)},
        {"maxLength", float(0.1)},
        {"rotation", rotation},
        {"translate", Vec3{.x=0.0, .y=0.0, .z=0.0}},
        {"scale", float(scale)},
        {"screenDimensions", dst.texture_dimensions()},
        {"arrowsDimensions3D", m_frames.dimensions3d},
        {"arrowsDimensions2D", arrows_2d},
        {"texelDimensions3D", tex_d3d},
        {"texelDimensions2D", tex_d2d},
        {"color", Vec4{.r=1.0, .g=1.0, .b=1.0, .a=1.0}}
    };
    for (auto &e: additional_uniforms)
        uniforms.insert(e);
    dst.draw(
        m_programs.arrows3d, 
        uniforms,
        m_frames.arrows3d
    );
}
