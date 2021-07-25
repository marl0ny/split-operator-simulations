#ifndef _COMPLEX_FLOAT_RGBA_
#define _COMPLEX_FLOAT_RGBA_


struct ComplexFloatRGBA {
    union {
        struct {
            float r;
            float g;
            float b;
            float a;
        };
        struct {
            float re;
            float im;
            float _pad[2];
        };
    };
    inline double real() {
        return re;
    }
    inline double imag() {
        return im;
    }
    inline void real(double re) {
        this->re = re;
    }
    inline void imag(double im) {
        this->im = im;
    }
};


#endif
