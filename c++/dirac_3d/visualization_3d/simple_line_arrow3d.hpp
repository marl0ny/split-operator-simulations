#include "gl_wrappers.hpp"

#ifndef _SIMPLE_LINE_ARROW3D_
#define _SIMPLE_LINE_ARROW3D_

namespace simple_line_arrow3d {

    WireFrame get_wire_frame(
        Vec3 base, Vec3 tip, 
        Vec3 l_edge, Vec3 r_edge
    );

}

#endif