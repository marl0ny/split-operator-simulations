#include "axes3d.hpp"

#include <vector>

static std::vector<float> get_xyz_line_vertices() {
    return {
        -1.0, -1.0, 0.0,
        1.0, 1.0, 0.0,
        -1.0, 1.0, 0.0,
        1.0, -1.0, 0.0,

        0.0, -1.0, 1.0,
        0.0, 0.0, 1.0,
        -1.0, 1.0, 1.0,
        1.0, 1.0, 1.0,

        1.0, -1.0, 2.0,
        -1.0, -1.0, 2.0,
        1.0, 1.0, 2.0,
        -1.0, 1.0, 2.0
    };
}

static std::vector<int> get_xyz_elements() {
    return {
        0, 1, 2, 3,
        0 + 4, 1 + 4, 1 + 4, 2 + 4, 1 + 4, 3 + 4,
        0 + 8, 1 + 8, 1 + 8, 2 + 8, 2 + 8, 3 + 8
    };
}

static std::vector<float> get_axes_vertices() {
    return std::vector{
        0.0F, 0.0F, 0.0F, 0.0F,
        1.0F, 0.0F, 0.0F, 0.0F,
        0.0F, 0.0F, 0.0F, 1.0F,
        0.0F, 1.0F, 0.0F, 1.0F,
        0.0F, 0.0F, 0.0F, 2.0F,
        0.0F, 0.0F, 1.0F, 2.0F,
    };
}

static std::vector<int> get_axes_elements() {
    return {0, 1, 2, 3, 4, 5};
}

WireFrame axes3d::get_axes_wireframe() {
    std::vector<int> elements = get_axes_elements();
    std::vector<float> vertices = get_axes_vertices();
    return WireFrame(
        {{"position", Attribute{
                .size=4, .type=GL_FLOAT, .normalized=false,
                .stride=0, .offset=0}}
        }, vertices, elements, WireFrame::LINES);
}

WireFrame axes3d::get_xyz_axes_labels_wireframe() {
    std::vector<int> elements = get_xyz_elements();
    std::vector<float> vertices = get_xyz_line_vertices();
    return WireFrame(
        {{"position", Attribute{
                .size=3, .type=GL_FLOAT, .normalized=false,
                .stride=0, .offset=0}}
        }, vertices, elements, WireFrame::LINES);
}

void axes3d::draw_axes(
    RenderTarget &dst,
    const Programs &programs,
    WireFrame &axes_wf, WireFrame &labels_wf,
    const Quaternion &rotation, int size,
    float color_scale,
    bool use_perspective_projection,
    IVec2 screen_dimensions) {
    float view_scale = float(size)/(float)screen_dimensions[0];
    float offset = -float(screen_dimensions[0] - size)
        / (float)screen_dimensions[0];
    // printf("view_scale: %f\n", view_scale);
    dst.draw(
        programs.axes,
        {
            {"rotation", rotation},
            {"viewScale", view_scale},
            {"usePerspectiveProjection",
                int(use_perspective_projection)},
            {"offset", 
                Vec3{.x=offset, .y=offset, 0.0}},
            {"screenDimensions", screen_dimensions}
        },
        axes_wf
    );
    dst.draw(
        programs.labels,
        {
            {"rotation", rotation},
            {"viewScale", view_scale},
            {"colorScale", color_scale},
            {"usePerspectiveProjection",
                int(use_perspective_projection)},
            {"offset", Vec3{
                .x=offset, .y=offset, 0.0}},
            {"screenDimensions", screen_dimensions}
        },
        labels_wf
    );

}

