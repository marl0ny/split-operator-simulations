#include "gl_wrappers.hpp"
#include <complex>

#ifndef _SPINORS_
#define _SPINORS_


namespace spinors {

class Spinor {
    std::complex<float> ind[2];
    public:
    Spinor(std::complex<float> c1, std::complex<float> c2):
        ind {c1, c2} {};
    Spinor(): ind {0.0, 0.0} {};
    Spinor operator+(const Spinor &s) const;
    std::complex<float> operator[] (size_t index) const;
    std::complex<float> &operator[] (size_t index);
    Vec4 store_as_vec4() const;
    Spinor dagger() const;
};

std::complex<float> inner_prod(Spinor &s1, Spinor &s2);

Spinor operator*(const std::complex<float> &c, const Spinor &s);

class BiSpinor {
    Spinor ind[2];
    public:
    BiSpinor(Spinor c1, Spinor c2): ind {c1, c2} {};
    BiSpinor operator+(const BiSpinor &b) const;
    Spinor operator[] (size_t index) const;
    BiSpinor dagger() const;
};

BiSpinor operator*(const std::complex<float> &c, const BiSpinor &b);

struct Parameters {
    float c;
    float m;
    float hbar;
};

BiSpinor get_spinor_plane_wave(
    Parameters params, Vec3 p, std::vector<std::complex<float>> e, 
    int representation);

spinors::Spinor get_spin_up_state(const Vec3 &orientation, float length);

spinors::Spinor get_spin_down_state(const Vec3 &orientation, float length);

}

#endif
