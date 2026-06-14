#include "gl_wrappers.hpp"

#ifndef _CURSOR_OUTLINE3D_
#define _CURSOR_OUTLINE3D_

namespace cursor_outline3d {

WireFrame get_cursor_wire_frame();


/* class CursorOutline {
    WireFrame m_planar_outlines;
    uint32_t m_outline_program;
    // enum SLICE_INDICES {XY_INDEX=0, YX_INDEX=1, XZ_INDEX=2};
    // std::vector<Vec3> get_offset_vectors(
    //     IVec3 id_3d,
    //     int offset_xy,
    //     int offset_yz,
    //     int offset_xz,
    //     bool respect_to_slices = false
    // );
    void normals_dot_line(
        float xy, float xz, float yz,
        Quaternion rotation, Vec3 line_start, Vec3 line_end
    );
    public:
    CursorOutline(const TextureParams &);
    void view(
        RenderTarget &dst,
        const Quad &src, IVec3 id_3d,
        Quaternion rotate,
        float scale,
        int offset_xy, int offset_yz, int offset_xz,
        Vec2 screen_cursor_pos
    );
};*/

}


#endif