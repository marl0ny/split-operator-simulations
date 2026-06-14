#include "gl_wrappers.hpp"

#ifndef _PLANAR_SLICE_
#define _PLANAR_SLICE_

namespace planar_slice {


class PlanarSlices {
    WireFrame m_planar_slice;
    WireFrame m_quartered_outline;
    uint32_t m_planar_slice_program;
    uint32_t m_quartered_square_program;
    enum SLICE_INDICES {XY_INDEX=0, YX_INDEX=1, XZ_INDEX=2};
    std::vector<Vec3> get_offset_vectors(
        IVec3 id_3d,
        int offset_xy,
        int offset_yz,
        int offset_xz,
        bool respect_to_slices = false
    );
    void normals_dot_line(
        float xy, float xz, float yz,
        Quaternion rotation, Vec3 line_start, Vec3 line_end
    );
    // void get_xy_normal(quaternion rotation);
    // void 
    int find_most_perpendicular_plane(
        IVec3 id_3d,
        Quaternion rotation,
        int offset_xy, int offset_yz, int offset_xz
    );
    // std::vector<Vec3> get_planar_vectors(
    //     Quaternion rotation, int plane_slice);
    public:
    PlanarSlices(const TextureParams &);
    void view(
        RenderTarget &dst,
        const Quad &src, IVec3 id_3d,
        Quaternion rotate,
        float scale,
        int offset_xy, int offset_yz, int offset_xz,
        Vec2 screen_cursor_pos
    );
    void view(
        RenderTarget &dst,
        const Quad &src, IVec3 id_3d,
        Quaternion rotate,
        float scale,
        int offset_xy, int offset_yz, int offset_xz,
        Vec2 screen_cursor_pos,
        bool use_perspective_projection
    );
    Vec3 most_perpendicular_intersection(
        IVec3 id_3d,
        Quaternion rotate, float scale,
        int offset_xy, int offset_yz, int offset_xz,
        Vec2 screen_cursor_pos
    );
    Vec3 most_perpendicular_intersection(
        int &most_perp, IVec3 id_3d,
        Quaternion rotate, float scale,
        int offset_xy, int offset_yz, int offset_xz,
        Vec2 screen_cursor_pos
    );
};

}


#endif