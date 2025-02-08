#ifndef _REDUCE4D_
#define _REDUCE4D_

#include "gl_wrappers.hpp"

namespace reduce4d {

    void initialize_sum_quads(
        std::vector<Quad> &sum_quads, TextureParams params, 
        int max_dim, int min_dim);
    
    void reduce(std::vector<Quad> &sum_quads,
            uint32_t scale_program, const Quad &src);

}

#endif