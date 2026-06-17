/* The Dirac equation using an arbitrary four-vector potential and
with constants like c and hbar explicitly written out can be found
on pg 566 (eq. 20.2.2) of Principles of Quantum Mechanics by Shankar.

 The Split Operator position space propagator for the Dirac equation
 in the Dirac representation is derived in II.3 of this article by 
 Bauke and Keitel: https://arxiv.org/abs/1012.3911.
 To derive the position space propagator in the Weyl representation,
 the gamma matrices as given on (3.25) in pg. 41 of 
 An Introduction to Quantum Field Theory
 by Michael Peskin and Daniel Schroeder are used.
*/
#if (__VERSION__ >= 330) || (defined(GL_ES) && __VERSION__ >= 300)
#define texture2D texture
#else
#define texture texture2D
#endif

#if (__VERSION__ > 120) || defined(GL_ES)
precision highp float;
#endif
 
#if __VERSION__ <= 120
varying vec2 UV;
#define fragColor gl_FragColor
#else
in vec2 UV;
out vec4 fragColor;
#endif

uniform float dt;
uniform float c;
uniform float hbar;

uniform bool useAbsorbingBoundaries;
uniform float absCoeff;

uniform sampler2D uTex;
uniform sampler2D vTex;
uniform sampler2D potentialTex;
// uniform sampler2D imaginaryPotentialTex;

uniform ivec3 texelDimensions3D;
uniform ivec2 texelDimensions2D;

#define hermitian2x2 vec4

const int TOP = 0;
const int BOTTOM = 1;
uniform int spinorIndex;

const int DIRAC_REP = 0;
const int WEYL_REP = 1;
uniform int representation;

#define complex vec2
#define complex2 vec4

const hermitian2x2 SIGMA_X = hermitian2x2(0.0, 0.0, complex(1.0, 0.0));
const hermitian2x2 SIGMA_Y = hermitian2x2(0.0, 0.0, complex(0.0, -1.0));
const hermitian2x2 SIGMA_Z = hermitian2x2(1.0, -1.0, complex(0.0));

const float SQRT_2 = 1.4142135623730951;

float real(complex z) {
    return z[0];
}

float imag(complex z) {
    return z[1];
}

complex mul(complex z1, complex z2) {
    return complex(z1.x*z2.x - z1.y*z2.y, 
                   z1.x*z2.y + z1.y*z2.x);
}

complex2 c1C2(complex z, complex2 z2) {
    complex a = complex(z2[0], z2[1]);
    complex b = complex(z2[2], z2[3]);
    return complex2(complex(z.x*a.x - z.y*a.y, z.x*a.y + z.y*a.x),
                    complex(z.x*b.x - z.y*b.y, z.x*b.y + z.y*b.x));
}

complex conj(complex z) {
    return complex(z.x, -z.y);
}

complex innerProd(complex2 z1, complex2 z2) {
    return mul(conj(z1.rg), z2.rg) + mul(conj(z1.ba), z2.ba);
}

complex frac(complex z1, complex z2) {
    complex invZ2 = conj(z2)/(z2.x*z2.x + z2.y*z2.y);
    return mul(z1, invZ2);
}

complex complexExp(complex z) {
    return complex(exp(z.x)*cos(z.y), exp(z.x)*sin(z.y));
}

complex2 matrixMul(hermitian2x2 m, complex2 v) {
    complex m00 = complex(m[0], 0.0);
    complex m11 = complex(m[1], 0.0);
    complex m01 = complex(m[2], m[3]);
    complex m10 = conj(m01);
    complex v0 = v.rg;
    complex v1 = v.ba;
    return complex2(mul(m00, v0) + mul(m01, v1),
                    mul(m10, v0) + mul(m11, v1));
}

float expectationValue(hermitian2x2 operator, complex2 state) {
    return real(innerProd(state, matrixMul(operator, state)));
}

/* 
Compute the eigenvectors for a Pauli matrix oriented in an
arbitrary dimension. Although easily double by pencil and paper,
this was instead done using 
Python with [Sympy](https://www.sympy.org/en/index.html).
The representation used for the Pauli matrices are found here:
https://en.wikipedia.org/wiki/Pauli_matrices.

>>> from sympy import Symbol, sqrt
>>> from sympy import Matrix
>>> nx = Symbol('nx', real=True)
>>> ny = Symbol('ny', real=True)
>>> nz = Symbol('nz', real=True)
>>> n = sqrt(nx**2 + ny**2 + nz**2)
>>> H = Matrix([[nz, nx - 1j*ny],
>>>             [nx + 1j*ny, -nz]])
>>> eigvects, diag_matrix = H.diagonalize(normalize=True)
>>> eigvects = eigvects.subs(n, 'n')
>>> print(eigvects, diag_matrix)

*/
complex2 getSpinDownState(vec3 orientation, float len) {
    float n = len;
    float nx = orientation.x, ny = orientation.y, nz = orientation.z;
    complex a = frac(complex(-n + nz, 0.0),
                     complex(nx, ny)*sqrt((nz - n)*(nz - n)/(nx*nx + ny*ny)
                                          + 1.0));
    complex b = complex(1.0/sqrt((nz - n)*(nz - n)/(nx*nx + ny*ny) + 1.0),
                        0.0);
    if ((nx*nx + ny*ny) == 0.0)
        return (nz >= 0.0)? 
            complex2(complex(0.0), complex(1.0, 0.0)):
            complex2(complex(1.0, 0.0), complex(0.0));
    return complex2(a, b);
}

complex2 getSpinUpState(vec3 orientation, float len) {
    float n = len;
    float nx = orientation.x, ny = orientation.y, nz = orientation.z;
    complex a = frac(complex(n + nz, 0.0),
                     complex(nx, ny)*sqrt((nz + n)*(nz + n)/(nx*nx + ny*ny)
                                          + 1.0));
    complex b = complex(1.0/sqrt((nz + n)*(nz + n)/(nx*nx + ny*ny) + 1.0),
                        0.0);
    if ((nx*nx + ny*ny) == 0.0)
        return (nz >= 0.0)? 
            complex2(complex(1.0, 0.0), complex(0.0)):
            complex2(complex(0.0), complex(1.0, 0.0));
    return complex2(a, b);
}

vec4 computeCurrent(complex2 psi01, complex2 psi23) {
    complex2 u = texture2D(uTex, UV);
    complex2 v = texture2D(vTex, UV);
    vec4 current;
    if (representation == DIRAC_REP)
        current = vec4(2.0*real(innerProd(u, matrixMul(SIGMA_X, v))),
                       2.0*real(innerProd(u, matrixMul(SIGMA_Y, v))),
                       2.0*real(innerProd(u, matrixMul(SIGMA_Z, v))),
                       dot(u, u) + dot(v, v));
    else
        current = vec4(
            -expectationValue(SIGMA_X, u) + expectationValue(SIGMA_X, v),
            -expectationValue(SIGMA_Y, u) + expectationValue(SIGMA_Y, v),
            -expectationValue(SIGMA_Z, u) + expectationValue(SIGMA_Z, v),
            dot(u, u) + dot(v, v));
    return current;
}

vec3 to3DTextureCoordinates(vec2 uv) {
    int width3D = texelDimensions3D[0];
    int height3D = texelDimensions3D[1];
    int length3D = texelDimensions3D[2];
    int width2D = texelDimensions2D[0];
    int height2D = texelDimensions2D[1];
    float wStack = float(width2D)/float(width3D);
    float hStack = float(height2D)/float(height3D);
    float u = mod(uv[0]*wStack, 1.0);
    float v = mod(uv[1]*hStack, 1.0);
    float w = (floor(uv[1]*hStack)*wStack
               + floor(uv[0]*wStack) + 0.5)/float(length3D);
    return vec3(u, v, w);
}

complex2 applyAbsorbingBoundaries(complex2 psi, complex2 psi01, complex2 psi23) {
    vec4 current = computeCurrent(psi01, psi23);
    vec3 coord = to3DTextureCoordinates(UV);
    float x = coord[0], y = coord[1], z = coord[2];
    float dampPot = 0.0;
    float s = 0.02;
    float a = absCoeff;
    dampPot += a*exp(-0.5*x*x/(s*s));
    dampPot += a*exp(-0.5*(x-1.0)*(x-1.0)/(s*s));
    dampPot += a*exp(-0.5*y*y/(s*s));
    dampPot += a*exp(-0.5*(y-1.0)*(y-1.0)/(s*s));
    dampPot += a*exp(-0.5*z*z/(s*s));
    dampPot += a*exp(-0.5*(z-1.0)*(z-1.0)/(s*s));
    float dimScale = float(texelDimensions3D[0])/64.0;
    return psi*exp(-dt*dimScale*dampPot/hbar);
}

void main() {

    // Wave function
    complex2 psi01 = texture2D(uTex, UV);
    complex2 psi23 = texture2D(vTex, UV);

    // 4-vector potential
    vec4 potential = texture2D(potentialTex, UV);

    // 3-vector potential
    vec3 vecPotential = vec3(potential[1], potential[2], potential[3]);

    float scalarPotential = potential[0];

    // Compute length of 3-vector potential
    float v = sqrt(dot(vecPotential, vecPotential));

    // Get eigenvectors of the Pauli matrix that is
    // orientated in the same direction as the 3-vector potential
    complex2 up = getSpinUpState(vecPotential, v);
    complex2 down = getSpinDownState(vecPotential, v);

    // Step the wave function using the 3-vector potential
    if (representation == DIRAC_REP) {
        complex c0 = (innerProd(up, psi01) + innerProd(up, psi23))/SQRT_2;
        complex c1 = (innerProd(down, psi01) - innerProd(down, psi23))/SQRT_2;
        complex c2 = (innerProd(down, psi01) + innerProd(down, psi23))/SQRT_2;
        complex c3 = (innerProd(up, psi01) - innerProd(up, psi23))/SQRT_2;
        complex eP = complex(cos(c*v*dt/hbar), sin(c*v*dt/hbar));
        complex eN = complex(cos(c*v*dt/hbar), -sin(c*v*dt/hbar));
        complex e0 = mul(c0, eP);
        complex e1 = mul(c1, eP);
        complex e2 = mul(c2, eN);
        complex e3 = mul(c3, eN);
        if (v >= 1e-10) {
            psi01 = c1C2(e0, up/SQRT_2) + c1C2(e1, down/SQRT_2)
                 + c1C2(e2, down/SQRT_2) + c1C2(e3, up/SQRT_2);
            psi23 = c1C2(e0, up/SQRT_2) + c1C2(e1, -down/SQRT_2)
                 + c1C2(e2, down/SQRT_2) + c1C2(e3, -up/SQRT_2);
        }
    } else {
        complex eP = complex(cos(c*v*dt/hbar), -sin(c*v*dt/hbar));
        complex eN = complex(cos(c*v*dt/hbar), sin(c*v*dt/hbar));
        complex c0 = innerProd(up, psi01);
        complex c1 = innerProd(down, psi01);
        complex e0 = mul(c0, eP);
        complex e1 = mul(c1, eP);
        complex c2 = innerProd(up, psi23);
        complex c3 = innerProd(down, psi23);
        complex e2 = mul(c2, eN);
        complex e3 = mul(c3, eN);
        if (v >= 1e-10) {
            psi01 = c1C2(e0, up) + c1C2(e1, down);
            psi23 = c1C2(e2, up) + c1C2(e3, down);
        }
    }

    // Step the wave function using the scalar potential
    float arg = -c*scalarPotential*dt/hbar;
    complex expV = complex(cos(arg), sin(arg));

    if (useAbsorbingBoundaries) {
        psi01 = applyAbsorbingBoundaries(psi01, psi01, psi23);
        psi23 = applyAbsorbingBoundaries(psi23, psi01, psi23);
    }

    fragColor = (spinorIndex == TOP)? c1C2(expV, psi01): c1C2(expV, psi23);
}
