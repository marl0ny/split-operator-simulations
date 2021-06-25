#include <GL/glew.h>
#include <GLFW/glfw3.h>
#include <map>
#include <string>
#include <fstream>
#include <iostream>
#include <cstdlib>
#include <cstdint>
#include <cstdio>
#ifndef _GL_WRAPPERS_HPP_
#define _GL_WRAPPERS_HPP_  


GLFWwindow *init_window(int width, int height);

void init_glew();

GLuint make_texture(uint8_t *image, size_t image_w, size_t image_h);

void unbind();

GLuint make_program(GLuint vs_ref, GLuint fs_ref);

GLuint get_shader(const char *shader_loc, GLuint shader_type);

void compile_shader(GLuint shader_ref, const char *shader_source);


class Frame {
    protected:
    static int total_frames; 
    int frame_number = 0;
    public:
    int get_value() const;
    int get_tex_unit() const;
    static int get_blank() {
        return total_frames;
    }
};

 
class Quad: public Frame {
    GLuint program = 0;
    GLuint vao = 0;
    GLuint vbo = 0;
    GLuint ebo = 0;
    GLuint fbo = 0;
    GLuint texture = 0;
    char vertex_name[16] = {'\0'};
    Quad();
    void init_texture(int width, int height, int texture_type);
    void init_objects();
    public:
    void set_program(GLuint program);
    void set_vertex_name(const char *name);
    void set_vertex_name(const std::string &name);
    void bind();
    int get_texture() const;
    static Quad make_frame(int width, int height,
        const std::string &vertex_name=std::string("position"));
    static Quad make_float_frame(int width, int height,
        const std::string &vertex_name=std::string("position"));
    static Quad make_image_frame(uint8_t *image,
        int width, int height,
        const std::string &vertex_name=std::string("position"));
    void set_int_uniform(const char *name, int val);
    void set_int_uniform(const std::string &name, int val);
    void set_int_uniforms(const std::map<std::string, int> &uniforms);
    void set_float_uniform(const char *name, float val);
    void set_float_uniform(const std::string &name, float val);
    void set_float_uniforms(const std::map<std::string, double> &uniforms);
    void get_texture_array(void *arr, int x0, int y0, int w, int h, 
                           int type=GL_UNSIGNED_BYTE);
    void change_texture_properties(int w, int h, 
                                   int s_boundary, int t_boundary,
                                   int texture_type);
    void activate_framebuffer();
    void substitute_array(int w, int h, int texture_type, void *array);
    void draw() const;
    ~Quad() {
        glDeleteVertexArrays(1, &vao);
        glDeleteBuffers(1, &vbo);
        glDeleteBuffers(1, &ebo);
        if (frame_number != 0) {
            glDeleteBuffers(1, &fbo);
        }
        glDeleteTextures(1, &texture);
    }
};

#endif
