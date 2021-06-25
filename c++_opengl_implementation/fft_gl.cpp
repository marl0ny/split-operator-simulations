#include "gl_wrappers.hpp"


static Quad *fft(GLuint program, Quad *quads[2], float size, bool is_vert) {
    for (float block_size = 2.0; block_size <= size; block_size *= 2.0) {
        quads[1]->set_program(program);
        quads[1]->bind();
        quads[1]->set_int_uniform("tex", quads[0]->get_value());
        quads[1]->set_int_uniform("isVertical", (int)is_vert);
        quads[1]->set_float_uniforms({{"blockSize", block_size/(float)size},
                                      {"angleSign", 1.0},
                                      {"size", (float)size},
                                      {"scale", 1.0},
                                      });
        quads[1]->draw();
        unbind();
        Quad *tmp = quads[1];
        quads[1] = quads[0];
        quads[0] = tmp;
    }
    return quads[0];
}

Quad *horizontal_fft(GLuint fft_program, Quad *quads[2], float size) {
    return fft(fft_program, quads, size, false);
}

Quad *vertical_fft(GLuint fft_program, Quad *quads[2], float size) {
    return fft(fft_program, quads, size, true);
}

static Quad *ifft(GLuint program, Quad *quads[2], float size, bool is_vert) {
    for (float block_size = 2.0; block_size <= size; block_size *= 2.0) {
        quads[1]->set_program(program);
        quads[1]->bind();
        quads[1]->set_int_uniform("tex", quads[0]->get_value());
        quads[1]->set_int_uniform("isVertical", (int)is_vert);
        quads[1]->set_float_uniforms({{"blockSize", block_size/(float)size},
                                      {"angleSign", -1.0},
                                      {"size", float(size)},
                                      {"scale", (block_size == size)? 
                                                1.0/(float)size: 1.0},
                                      });
        quads[1]->draw();
        unbind();
        Quad *tmp = quads[1];
        quads[1] = quads[0];
        quads[0] = tmp;
    }
    return quads[0];
}

Quad *horizontal_ifft(GLuint fft_program, Quad *quads[2], float size) {
    return ifft(fft_program, quads, size, false);
}

Quad *vertical_ifft(GLuint fft_program, Quad *quads[2], float size) {
    return ifft(fft_program, quads, size, true);
}

static void fft_shift(Quad *dest, Quad *src, GLuint fft_shift_program, 
               bool is_vert) {
    dest->set_program(fft_shift_program);
    dest->bind();
    dest->set_int_uniform("tex", src->get_value());
    dest->set_int_uniform("isVertical", is_vert);
    dest->draw();
    unbind();
}

void horizontal_fft_shift(Quad *dest, Quad *src, GLuint fft_shift_program) {
    fft_shift(dest, src, fft_shift_program, false);
}

void vertical_fft_shift(Quad *dest, Quad *src, GLuint fft_shift_program) {
    fft_shift(dest, src, fft_shift_program, true);
}
