#include "gl_wrappers.hpp"
#include "planar_slice.hpp"
#include "matrix.hpp"

using namespace planar_slice;

static std::vector<float> get_planar_vertices() {
    return {
        0.0, 0.0, 0.0,
        -1.0, -1.0, 0.0,
        -1.0, 0.0, 0.0,
        -1.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        1.0, 1.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, -1.0, 0.0,
        0.0, -1.0, 0.0
    };
}

static std::vector<int> get_planar_elements() {
    return {
        1, 8, 0, 1, 0, 2, 2, 0, 4, 2, 4, 3,
        0, 5, 4, 0, 6, 5, 8, 6, 0, 8, 7, 6    
    };
}


static std::vector<float> get_quartered_square_outline_vertices() {
    return {
        0.0, 0.0, 0.0,
        -1.0, -1.0, 0.0,
        -1.0, 0.0, 0.0,
        -1.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        1.0, 1.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, -1.0, 0.0,
        0.0, -1.0, 0.0,
    };
}

static std::vector<int> get_quartered_square_outline_elements() {
    return {
        // Edges for the "cross" that's inside the square
        0, 8, 0, 2, 0, 4, 0, 6,
        // Edges of the outer square
        1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 1
    };
}

static WireFrame get_quartered_square_outline_wire_frame() {
    std::vector<float> vertices = get_quartered_square_outline_vertices();
    std::vector<int> elements = get_quartered_square_outline_elements();
    return WireFrame(
        {
            {"position", {
                    .size=3, .type=GL_FLOAT, 
                    .normalized=GL_FALSE, .stride=0, .offset=0}
                }
            }, 
            vertices, elements, 
            WireFrame::LINES
    );
}

static WireFrame get_planar_slice_wire_frame() {
    std::vector<float> vertices = get_planar_vertices();
    std::vector<int> elements = get_planar_elements();
    return WireFrame(
        {
            {"position", {
                    .size=3, .type=GL_FLOAT, .normalized=GL_FALSE,
                    .stride=0, .offset=0}}
        },
        vertices, elements,
        WireFrame::TRIANGLES
    );
}

PlanarSlices::PlanarSlices(const TextureParams &tex_params):
    m_planar_slice(get_planar_slice_wire_frame()),
    m_quartered_outline(get_quartered_square_outline_wire_frame()),
    m_render_target(RenderTarget(tex_params))
{
    m_planar_slice_program = make_program_from_paths(
        "./shaders/slices/planar-slice.vert", 
        "./shaders/util/slice-of-3d.frag"
    );
    m_quartered_square_program = make_program_from_paths(
        "./shaders/slices/quartered-square-outline.vert", 
        "./shaders/util/uniform-color.frag"
    );
}

#define PI 3.141592653589793

std::vector<Vec3> PlanarSlices::get_offset_vectors(
    IVec3 id_3d,
    int offset_xy,
    int offset_yz,
    int offset_xz,
    bool respect_to_slices
) {
    if (respect_to_slices) {
        /* By "respect_to_slices", this means that absolutely no rotation has
         been applied to the planes. Each plane's normal still points in the
         z-direction.*/
        return {
            Vec3{
                .x=0.0, .y=0.0,
                .z=2.0F*((float)offset_xy/float(id_3d[0]) - 0.5F)},
            Vec3{
                .x=0.0, .y=0.0,
                .z=-2.0F*((float)offset_yz/float(id_3d[1]) - 0.5F)},
            Vec3{
                .x=0.0, .y=0.0,
                .z=-2.0F*((float)offset_xz/float(id_3d[2]) - 0.5F)},
        };
    } else {
        /* If respect_to_slices is disabled, then rotate 
        the YZ (index 1) plane so that its normal points
        in the positive x direction, and likewise for the XZ plane
        (index 2) in the positive y direction. The rotation as
        dictated by user input is not applied.  
        */
        return {
            Vec3{
                .x=0.0, .y=0.0,
                .z=2.0F*((float)offset_xy/float(id_3d[0]) - 0.5F)},
            Vec3{ 
                .x=2.0F*((float)offset_yz/float(id_3d[1]) - 0.5F),
                .y=0.0, .z=0.0},
            Vec3{
                .x=0.0,
                .y=2.0F*((float)offset_xz/float(id_3d[2]) - 0.5F),
                .z=0.0},
        };
    }
}

static std::vector<Vec3> get_planar_vectors(Quaternion rotation) {
    auto v = get_planar_vertices();
    const Vec3 *ptr_v = (const Vec3 *)&v[0];
    Quaternion q0 = {.real=1.0, .i=ptr_v[0].x, .j=ptr_v[0].y, .k=ptr_v[0].z};
    Quaternion q1 = {.real=1.0, .i=ptr_v[1].x, .j=ptr_v[1].y, .k=ptr_v[1].z};
    Quaternion q2 = {.real=1.0, .i=ptr_v[3].x, .j=ptr_v[3].y, .k=ptr_v[3].z};
    Quaternion s0 = rotate(q0, rotation);
    Quaternion s1 = rotate(q1, rotation);
    Quaternion s2 = rotate(q2, rotation);
    Vec3 r0 = {.ind={s0.i, s0.j, s0.k}};
    Vec3 r1 = {.ind={s1.i, s1.j, s1.k}};
    Vec3 r2 = {.ind={s2.i, s2.j, s2.k}};
    Vec3 r01 = r1 - r0;
    Vec3 r02 = r2 - r0;
    return {r01, r02};
}

static Vec3 get_unnormalized_normal(Quaternion rotation) {
    std::vector<Vec3> vectors = get_planar_vectors(rotation);
    return cross_product(vectors[0], vectors[1]);
}

static Vec3 get_line_plane_intersection(
    const Vec3 &line_start, const Vec3 &line_end,
    const Vec3 &plane_vector0, const Vec3 &plane_vector1, const Vec3 &offset) {
    Vec3 line_direction = (line_end - line_start).normalized();
    Vec3 b = line_start - offset;
    Matrix m ({
        {plane_vector0.x, plane_vector1.x, -line_direction.x},
        {plane_vector0.y, plane_vector1.y, -line_direction.y},
        {plane_vector0.z, plane_vector1.z, -line_direction.z}});
    auto b_vec = std::vector<double>{b[0], b[1], b[2]};
    std::vector<double> solution = m.solve(b_vec);
    return offset 
        + plane_vector0*float(solution[0]) + plane_vector1*float(solution[1]);
}

/* Get the line of sight from the screen cursor.
This line is represented using two points. The line is rotated
and scaled with respect to the simulation view space, and not
from the perspective of the viewer.
*/
static std::vector<Vec3> line_from_screen_cursor(
    Quaternion rot, float scale, Vec2 screen_cursor_pos) {
    screen_cursor_pos = 2.0*(screen_cursor_pos - Vec2{.ind{0.5, 0.5}});
    Quaternion cursor_pos0_3d {
        .real=1.0,
        .i=screen_cursor_pos.x, .j=screen_cursor_pos.y, .k=-1.0
    };
    Quaternion cursor_pos1_3d {
        .real=1.0,
        .i=screen_cursor_pos.x, .j=screen_cursor_pos.y, .k=1.0
    };
    cursor_pos0_3d = rotate(cursor_pos0_3d, rot.conj())/scale;
    cursor_pos1_3d = rotate(cursor_pos1_3d, rot.conj())/scale;
    Vec3 cursor_pos0_3d_v {.ind={
        cursor_pos0_3d.i, cursor_pos0_3d.j, cursor_pos0_3d.k
    }};
    Vec3 cursor_pos1_3d_v {.ind={
        cursor_pos1_3d.i, cursor_pos1_3d.j, cursor_pos1_3d.k
    }};
    return {cursor_pos0_3d_v, cursor_pos1_3d_v};
}

static Vec3 most_perpendicular_intersection_helper(
    Quaternion rotate, float scale,
    Vec3 offset_vector, 
    Vec3 line_start, Vec3 line_end) {
    std::vector<Vec3> planar_vectors = get_planar_vectors(rotate);
    Vec3 intersection = get_line_plane_intersection(
        line_start, line_end, 
        planar_vectors[0], planar_vectors[1], 
        offset_vector);
    return intersection;

}

Vec3 PlanarSlices::most_perpendicular_intersection(
    IVec3 id_3d,
    Quaternion user_rotate, float scale,
    int offset_xy, int offset_yz, int offset_xz,
    Vec2 screen_cursor_pos
) {
    Quaternion rotate_xy = Quaternion{1.0, 0.0, 0.0, 0.0};
    Quaternion rotate_yz = Quaternion::rotator(
        PI/2.0, {.x=0.0, .y=1.0, .z=0.0});
    Quaternion rotate_xz = Quaternion::rotator(
        -PI/2.0, {.x=1.0, .y=0.0, .z=0.0});
    auto planar_rotations = std::vector<Quaternion> {
        rotate_xy, rotate_yz, rotate_xz
    };
    auto offset_vectors = get_offset_vectors(
        id_3d, offset_xy, offset_yz, offset_xz, true);
    std::vector<Vec3> line_of_sight = line_from_screen_cursor(
        user_rotate, scale, screen_cursor_pos);
    std::vector<float> dots {};
    for (Quaternion &rotation: planar_rotations) {
        Vec3 normal = get_unnormalized_normal(rotation);
        dots.push_back(
            dot(normal, line_of_sight[1] - line_of_sight[0])
        );
    }
    int most_perp_slice = 0;
    for (int i = 0; i < 3; i++) {
        if (abs(dots[i]) > abs(dots[most_perp_slice]))
            most_perp_slice = i;
    }
    Vec3 intersection = most_perpendicular_intersection_helper(
        planar_rotations[most_perp_slice], 
        scale, offset_vectors[most_perp_slice],
        line_of_sight[0], line_of_sight[1]);
    return intersection;
}

const RenderTarget& PlanarSlices::view(
    const Quad &src, IVec3 id_3d, 
    Quaternion rotate, float scale,
    int offset_xy, int offset_yz, int offset_xz,
    Vec2 screen_cursor_pos) {
    Quaternion rotate_xy = rotate;
    Quaternion rotate_yz = Quaternion::rotator(
        PI/2.0, {.x=0.0, .y=1.0, .z=0.0})*rotate;
    Quaternion rotate_xz = Quaternion::rotator(
        -PI/2.0, {.x=1.0, .y=0.0, .z=0.0})*rotate;
    auto rotations = std::vector<Quaternion> {
        rotate_xy, rotate_yz, rotate_xz
    };
    auto slices = std::vector<int> {
        offset_xy, offset_yz, offset_xz
    };
    
    auto offset_vectors = get_offset_vectors(
        id_3d, offset_xy, offset_yz, offset_xz, true);
    auto s = get_planar_vectors(rotations[PlanarSlices::XY_INDEX]);
    m_render_target.clear();
    { 
        Enables _({GL_DEPTH_TEST, GL_BLEND});
        glDepthFunc(GL_LESS);
        IVec2 screen_dimensions = m_render_target.texture_dimensions();
        for (int slice_index = 0; slice_index < 3; slice_index++) {
            m_render_target.draw(
                m_planar_slice_program,
                {
                    {"scale", {scale}},
                    {"sourceTexelDimensions2D",
                        {get_2d_from_3d_dimensions(id_3d)}
                    },
                    {"sourceTexelDimensions3D", {id_3d}},
                    {"tex", {&src}},
                    {"alpha", {float(1.0F)}},
                    {"showOutline", {false}},
                    {"screenDimensions", {screen_dimensions}},
                    {"orientation", {slice_index}},
                    {"rotation", {rotations[slice_index]}},
                    {"offset", {offset_vectors[slice_index]}},
                    {"slice", {slices[slice_index]}},

                },
                m_planar_slice
            );
            m_render_target.draw(
                m_quartered_square_program,
                {
                    {"cursorPosition", {Vec3{.ind={-1.0, 1.0, 0.0}}}},
                    {"offset", {offset_vectors[slice_index]}},
                    {"scale", {float(1.01*scale)}},
                    {"rotation", {rotations[slice_index]}},
                    {"screenDimensions", {screen_dimensions}},
                    {"color", {Vec4{.r=0.7, .g=0.7, .b=0.7, .a=0.5}}},
                },
                m_quartered_outline
            );
        }
    }
    return m_render_target;
}