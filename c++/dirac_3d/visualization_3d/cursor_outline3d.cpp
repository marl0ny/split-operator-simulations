#include "gl_wrappers.hpp"
#include "cursor_outline3d.hpp"

using namespace cursor_outline3d;

static std::vector<int> get_elements() {
    return {

        0, 1, 0, 3, 0, 5, 0, 7, 0, 10, 
        0, 13,

        1, 2, 2, 3, 3, 4, 4, 5, 5, 6,
        6, 7, 7, 8, 8, 1,

        1, 9, 9, 10, 10, 11, 11, 5,
        5, 12, 12, 13, 13, 14, 14,1,

        3, 15, 15, 16, 16, 17, 17, 7,
        7, 18, 18, 13, 13, 19, 19, 3


    };
}

static std::vector<float> get_vertices() {
    std::vector<std::vector<float>> unflattened_vertices {
        {0.0, 0.0, 0.0},

        {1.0, 0.0, 0.0}, // --
        {1.0, 1.0, 0.0}, 
        {0.0, 1.0, 0.0}, // --
        {-1.0, 1.0, 0.0},
        {-1.0, 0.0, 0.0}, // --
        {-1.0, -1.0, 0.0},
        {0.0, -1.0, 0.0}, // --
        {1.0, -1.0, 0.0},

        // [1] 1.0, 0.0, 0.0,
        {1.0, 0.0, 1.0},
        {0.0, 0.0, 1.0}, // --
        {-1.0, 0.0, 1.0},
        // [5] -1.0, 0.0, 0.0,
        {-1.0, 0.0, -1.0},
        {0.0, 0.0, -1.0}, // --
        {1.0, 0.0, -1.0},
        // [1] 1.0, 0.0, 0.0

        // [3] 0.0, 1.0, 0.0,
        {0.0, 1.0, 1.0},
        {0.0, 0.0, 1.0},
        {0.0, -1.0, 1.0},
        // [7] 0.0, -1.0, 0.0,
        {0.0, -1.0, -1.0},
        // [13] 0.0, 0.0, -1.0,
        {0.0, 1.0, -1.0},
        // [3] 0.0, 1.0, 0.0

    };
    std::vector<float> vertices {};
    for (std::vector<float> v: unflattened_vertices)
        for (float e: v)
            vertices.push_back(e);
    return vertices;
}

WireFrame cursor_outline3d::get_cursor_wire_frame() {
    std::vector<int> elements = get_elements();
    std::vector<float> vertices = get_vertices();
    return WireFrame(
        {{"position", Attribute{
                .size=3, .type=GL_FLOAT, .normalized=false,
                .stride=0, .offset=0}}
        }, vertices, elements, WireFrame::LINES);
}
