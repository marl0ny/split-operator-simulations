#include "vector_field.hpp"
#include "gl_wrappers.hpp"

static std::vector<int> get_elements(IVec3 d_3d) {
    std::vector<int> elements {};
    for (int i = 0; i < d_3d[2]; i++)
        elements.push_back(i);
    return elements;
}

static std::vector<float> get_vertices(IVec3 d_3d) {
    std::vector<float> vertices {};
    for (int i = 0; i < d_3d[2]; i++) {
        for (int j = 0; j < d_3d[1]; j++) {
            for (int k = 0; k < d_3d[0]; k++) {
                Vec4 v1 = {.ind={
                    (k + 0.5F)/d_3d[0],
                    (j + 0.5F)/d_3d[1],
                    (i + 0.5F)/d_3d[2],
                    0.0F
                }};
                Vec4 v2 = {.ind={
                    (k + 0.5F)/d_3d[0],
                    (j + 0.5F)/d_3d[1],
                    (i + 0.5F)/d_3d[2],
                    1.0F
                }};
                for (int i = 0; i < 4; i++)
                    vertices.push_back(v1[i]);
                for (int i = 0; i < 4; i++)
                    vertices.push_back(v2[i]);
            }
        }
    }
    return vertices;
}

WireFrame get_3d_vector_field_wire_frame(IVec3 d_3d) {
    Attributes attributes = {
        {"position", 
        Attribute{.size=4, .type=GL_FLOAT,
        .normalized=false, .stride=0, .offset=0}}
    };
    auto vertices = get_vertices(d_3d);
    auto elements = get_elements(d_3d);
    return WireFrame(attributes, vertices, elements);
}

// class VectorField {
//     WireFrame wire_frame;
// };