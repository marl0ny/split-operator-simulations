#include "cube_outline.hpp"
#include "gl_wrappers.hpp"

#include <vector>

static std::vector<float> get_cube_outline_vertices_set_elements(
    std::vector<int> &elements
) {
    std::vector<float> vertices {
        -1.0, -1.0, -1.0, // 0 - bottom left
        1.0, -1.0, -1.0, // 1 - bottom right
        1.0, 1.0, -1.0, // 2 - upper right
        -1.0, 1.0, -1.0, // 3 - upper left
        -1.0, -1.0, 1.0, // 4
        1.0, -1.0, 1.0, // 5
        1.0, 1.0, 1.0, // 6
        -1.0, 1.0, 1.0, // 7
    };
    elements = {
        0, 1, 1, 2, 2, 3, 3, 0,
        0, 4, 3, 7, 2, 6, 1, 5,
        4, 5, 5, 6, 6, 7, 7, 4
    };
    // for (auto &e: elements) {
    //     printf("%g ", vertices[3*e]);
    //     printf("%g ", vertices[3*e + 1]);
    //     printf("%g\n", vertices[3*e + 2]);
    // }
    return vertices;

}

WireFrame get_cube_outline_wire_frame(
) {
    std::vector<int> elements{};
    std::vector<float> vertices = get_cube_outline_vertices_set_elements(
        elements);
    return WireFrame(
        {{"position", Attribute{
                .size=3, .type=GL_FLOAT, .normalized=false,
                .stride=0, .offset=0}}
        }, vertices, elements, WireFrame::LINES);
}