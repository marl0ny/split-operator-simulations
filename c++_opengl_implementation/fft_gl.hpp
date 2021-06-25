#include "gl_wrappers.hpp"

#ifndef _FFT_GL_
#define _FFT_GL_


Quad *horizontal_fft(GLuint fft_program, Quad *quads[2], float size);

Quad *vertical_fft(GLuint fft_program, Quad *quads[2], float size);

Quad *horizontal_ifft(GLuint fft_program, Quad *quads[2], float size);

Quad *vertical_ifft(GLuint fft_program, Quad *quads[2], float size);

void horizontal_fft_shift(Quad *dest, Quad *src, GLuint fft_shift_program);

void vertical_fft_shift(Quad *dest, Quad *src, GLuint fft_shift_program);

#endif