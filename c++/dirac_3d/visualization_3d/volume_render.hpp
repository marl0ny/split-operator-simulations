#include "gl_wrappers.hpp"

#ifndef _VOLUME_RENDER_
#define _VOLUME_RENDER_

namespace volume_render {

    struct Programs {
        uint32_t copy;
        uint32_t sample_data;
        uint32_t gradient;
        uint32_t show_volume;
        uint32_t sample_data_show_volume;
        uint32_t zero_boundaries_3d;
        uint32_t modify_boundaries;
        Programs();
    };

    struct Frames {
        TextureParams volume_f16;
        TextureParams volume_f32;
        TextureParams data_f16;
        TextureParams data_f32;
        TextureParams view_tex;
        Quad data;
        Quad gradient_data;
        Quad data_half_precision;
        Quad gradient_data_half_precision;
        Quad volume;
        Quad volume_grad;
        WireFrame wire_frame;
        public:
        void reset_data(IVec2 data_dimensions2d);
        void reset_volume(
            IVec2 volume_dimensions2d,
            IVec3 volume_dimensions3d);
        void reset_view(IVec2 view_dimensions2d);
        Frames(IVec2 view_dimensions2d,
               IVec2 data_texel_dimensions2d,
               IVec2 volume_texel_dimensions2d,
               IVec3 volume_texel_dimensions3d,
               unsigned int min_filter=GL_LINEAR,
               unsigned int mag_filter=GL_LINEAR);
    };

    class VolumeRender {
        Quaternion debug_rotation;
        IVec2 view_dimensions;

        // 2D texture dimensions
        // 2D dimensions of the initial volume data texture
        IVec2 data_texel_dimensions2d;
        // 2D dimensions of the texture used in the volume render frame
        IVec2 volume_texel_dimensions2d;

        // 3D texture dimensions
        // 3D dimensions of the initial volume data texture
        IVec3 data_texel_dimensions3d;
        // 3D dimensions of the texture used in the volume render frame
        IVec3 volume_texel_dimensions3d;
        // cube_outline;
        // cube_outline_wireframe;
        Programs programs;
        Frames frames;
        std::vector<Vec3> bounding_box;
        public:
        VolumeRender(
            TextureParams view_tex_params,
            IVec3 data_texel_dimensions3d,
            IVec3 volume_dimensions3d);
        void reset_data_dimensions(IVec3 data_dimensions3d);
        void reset_volume_dimensions(IVec3 volume_dimensions3d);
        void reset_filtering(unsigned int filtering);
        // const RenderTarget &view(
        //     const Quad &src_data, float scale,
        //     Quaternion rotation,
        //     float alpha_brightness=1.0, float color_brightness=1.0,
        //     Uniforms additional_uniforms={});
        void view(
            RenderTarget &dst, const Quad &src_data, 
            float scale,
            Quaternion rotation,
            float alpha_brightness=1.0,
            float color_brightness=1.0,
            bool use_perspective_projection=false,
            Uniforms additional_uniforms={}
        );
        const Quad &get_gradient_half_precision() const;
        const Quad &volume_quad() const;
        const Quad &volume_gradient_quad() const;


    };
};

#endif
