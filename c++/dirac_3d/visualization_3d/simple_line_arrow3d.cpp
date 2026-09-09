#include "simple_line_arrow3d.hpp"


WireFrame simple_line_arrow3d::get_wire_frame(
    Vec3 base, Vec3 head, Vec3 l_edge, Vec3 r_edge) {
    std::vector<float> vertices = {
        base.x, base.y, base.z,
        head.x, head.y, head.z,
        l_edge.x, l_edge.y, l_edge.z,
        r_edge.x, r_edge.y, r_edge.z
    };
    std::vector<int> elements = {0, 1, 1, 2, 1, 3};
    return WireFrame({
        {"position", Attribute{.size=3, .type=GL_FLOAT, .normalized=false,
        .stride=0, .offset=0}}}, vertices, elements, WireFrame::LINES
    );
}