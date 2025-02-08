#ifndef _FFT2D_
#define _FFT2D_

#include "gl_wrappers.hpp"

namespace fft2d {

     struct Programs {
          uint32_t rev_bit_sort2;
          uint32_t fft_iter;
     };

     struct QuadTemps {
          Quad ind[2];
     };

    void fft(Quad &dst, const Quad &src, QuadTemps &temps,
         Programs fft_programs, IVec2 texel_dimensions);

    void ifft(Quad &dst, const Quad &src, QuadTemps &temps,
         Programs fft_programs, IVec2 texel_dimensions);

}

#endif
