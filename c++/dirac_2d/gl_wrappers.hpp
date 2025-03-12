/* This header file and its corresponding source contain 
custom wrapper functions and classes around the OpenGL API to hide 
the tedious boilerplate, for the purpose of simplifying 
the structure and layout of simulation code that utilize GLSL shaders
for numerical computations and visualizations.

A useful resource for writing this source file is Learn OpenGL
(https://learnopengl.com), which is especially helpful for learning
OpenGL for the first time.
*/
// #include <sys/_types/_u_int32_t.h>
#define GL_SILENCE_DEPRECATION
// #define GLFW_INCLUDE_GLCOREARB
#define GLFW_INCLUDE_ES3
#include <map>
#include <string>
#include <vector>
#include <GLES3/gl3.h>
#include <GLES3/gl32.h>
#include <cstdlib>
#include <cstdint>

// #ifdef __EMSCRIPTEN__
// #define uint32_t int
// #define u_int32_t int
// #define uint8_t char
// #endif

#ifndef _GL_WRAPPERS
#define _GL_WRAPPERS

/* #ifdef __cplusplus
extern "C" {
#endif*/


struct TextureParams {

    /* Format of texture. */
    uint32_t format; // Either GL_RGBA32F, etc.

    // int number_of_channels;

    /* Dimensions of texture. */
    uint32_t width, height;

    /* Whether to create a mipmap or not. */
    uint32_t generate_mipmap; // 1=generate mipmap, 0=don't

    /* Value sampled when reading from texture coordinates
       beyond the texture boundaries.
       wrap_s deals with the first texture coordinate, s, while
       wrap_t deals with the second, t.*/
    uint32_t wrap_s, wrap_t; // GL_CLAMP_TO_EDGE, GL_REPEAT, etc.

    /* Interpolation used when sampling the texture.
       mag_fiter is for magnification to a larger texture,
       min_filter is for minification.*/
    uint32_t min_filter, mag_filter; // GL_LINEAR, GL_NEAREST, etc
};

struct Attribute {
    uint32_t size;
    uint32_t type;
    uint8_t normalized;
    size_t stride;
    size_t offset;
};

struct Vec3;

struct Quaternion {
    float real, i, j, k;
    Quaternion conj() const;
    float length() const;
    float length_squared() const;
    Quaternion inverse() const;
    static Quaternion rotator(float angle, const Vec3 &axis);
    Quaternion operator*(const Quaternion &) const;
    Quaternion operator/(double val) const;
};

Quaternion rotate(const Quaternion &q, const Quaternion &rotation);

struct Vec2 {
    union {
        struct { float ind[2]; };
        struct { float x, y; };
        struct { float u, v; };
        struct { float s, t; };
    };
    float &operator[](size_t index);
    float operator[](size_t index) const;
    Vec2 operator+(const Vec2 &) const;
    Vec2 operator*(const Vec2 &) const;
    Vec2 operator-(const Vec2 &) const;
    Vec2 operator/(const Vec2 &) const;
    Vec2 operator+(float) const;
    Vec2 operator*(float) const;
    Vec2 operator-(float) const;
    Vec2 operator/(float) const;
    float length_squared() const;
    float length() const;
    Vec2 normalized() const;
};

Vec2 operator+(float, const Vec2 &);
Vec2 operator*(float, const Vec2 &);
Vec2 operator-(float, const Vec2 &);
Vec2 operator/(float, const Vec2 &);

struct IVec2 {
    union {
        struct { int ind[2]; };
        struct { int x, y; };
        struct { int u, v; };
        struct { int s, t; };
    };
    int &operator[](size_t index);
    int operator[](size_t index) const;
    IVec2 operator+(const IVec2 &) const;
    IVec2 operator*(const IVec2 &) const;
    IVec2 operator-(const IVec2 &) const;
    IVec2 operator/(const IVec2 &) const;
    IVec2 operator+(int) const;
    IVec2 operator*(int) const;
    IVec2 operator-(int) const;
    IVec2 operator/(int) const;
    int length_squared() const;
};

IVec2 operator+(int, const IVec2 &);
IVec2 operator*(int, const IVec2 &);
IVec2 operator-(int, const IVec2 &);
IVec2 operator/(int, const IVec2 &);

struct Vec3 {
    union {
        struct { float ind[3]; };
        struct { float x, y, z; };
        struct { float r, g, b; };
        struct { float u, v, w; };
        struct { float s, t, p; };
    };
    float &operator[](size_t index);
    float operator[](size_t index) const;
    Vec3 operator+(const Vec3 &) const;
    Vec3 operator*(const Vec3 &) const;
    Vec3 operator-(const Vec3 &) const;
    Vec3 operator/(const Vec3 &) const;
    Vec3 operator+(float) const;
    Vec3 operator*(float) const;
    Vec3 operator-(float) const;
    Vec3 operator/(float) const;
    float length_squared() const;
    float length() const;
    Vec3 normalized() const;
};

Vec3 operator+(float, const Vec3 &);
Vec3 operator*(float, const Vec3 &);
Vec3 operator-(float, const Vec3 &);
Vec3 operator/(float, const Vec3 &);

struct IVec3 {
    union {
        struct { int ind[3]; };
        struct { int x, y, z; };
        struct { int r, g, b; };
        struct { int u, v, w; };
        struct { int s, t, p; };
    };
    int &operator[](size_t index);
    int operator[](size_t index) const;
    IVec3 operator+(const IVec3 &) const;
    IVec3 operator*(const IVec3 &) const;
    IVec3 operator-(const IVec3 &) const;
    IVec3 operator/(const IVec3 &) const;
    IVec3 operator+(int) const;
    IVec3 operator*(int) const;
    IVec3 operator-(int) const;
    IVec3 operator/(int) const;
    int length_squared() const;
};

IVec3 operator+(int, const IVec3 &);
IVec3 operator*(int, const IVec3 &);
IVec3 operator-(int, const IVec3 &);
IVec3 operator/(int, const IVec3 &);

struct Vec4 {
    union {
        struct { float ind[4]; };
        struct { float x, y, z, w; };
        struct { float r, g, b, a; };
        struct { float s, t, p, q; };
    };
    float &operator[](size_t index);
    float operator[](size_t index) const;
    Vec4 operator+(const Vec4 &) const;
    Vec4 operator*(const Vec4 &) const;
    Vec4 operator-(const Vec4 &) const;
    Vec4 operator/(const Vec4 &) const;
    Vec4 operator+(float) const;
    Vec4 operator*(float) const;
    Vec4 operator-(float) const;
    Vec4 operator/(float) const;
    float length_squared() const;
    float length() const;
    Vec4 normalized() const;
};

Vec4 operator+(float, const Vec4 &);
Vec4 operator*(float, const Vec4 &);
Vec4 operator-(float, const Vec4 &);
Vec4 operator/(float, const Vec4 &);

struct IVec4 {
    union {
        struct { int ind[4]; };
        struct { int x, y, z, w; };
        struct { int r, g, b, a; };
        struct { int s, t, p, q; };
    };
    int &operator[](size_t index);
    int operator[](size_t index) const;
    IVec4 operator+(const IVec4 &) const;
    IVec4 operator*(const IVec4 &) const;
    IVec4 operator-(const IVec4 &) const;
    IVec4 operator/(const IVec4 &) const;
    IVec4 operator+(int) const;
    IVec4 operator*(int) const;
    IVec4 operator-(int) const;
    IVec4 operator/(int) const;
    int length_squared() const;
};

IVec4 operator+(int, const IVec4 &);
IVec4 operator*(int, const IVec4 &);
IVec4 operator-(int, const IVec4 &);
IVec4 operator/(int, const IVec4 &);

float dot(const Vec2 &, const Vec2 &);

int dot(const IVec2 &, const IVec2 &);

float dot(const Vec3 &, const Vec3 &);

int dot(const IVec3 &, const IVec3 &);

float dot(const Vec4 &, const Vec4 &);

int dot(const IVec4 &, const IVec4 &);

Vec3 cross_product(const Vec3 &, const Vec3 &);

struct Config {
    enum {EMPTY=0, VIEWPORT};
    int usage = Config::EMPTY;
    union {
        int _viewport[4];
        struct {
            int x0, y0;
            int width, height;
        };
    };
    static Config none() {
        return {};
    }
    static Config viewport(int width, int height) {
        Config c;
        c.usage = VIEWPORT;
        c._viewport[0] = 0;
        c._viewport[1] = 0;
        c._viewport[2] = width;
        c._viewport[3] = height;
        return c;
    }
    static Config viewport(int x0, int y0, int width, int height) {
        Config c;
        c.usage = VIEWPORT;
        c._viewport[0] = x0;
        c._viewport[1] = y0;
        c._viewport[2] = width;
        c._viewport[3] = height;
        return c;
    }
};

class Enables {
    std::vector<size_t> m_enables;
    // bool m_is_depth_func = false;
    // size_t m_depth_func = 0;
    Enables(const Enables &);
    Enables(Enables &&);
    Enables& operator=(const Enables &w);
    public:
    Enables(std::vector<size_t> enables) {
        // printf("\n");
        for (auto &e: enables)
            glEnable(e);
        m_enables = enables;
    }
    ~Enables() {
        // printf("\n");
        for (auto &e: m_enables)
            glDisable(e);
    }
};


class Quad;

class RenderTarget;

class MultidimensionalDataQuad;


struct Uniform {
    enum {
        BOOL,
        FLOAT, FLOAT2, FLOAT3, FLOAT4,
        INT, INT2, INT3, INT4,
        QUATERNION,
        DOUBLE, DOUBLE2,
        QUAD, RENDER_TARGET,
        MULTIDIMENSIONAL_DATA_QUAD,
    };
    int type;
    union {
        union {
            union {
                int i32;
                float f32;
                int b32;
            };
            struct IVec2 ivec2;
            struct Vec2 vec2;
            double f64;
            const Quad *quad;
            const RenderTarget *render_target;
            const MultidimensionalDataQuad *multidimensional_data_quad;
        };
        Vec3 vec3;
        IVec3 ivec3;
        Vec4 vec4;
        IVec4 ivec4;
        Quaternion quaternion;
    };
    public:
    // Uniform(Uniform &u) {
    //     strncpy(this, &u, sizeof(Uniform));
    // }
    // Uniform(Uniform &&u) {
    //     strncpy(this, &u, sizeof(Uniform));
    // }
    Uniform(bool b):b32(b) {type=Uniform::BOOL;}
    Uniform(int i):i32(i) {type=Uniform::INT;}
    Uniform(float f):f32(f) {type=Uniform::FLOAT;}
    Uniform(double d):f64(d) {type=Uniform::DOUBLE;}
    Uniform(struct Vec2 v):vec2(v) {type=Uniform::FLOAT2;}
    Uniform(struct IVec2 v):ivec2(v) {type=Uniform::INT2;}
    Uniform(struct Vec3 v):vec3(v) {type=Uniform::FLOAT3;}
    Uniform(struct IVec3 v):ivec3(v) {type=Uniform::INT3;}
    Uniform(struct Vec4 v):vec4(v) {type=Uniform::FLOAT4;}
    Uniform(struct IVec4 v):ivec4(v) {type=Uniform::INT4;}
    Uniform(struct Quaternion q): quaternion(q) {type=Uniform::QUATERNION;}
    Uniform(const Quad *q): quad(q) {type=Uniform::QUAD;}
    Uniform(const RenderTarget *t): render_target(t) {
        type=Uniform::RENDER_TARGET;
    }
    Uniform() {}
    Uniform(
        const MultidimensionalDataQuad *mdq
    ): multidimensional_data_quad(mdq) {
        type=Uniform::MULTIDIMENSIONAL_DATA_QUAD;
    }
};

struct UniformSlider {
    Uniform val;
    Uniform min;
    Uniform max;
    Uniform step;
    std::string name;
    Uniform operator()() {
        return val;
    }
};


uint32_t shader_from_source(
    std::string shader_source, uint32_t shader_type);

uint32_t make_program_from_sources(std::string, std::string);

uint32_t make_program_from_paths(std::string, std::string);

typedef std::map<std::string, Uniform> Uniforms;
typedef std::map<std::string, Attribute> Attributes;

class WireFrame {
    Attributes attributes;
    std::vector<float> vertices;
    std::vector<int> elements;
    uint32_t vao;
    uint32_t vbo;
    uint32_t ebo;
    int draw_type;
    public:
    enum {
        TRIANGLES=0, LINES, POINTS
    };
    WireFrame(const Attributes &attributes,
              const std::vector<float> &vertices,
              const std::vector<int> &elements, 
              int draw_type=WireFrame::TRIANGLES);
    /* WireFrame(const Attributes &attributes,
              const std::vector<Vec2> &vertices,
              const std::vector<int> &elements, 
              int draw_type=WireFrame::TRIANGLES);
    WireFrame(const Attributes &attributes,
              const std::vector<Vec3> &vertices,
              const std::vector<int> &elements, 
              int draw_type=WireFrame::TRIANGLES);
    WireFrame(const Attributes &attributes,
              const std::vector<Vec4> &vertices,
              const std::vector<int> &elements, 
              int draw_type=WireFrame::TRIANGLES);*/
    // std::vector<float> get_vertices();
    void draw(uint32_t program);
    WireFrame(const WireFrame &w);
    WireFrame& operator=(const WireFrame &w);
    const std::vector<float> &get_vertices(); // TODO
    const std::vector<int> &get_elements(); // TODO
    ~WireFrame();
};

class RenderTarget {
    size_t id;
    TextureParams params;
    uint32_t texture;
    uint32_t fbo;
    uint32_t rbo;
    void init_texture();
    void init_buffer();
    void adjust_viewport_before_drawing(const Config config);
    public:
    RenderTarget(TextureParams const &);
    int get_id() const;
    IVec2 texture_dimensions() const;
    void clear();
    void draw(uint32_t program, 
              const Uniforms &uniforms, 
              WireFrame &wire_frame,
              const Config config = Config());
};

class Quad {
    size_t id;
    TextureParams params;
    uint32_t texture;
    uint32_t fbo;
    void init_texture();
    void init_buffer();
    void bind(uint32_t program);
    void adjust_viewport_before_drawing(const Config config);
    Quad() {};
    void init(const TextureParams &);
    friend class MultidimensionalDataQuad;
    friend class MainQuad;
    void substitute_array(void *array, IVec4 viewport);
    public:
    Quad(const TextureParams &);
    Quad(Quad &&);
    Quad(const Quad &);
    Quad& operator=(const Quad &);
    Quad& operator=(Quad &&);
    static uint32_t make_program_from_path(std::string);
    static uint32_t make_program_from_source(std::string);
    static void make_program_from_source(uint32_t &, int &, std::string);
    int get_id() const;
    void clear();
    void reset(const TextureParams &);
    uint32_t width();
    uint32_t height();
    uint32_t format();
    void draw(uint32_t program, const Uniforms &uniforms,
              const Config = Config());
    void set_pixels(std::vector<float>);
    void set_pixels(float *arr);
    std::vector<float> get_float_pixels();
    std::vector<float> get_float_pixels(IVec4 viewport);
    std::vector<uint8_t> get_byte_pixels();
    std::vector<uint8_t> get_byte_pixels(IVec4 viewport);
    ~Quad();
};

class MultidimensionalDataQuad {
    Quad quad;
    std::vector<int> data_dimensions;
    IVec2 texture_dimensions;
    public:
    MultidimensionalDataQuad(
        const std::vector<int> &, const TextureParams &);
    int get_id() const;
    void clear();
    void reset(const std::vector<int> &, const TextureParams &);
    IVec2 get_texture_dimensions() const;
    IVec3 get_3d_dimensions() const;
    uint32_t format() const;
    void draw(uint32_t program, const Uniforms &uniforms);
    static uint32_t make_program_from_path(std::string);
    static uint32_t make_program_from_source(std::string);
};

class MainQuad {
    Quad quad;
    protected:
    MainQuad(int width, int height);
    public:
    void draw(const Quad &);
    void draw(const MultidimensionalDataQuad &);
    void draw(const RenderTarget &);
};

IVec2 get_2d_from_3d_dimensions(const IVec3 &dimensions_3d);

IVec2 get_2d_from_width_height_length(
    int width, int height, int length);

Vec2 get_2d_from_3d_texture_coordinates(
    Vec3 &uvw,
    IVec2 &tex_dimensions_2d,
    IVec3 &dimensions_3d);

Vec3 get_3d_from_2d_texture_coordinates(
    Vec2 &uv,
    IVec2 &tex_dimensions_2d,
    IVec3 &dimensions_3d);


/* #ifdef __cplusplus
} // extern "C"
#endif*/

#endif // _GL_WRAPPERS