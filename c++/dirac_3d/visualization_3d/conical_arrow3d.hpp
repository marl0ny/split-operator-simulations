#include "gl_wrappers.hpp"

#ifndef _CONICAL_ARROW3D_
#define _CONICAL_ARROW3D_


namespace conical_arrows3d {

WireFrame get_3d_vector_field_wire_frame(
    IVec3 d_3d, int points_per_cone_circle);

struct Programs {
    unsigned int arrows3d;
    // unsigned int 
    Programs();
};

struct Frames {
    WireFrame arrows3d;
    IVec3 dimensions3d;
    int points_per_cone_circle;
    void reset_dimensions(IVec3 d_3d);
    Frames(const TextureParams &default_texture_params,
           IVec3 d_3d, int points_per_cone_circle);
};

class Arrows {
    Programs m_programs;
    Frames m_frames;
    int points_per_cone_circle;
    public:
    Arrows(
        IVec3 d_3d, int points_per_cone_circle, 
        TextureParams default_tex_params);
    void view(
        RenderTarget &dst, const Quad &src,
        float scale, Quaternion rotation,
        IVec3 src_texel_dimensions3d,
        Uniforms additional_uniforms = {});
    void view(
        RenderTarget &dst, const Quad &src,
        float scale, Quaternion rotation,
        IVec3 arrows_dimensions3d,
        IVec3 src_texel_dimensions3d,
        Uniforms additional_uniforms = {});
};

}

#endif