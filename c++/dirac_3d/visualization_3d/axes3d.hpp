#include "gl_wrappers.hpp"

#ifndef _AXES3D_
#define _AXES3D_

namespace axes3d {
    WireFrame get_axes_wireframe();
    WireFrame get_xyz_axes_labels_wireframe();

    struct Programs {
        uint32_t axes, labels;
    };

    void draw_axes(
        RenderTarget &dst,
        const Programs &programs,
        WireFrame &axes_wf, WireFrame &labels_wf,
        const Quaternion &rotation, int size,
        float color_scale,
        bool use_perspective_projection,
        IVec2 screen_dimensions);
};


#endif