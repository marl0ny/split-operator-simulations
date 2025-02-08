#include "gl_wrappers.hpp"
#include "reduce4d.hpp"

void reduce4d::initialize_sum_quads(
    std::vector<Quad> &sum_quads, TextureParams params, 
    int max_dim, int min_dim) {
    for (int n = max_dim; n >= min_dim; n /= 2) {
        params.width = n;
        params.height = n;
        sum_quads.push_back(Quad{params});
    }
}

void reduce4d::reduce(std::vector<Quad> &sum_quads,
            uint32_t scale_program, const Quad &src) {
    sum_quads[0].draw(scale_program,
        {{"scale", {1.0F}}, {"tex", {&src}}}
    );
    for (int i = 1; i < sum_quads.size(); i++) {
        sum_quads[i].draw(
            scale_program,
            {{"scale", {4.0F}}, {"tex", {&sum_quads[i-1]}}}
        );
    }
}