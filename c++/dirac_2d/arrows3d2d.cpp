#include "arrows3d2d.hpp"


static std::vector<int> get_elements(IVec2 d_2d) {
    std::vector<int> elements {};
    for (int i = 0; i < d_2d[0]*d_2d[1]*2; i++)
        elements.push_back(i);
    return elements;
}

static std::vector<float> get_vertices(IVec2 d_2d) {
    std::vector<float> vertices {};
    for (int i = 0; i < d_2d[1]; i++) {
        for (int j = 0; j < d_2d[0]; j++) {
            float u = (float(j) + 0.5F)/float(d_2d[0]);
            float v = (float(i) + 0.5F)/float(d_2d[1]);
            float offset0 = 0.0;
            float offset1 = 1.0;
            vertices.push_back(u);
            vertices.push_back(v);
            vertices.push_back(0.0);
            vertices.push_back(offset0);
            vertices.push_back(u);
            vertices.push_back(v);
            vertices.push_back(0.0);
            vertices.push_back(offset1);
        }
    }
    return vertices;
}

WireFrame arrows3d2d::get_2d_vector_field_wire_frame(IVec2 d_2d) {
    Attributes attributes = {
        {"position", {
            .size=4, .type=GL_FLOAT, .normalized=false, .stride=0, .offset=0
    }}};
    std::vector<float> vertices = get_vertices(d_2d);
    std::vector<int> elements = get_elements(d_2d);
    return WireFrame(attributes, vertices, elements, WireFrame::LINES);
}
