#include "gl_wrappers.hpp"

#include "conical_arrow3d.hpp"

static const double PI = 3.141592653589793;

static std::vector<int> get_elements(
    IVec3 d_3d, int circle_point_count) {
    std::vector<int> elements {};
    int tail_base_count = 4;
    int tail_body_count = 8;
    int head_base_count = circle_point_count + 1;
    int head_tip_count = circle_point_count + 1;
    for (int i = 0; i < d_3d[0]*d_3d[1]*d_3d[2]; i++) {
        std::vector<int> tail_base_elements = {
            0, 1, 3,
            1, 2, 3,
        };
        std::vector<int> tail_body_elements = {
            4, 5, 7,
            5, 6, 7,
            3, 6, 2,
            3, 7, 6,
            3, 0, 4,
            3, 4, 7,
            1, 5, 4,
            1, 4, 0,
            2, 1, 5,
            2, 5, 6
        };
        // int tail_point_count = 8;
        std::vector<int> head_base_elements {};
        for (int k = 0; k < circle_point_count - 1; k++) {
            head_base_elements.push_back( k);
            head_base_elements.push_back(k + 1);
            head_base_elements.push_back(circle_point_count);
        }
        head_base_elements.push_back(circle_point_count - 1);
        head_base_elements.push_back(0);
        head_base_elements.push_back(circle_point_count);
        std::vector<int> head_tip_elements {};
        for (int k = 0; k < circle_point_count - 1; k++) {
            head_tip_elements.push_back( k);
            head_tip_elements.push_back(k + 1);
            head_tip_elements.push_back(circle_point_count);
        }
        head_tip_elements.push_back(circle_point_count - 1);
        head_tip_elements.push_back(0);
        head_tip_elements.push_back(circle_point_count);
        std::vector<int> local_elements {};
        for (int e: tail_base_elements)
            local_elements.push_back(e);
        for (int e: tail_body_elements)
            local_elements.push_back(e + tail_base_count);
        for (int e: head_base_elements)
            local_elements.push_back(
                e + tail_base_count + tail_body_count);
        for (int e: head_tip_elements)
            local_elements.push_back(
                e + tail_base_count + tail_body_count + head_base_count);
        int prev_count = i*(
            tail_base_count + tail_body_count 
            + head_base_count + head_tip_count);
        for (int e: local_elements)
            elements.push_back(e + prev_count);
    }
    return elements;
}

struct ConicalArrowDimensions {
    double length;
    struct {
        double radius;
        double length;
    } tail;
    struct {
        double base_radius;
        double length;
        double offset;
    } head;
};

static std::vector<float> get_vertices(
    ConicalArrowDimensions spec,
    IVec3 d_3d, int circle_point_count) {
    IVec2 d_2d = get_2d_from_3d_dimensions(d_3d);
    // get_2d_from_3d_texture_coordinates(uvw, d_2d, IVec3 &dimensions_3d)
    std::vector<float> vertices {};
    double arrow_base_offset = 0.75;
    // The tail goes into the arrowhead or cone,
    // so it's length is greater than the
    // arrowhead's base.
    for (int i = 0; i < d_2d[1]; i++) {
        for (int j = 0; j < d_2d[0]; j++) {
            float u = (float(j) + 0.5F)/float(d_2d[0]);
            float v = (float(i) + 0.5F)/float(d_2d[1]);
            std::vector  <std::vector<double>> local_vertices = {
                {u, v, spec.tail.radius, PI/4.0, 0.0, -1.0},
                {u, v, spec.tail.radius,3.0*PI/4.0, 0.0, -1.0},
                {u, v, spec.tail.radius,5.0*PI/4.0, 0.0, -1.0},
                {u, v, spec.tail.radius,7.0*PI/4.0, 0.0, -1.0},
                {u, v, spec.tail.radius, PI/4.0, 0.0, 0.0},
                {u, v, spec.tail.radius,3.0*PI/4.0, 0.0, 0.0},
                {u, v, spec.tail.radius,5.0*PI/4.0, 0.0, 0.0},
                {u, v, spec.tail.radius,7.0*PI/4.0, 0.0, 0.0},
                {u, v, spec.tail.radius,PI/4.0, spec.tail.length, 0.0},
                {u, v, spec.tail.radius,3.0*PI/4.0, spec.tail.length, 0.0},
                {u, v, spec.tail.radius,5.0*PI/4.0, spec.tail.length, 0.0},
                {u, v, spec.tail.radius,7.0*PI/4.0, spec.tail.length, 0.0},
            };
            for (int k = 0; k < circle_point_count; k++)
                local_vertices.push_back(
                   {
                        u, v,
                        spec.head.base_radius,
                        2.0*PI*double(k)/double(circle_point_count), 
                        spec.head.offset, -1.0
                    });
            local_vertices.push_back({
                u, v, 
                0.0, -2.0*PI, arrow_base_offset, -1.0});
            double cos_offset = spec.head.base_radius / sqrt(
                spec.head.length*spec.head.length 
                + spec.head.base_radius*spec.head.base_radius);
            for (int k = 0; k < circle_point_count; k++)
                local_vertices.push_back(
                   {
                        u, v,
                        spec.head.base_radius,
                        2.0*PI*double(k)/double(circle_point_count), 
                        arrow_base_offset, cos_offset
                    });
            local_vertices.push_back({
                u, v, 
                0.0, -2.0*PI, spec.length, 1.0});
            for (int c1 = 0; c1 < local_vertices.size(); c1++) {
                for (double &e: local_vertices[c1])
                    vertices.push_back(e);
            }
        }
    }
    return vertices;
}


WireFrame conical_arrows3d::get_3d_vector_field_wire_frame(
    IVec3 d_3d, int points_per_cone_circle) {
    Attributes attributes = {
        {"texCoord", {
            .size=2, .type=GL_FLOAT, .normalized=false, 
            .stride=6*sizeof(float), .offset=0}},
        {"localCoord", {
            .size=4, .type=GL_FLOAT, .normalized=false,
            .stride=6*sizeof(float), .offset=2*sizeof(float)}}
    };
    ConicalArrowDimensions conical_arrow_dimensions {
        .length = 1.0,
        .tail.radius = 0.05,
        .tail.length = 0.8,
        .head.base_radius = 0.125,
        .head.offset = 0.75,
    };
    conical_arrow_dimensions.head.length = (
        conical_arrow_dimensions.length 
        - conical_arrow_dimensions.head.offset);
    std::vector<float> vertices = get_vertices(
        conical_arrow_dimensions,
        d_3d, points_per_cone_circle);
    std::vector<int> elements = get_elements(
        d_3d, points_per_cone_circle);
    return WireFrame(attributes, vertices, elements, WireFrame::TRIANGLES);
}

conical_arrows3d::Programs
::Programs() {
    this->arrows3d = make_program_from_paths(
        "./shaders/arrows/conical-arrows3d.vert", 
        "./shaders/arrows/conical-arrows3d.frag"
    );
}

conical_arrows3d::Frames::
Frames(
    const TextureParams &default_tex_params, IVec3 d_3d,
    int points_per_cone_circle) :
    arrows3d(get_3d_vector_field_wire_frame(
        d_3d, points_per_cone_circle)),
    dimensions3d(d_3d),
    points_per_cone_circle(points_per_cone_circle) {
}

void conical_arrows3d::Frames
::reset_dimensions(IVec3 d_3d) {
    this->dimensions3d = d_3d;
    int points_per_cone_circle = this->points_per_cone_circle;
    this->arrows3d = get_3d_vector_field_wire_frame(
        d_3d, points_per_cone_circle);
}

conical_arrows3d::Arrows::
Arrows(IVec3 d_3d, int points_per_cone_circle,
       TextureParams default_tex_params):
    m_programs(conical_arrows3d::Programs()),
    m_frames(conical_arrows3d::Frames(
        default_tex_params, d_3d, points_per_cone_circle)),
    points_per_cone_circle(points_per_cone_circle) {
}

void conical_arrows3d::Arrows::
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

void conical_arrows3d::Arrows::
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
        {"maxLength", float(0.05)},
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
    glEnable(GL_DEPTH_TEST);
    glDepthFunc(GL_LESS);
    dst.draw(
        m_programs.arrows3d, 
        uniforms,
        m_frames.arrows3d
    );
    glDisable(GL_DEPTH_TEST);
}
