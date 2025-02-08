#include "gl_wrappers.hpp"

#ifndef _PLANAR_SLICE_
#define _PLANAR_SLICE_

namespace planar_slice {


class PlanarSlices {
    WireFrame m_planar_slice;
    WireFrame m_quartered_outline;
    RenderTarget m_render_target;
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
    // std::vector<Vec3> get_planar_vectors(
    //     Quaternion rotation, int plane_slice);
    public:
    PlanarSlices(const TextureParams &);
    const RenderTarget& view(
        const Quad &src, IVec3 id_3d,
        Quaternion rotate,
        float scale,
        int offset_xy, int offset_yz, int offset_xz,
        Vec2 screen_cursor_pos
    );
    Vec3 most_perpendicular_intersection(
        IVec3 id_3d,
        Quaternion rotate, float scale,
        int offset_xy, int offset_yz, int offset_xz,
        Vec2 screen_cursor_pos
    );
};

}


#endif