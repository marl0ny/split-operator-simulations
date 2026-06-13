#ifndef _BMP_
#define _BMP_

#include <vector>
#include <string>

unsigned int get_bmp_row_byte_size(int width);

/* Struct for keeping track of bitmap header image information.

Reference:

Wikipedia - BMP file format
https://en.wikipedia.org/wiki/BMP_file_format

*/
struct __attribute__((packed)) BMPHeader {
    char bm[2];
    int total_file_size;
    char _padding[4];
    int data_offset;
    unsigned int header_size;
    int width, height;
    unsigned short plane_count;
    unsigned short bits_per_pixel;
    unsigned int compression_method;
    unsigned int image_size;
    int horizontal_resolution;
    int vertical_resolution;
    unsigned int color_pallete_count;
    unsigned int important_colors_count;
    BMPHeader(int width, int height);
};

void print_bmp_header(const BMPHeader &);

std::vector<unsigned char>
    get_bmp_file(int &width, int &height, const std::string &name);

#endif