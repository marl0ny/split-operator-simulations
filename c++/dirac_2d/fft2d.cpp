#include "fft2d.hpp"


static Quad &fft_iter_square(
    uint32_t program,
    fft2d::QuadTemps &iter_quads,
    bool is_inverse, IVec2 texel_dimensions
) {
    int size = texel_dimensions[0];
    int indices[2] = {0, 1};
    for (int block_size = 2; block_size <= size; block_size *= 2) {
        float angle_sign = (is_inverse)? 1.0: -1.0;
        float tex_block_size = double(block_size)/double(size);
        float scale = 
            (is_inverse && block_size == size)? (1.0/double(size)): 1.0;
        iter_quads.ind[indices[1]].draw(
            program,
            {
                {"tex", {&iter_quads.ind[indices[0]]}},
                {"blockSize", {tex_block_size}},
                {"angleSign", {angle_sign}},
                {"scale", {scale}},
                {"size", {float(size)}},
            }
        );
        std::swap(indices[0], indices[1]);
    }
    return iter_quads.ind[indices[0]];
}

static void rev_bit_sort2(
    uint32_t program, 
    Quad &dst, const Quad &src, 
    IVec2 texel_dimensions
) {
    dst.draw(
        program,
        {
            {"tex", {&src}},
            {"texelDimensions2D", {texel_dimensions}}
        }
    );
}

void fft2d::fft(Quad &dst, const Quad &src,
         QuadTemps &iter_quads,
         Programs fft_programs,
         IVec2 texel_dimensions) {
    uint32_t rev_bit_sort2_program = fft_programs.rev_bit_sort2;
    uint32_t fft_iter_program = fft_programs.fft_iter;
    rev_bit_sort2(
        rev_bit_sort2_program, iter_quads.ind[0], src, texel_dimensions);
    dst = fft_iter_square(
        fft_iter_program, iter_quads, false, texel_dimensions);
}

void fft2d::ifft(Quad &dst, const Quad &src,
         QuadTemps &iter_quads,
         Programs fft_programs,
         IVec2 texel_dimensions) {
    uint32_t rev_bit_sort2_program = fft_programs.rev_bit_sort2;
    uint32_t fft_iter_program = fft_programs.fft_iter;
    rev_bit_sort2(
        rev_bit_sort2_program, iter_quads.ind[0], src, texel_dimensions);
    dst = fft_iter_square(
        fft_iter_program, iter_quads, true, texel_dimensions);
}
