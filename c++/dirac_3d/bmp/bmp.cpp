#include "bmp.hpp"
#include <cstdio>


unsigned int get_bmp_row_byte_size(int width) {
    return ((width*3) % 4 == 0)? 
        (3*width): ((3*width) + (4 - ((3*width) % 4)));
}

BMPHeader::
BMPHeader(int width, int height):
        bm {'B', 'M'},
        _padding {'\0','\0', '\0', '\0'},
        data_offset(54),
        header_size(40),
        width(width), height(height),
        plane_count(1),
        bits_per_pixel(24),
        compression_method(0),
        horizontal_resolution(100),
        vertical_resolution(100),
        color_pallete_count(16777216),
        important_colors_count(0) {
    int row_size = get_bmp_row_byte_size(width);
    this->total_file_size = 54 + row_size*height;
    this->image_size = row_size*height;
}

void print_bmp_header(const BMPHeader &h) {
    printf("Total file size: %d\n", h.total_file_size);
    printf("Data offset: %d\n", h.data_offset);
    printf("Header size: %d\n", h.header_size);
    printf("Width: %d\n", h.width);
    printf("Height: %d\n", h.height);
    printf("Plane count: %d\n", h.plane_count);
    printf("Bits per pixel: %d\n", h.bits_per_pixel);
    printf("Compression method: %d\n", h.compression_method);
    printf("Image size: %d\n", h.image_size);
    printf("Horizontal resolution: %d\n", h.horizontal_resolution);
    printf("Vertical resolution: %d\n", h.vertical_resolution);
    printf("Color pallete count: %d\n", h.color_pallete_count);
    printf("Imporant colors count: %d\n", h.important_colors_count);
}

std::vector<unsigned char>
    get_bmp_file(int &width, int &height, const std::string &filename) {
    FILE *f = fopen(&filename[0], "rb");
    if (f == NULL) {
        perror("fopen");
        fclose(f);
        return {};
    }
    BMPHeader header(0, 0);
    fread((void *)&header, 1, sizeof(BMPHeader), f);
    // TODO: check if the header is actually valid!!!
    width = header.width;
    height = header.height;
    fseek(f, header.data_offset, SEEK_SET);
    std::vector<unsigned char> data (
       header.image_size - header.data_offset,  '\0'
    );
    fread(&data[0], 1, data.size(), f);
    print_bmp_header(header);
    fclose(f);
    // if (get_bmp_row_byte_size(width) == width*3) {
        return data;
    /* } else {
        std::vector<unsigned char> data2 (3*width*height);
        for (int i = 0; i < )
    }*/
}
