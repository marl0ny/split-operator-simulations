#include "gl_wrappers.hpp"
#include "parameters.hpp"
#include <complex>

#ifndef _SPINORS_
#define _SPINORS_

using namespace sim_3d;

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

BiSpinor get_spinor_plane_wave(
    SimParams sim_params, Vec3 p, std::vector<std::complex<float>> e, 
    int representation);
}

#endif
