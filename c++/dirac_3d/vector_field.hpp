#include "gl_wrappers.hpp"

#ifndef _VEC_FIELD_
#define _VEC_FIELD_

struct VectorField {
    WireFrame wire_frame;
    VectorField(IVec3 d_3d);
};

WireFrame get_3d_vector_field_wire_frame(IVec3 d_3d);

#endif
