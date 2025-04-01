#include "surface.hpp"

static std::vector<float> get_vertices_set_elements(
    IVec2 d_2d, std::vector<int> &elements) {
    int width = d_2d[0], height = d_2d[1];
    std::vector<float> vertices {};
    for (int i = 0; i < height; i++) {
        for (int j = 0; j < width; j++) {
            std::vector<float> vertex {};
            vertex.push_back(((float)i + 0.5)/float(width));
            vertex.push_back(((float)j + 0.5)/float(height));
            for (float e: vertex)
                vertices.push_back(e);
            if (i < (width - 1) && j < (height - 1)) {
                std::vector<int> triangle1 {
                    j + i*width, j + 1 + i*width, j + 1 + (i + 1)*width
                };
                std::vector<int> triangle2 {
                    j + 1 + (i + 1)*width, j + (i + 1)*width, j + i*width
                };
                for (int e: triangle1)
                    elements.push_back(e);
                for (int e: triangle2)
                    elements.push_back(e);
            }
        }
    }
    return vertices;
}

WireFrame get_surface_wireframe(IVec2 d_2d) {
    Attributes attributes = {
        {"position", {
            .size=2, .type=GL_FLOAT, .normalized=false, .stride=0, .offset=0
        }}
    };
    std::vector<int> elements {};
    std::vector<float> vertices = get_vertices_set_elements(d_2d, elements);
    return WireFrame(attributes, vertices, elements, WireFrame::TRIANGLES);
}