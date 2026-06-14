#include <complex>
#include "spinors.hpp"

namespace spinors {

typedef std::complex<float> complex;
using std::sqrtf;
using std::norm;


Spinor Spinor::operator+(const Spinor &s) const {
    return {this->ind[0] + s.ind[0], this->ind[1] + s.ind[1]};
}
complex Spinor::operator[] (size_t index) const {
    return this->ind[index];
}
complex& Spinor::operator[] (size_t index) {
    return this->ind[index];
}

Spinor operator*(const complex &c, const Spinor &s) {
    return Spinor(c*s[0], c*s[1]);
}

Vec4 Spinor::store_as_vec4() const {
    return {.ind={
        this->ind[0].real(), this->ind[0].imag(),
        this->ind[1].real(), this->ind[1].imag()}};
}

Spinor Spinor::dagger() const {
    return Spinor(conj(this->ind[0]), conj(this->ind[1]));
}

complex inner_product(const Spinor &a, const Spinor &b) {
    return std::conj(a[0])*b[0] + std::conj(a[1])*b[1];
}

BiSpinor BiSpinor::operator+(const BiSpinor &b) const {
    return {this->ind[0] + b.ind[0], this->ind[1] + b.ind[1]};
}

Spinor BiSpinor::operator[] (size_t index) const {
    return ind[index];
}

BiSpinor operator*(const complex &c, const BiSpinor &b) {
    return BiSpinor(c*b[0], c*b[1]);
}

BiSpinor BiSpinor::dagger() const {
    return BiSpinor(this->ind[0].dagger(), this->ind[1].dagger());
}


std::complex<float> inner_prod(Spinor &s1, Spinor &s2) {
    return std::conj(s1[0])*s2[0] + std::conj(s1[1])*s2[1];
}

class Hermitian2x2 {
    float diag[2];
    complex non_diag;
    public:
    Hermitian2x2(float d00, complex d01, float d11):
        diag {d00, d11}, non_diag {d01} {}
    complex operator()(bool i, bool j) const {
        if (i == j)
            return (i == 0)? diag[0]: diag[1];
        else
            return (i == 0)? non_diag: conj(non_diag);
    }
};

struct RealSymmetric2x2: Hermitian2x2 {
    RealSymmetric2x2(
        float d00, float d01, float d11
    ): Hermitian2x2(d00, d01, d11) {}
    RealSymmetric2x2(): Hermitian2x2(0.0, 0.0, 0.0) {}
    float operator()(bool i, bool j) const {
        return Hermitian2x2::operator()(i, j).real();
    }
};

/* Spinor matmul(const Hermitian2x2 &m, const Spinor &v) {
    return Spinor(
        m(0, 0)*v[0] + m(0, 1)*v[1],
        m(1, 0)*v[0] + m(1, 1)*v[1]
    );
}

float expectation_value(const Hermitian2x2 &o, const Spinor &s) {
    return inner_product(s, matmul(o, s)).real();
}*/

Spinor get_spin_up_state(const Vec3 &orientation, float length) {
    float n = length, nz = orientation.z;
    complex n_xy {orientation.x, orientation.y};
    if (norm(n_xy) == 0.0)
        return (nz >= 0.0)? Spinor(1.0, 0.0): Spinor(0.0, 1.0);
    return Spinor(
        (n + nz)/(n_xy*sqrtf((nz + n)*(nz + n)/norm(n_xy) + 1.0)),
        1.0/sqrtf((nz + n)*(nz + n)/norm(n_xy) + 1.0)
    );
}

Spinor get_spin_down_state(const Vec3 &orientation, float length) {
    float n = length, nz = orientation.z;
    complex n_xy {orientation.x, orientation.y};
    if (norm(n_xy) == 0.0)
        return (nz >= 0.0)? Spinor(0.0, 1.0): Spinor(1.0, 0.0);
    return Spinor(
        (-n + nz)/(n_xy*sqrtf((nz - n)*(nz - n)/norm(n_xy) + 1.0)),
        1.0F/sqrt((nz - n)*(nz - n)/norm(n_xy) + 1.0)
    );
}

float eigenvalue_real_symmetric2x2(int i, RealSymmetric2x2 m) {
    float d0 = m(0, 0), d1 = m(1, 1), nd = m(0, 1);
    if (nd == 0.0)
        return (i == 0)? d0: d1;
    if (i == 0)
        return d0/2.0 + d1/2.0
                 - sqrt(d0*d0 - 2.0*d0*d1 + d1*d1 + 4.0*nd*nd)/2.0;
    else
        return d0/2.0 + d1/2.0 
                 + sqrt(d0*d0 - 2.0*d0*d1 + d1*d1 + 4.0*nd*nd)/2.0;
}

Vec2 eigenvector_real_symmetric2x2(int i, RealSymmetric2x2 m) {
    float d0 = m(0, 0), d1 = m(1, 1), nd = m(0, 1);
    if (nd == 0.0)
        return (i == 0)? Vec2{.ind={1.0, 0.0}}: Vec2{.ind={0.0, 1.0}};
    if (i == 0)
        return Vec2 {.ind={
            (float)((d0 - d1 
            - sqrt(d0*d0 - 2.0*d0*d1 + d1*d1 + 4.0*nd*nd))/
            (nd*sqrt(pow((-d0 + d1 
                + sqrt(d0*d0 - 2.0*d0*d1 + d1*d1 + 4.0*nd*nd))/nd, 
                2.0) + 4.0))),
            (float)(2.0/sqrt(pow((-d0 + d1 + sqrt(d0*d0 
            - 2.0*d0*d1 + d1*d1 + 4.0*nd*nd))/nd, 2.0) + 4.0))
        }};
    else
        return Vec2 {.ind={
            (float)((d0 - d1 
                + sqrt(d0*d0 - 2.0*d0*d1 + d1*d1 + 4.0*nd*nd))/
            (nd*sqrt(pow((d0 - d1 
                + sqrt(d0*d0 - 2.0*d0*d1 + d1*d1 + 4.0*nd*nd))/nd, 
                2.0) + 4.0))),
            (float)(2.0/sqrt(pow((d0 - d1 + sqrt(d0*d0 
            - 2.0*d0*d1 + d1*d1 + 4.0*nd*nd))/nd, 2.0) + 4.0))
        }};
}

BiSpinor eigenvector_dirac_rep(
    bool is_positive,
    bool is_spin_up, Vec3 p, float m, float c) {
    bool is_negative = !is_positive, is_spin_down = !is_spin_up;
    float E = sqrt(m*m*c*c*c*c + c*c*dot(p, p));
    float abs_p = p.length();
    Spinor spin = (is_spin_up)? 
        get_spin_up_state(p, abs_p): get_spin_down_state(p, abs_p);
    float c0 = (is_positive)? 1.0: 0.0;
    float c1 = (is_negative)? 0.0: 1.0; 
    if (abs_p == 0.0) {
        return {c0*spin, c1*spin};
    } else {
        if (is_spin_up && is_positive) {
            c0 = 1.0;
            c1 = c*abs_p/(m*c*c + E);
        } else if (is_spin_down && is_positive) {
            c0 = 1.0;
            c1 = -c*abs_p/(m*c*c + E);
        } else if (is_spin_up && is_negative) {
            c0 = -c*abs_p/(m*c*c + E);
            c1 = 1.0;
        } else if (is_spin_down && is_negative) {
            c0 = c*abs_p/(m*c*c + E);
            c1 = 1.0;
        }
        return {sqrt((m*c*c + E)/(2.0*E))*c0*spin, sqrt((m*c*c + E)/(2.0*E))*c1*spin};
    }
}

enum {DIRAC=0, WEYL=1};

BiSpinor get_spinor_plane_wave(
    Parameters params, Vec3 p, std::vector<complex> e, 
    int representation) {
    float m = params.m;
    float c = params.c;
    Spinor up = spinors::get_spin_up_state(p.normalized(), p.length());
    Spinor down = spinors::get_spin_down_state(p.normalized(), p.length());
    if (representation == DIRAC) {
        BiSpinor v0 = eigenvector_dirac_rep(false, true, p, m, c);
        BiSpinor v1 = eigenvector_dirac_rep(true, true, p, m, c);
        BiSpinor v2 = eigenvector_dirac_rep(false, false, p, m, c);
        BiSpinor v3 = eigenvector_dirac_rep(true, false, p, m, c);
        return e[0]*v0 + e[1]*v1 + e[2]*v2 + e[3]*v3;
    } else if (representation == WEYL) {
        RealSymmetric2x2 matrix_up, matrix_down;
        Vec2 up0, up1, down0, down1;
        matrix_up 
            = RealSymmetric2x2(-p.length(),  m*c, p.length());
        matrix_down
            = RealSymmetric2x2(p.length(), m*c, -p.length());
        up0 = eigenvector_real_symmetric2x2(0, matrix_up);
        up1 = eigenvector_real_symmetric2x2(1, matrix_up);
        down0 = eigenvector_real_symmetric2x2(0, matrix_down);
        down1 = eigenvector_real_symmetric2x2(1, matrix_down);
        printf("%g, %g\n",up0[0], up0[1]);
        BiSpinor v0 {up0[0]*up, up0[1]*up};
        BiSpinor v1 {down0[0]*down, down0[1]*down};
        BiSpinor v2 {up1[0]*up, up1[1]*up};
        BiSpinor v3 {down1[0]*down, down1[1]*down};
        return e[0]*v0 + e[1]*v1 + e[2]*v2 + e[3]*v3;
    }
}

};