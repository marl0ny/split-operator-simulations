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

uniform sampler2D uTex;
uniform sampler2D vTex;
uniform sampler2D potentialTex;
// uniform sampler2D imaginaryPotentialTex;

const int TOP = 0;
const int BOTTOM = 1;
uniform int spinorIndex;

const int DIRAC_REP = 0;
const int WEYL_REP = 1;
uniform int representation;

#define complex vec2
#define complex2 vec4

const float SQRT_2 = 1.4142135623730951;


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
void main() {

    // Wave function
    complex2 s01 = texture2D(uTex, UV);
    complex2 s23 = texture2D(vTex, UV);

    // 4-vector potential
    vec4 potential = texture2D(potentialTex, UV);

    // 3-vector potential
    vec3 vecPot = potential.xyz;
    float vx = vecPot.x, vy = vecPot.y, vz = vecPot.z;

    // Compute length of 3-vector potential
    float v = length(vecPot);

    // Get eigenvectors of the Pauli matrix that is
    // orientated in the same direction as the 3-vector potential
    complex2 up = getSpinUpState(vecPot, v);
    complex2 down = getSpinDownState(vecPot, v);

    // Step the wave function using the 3-vector potential
    if (representation == DIRAC_REP) {
        complex eP = complex(cos(c*v*dt/hbar), sin(c*v*dt/hbar));
        complex eN = complex(cos(c*v*dt/hbar), -sin(c*v*dt/hbar));
        complex c0 = (innerProd(up, s01) + innerProd(up, s23))/SQRT_2;
        complex c1 = (innerProd(down, s01) - innerProd(down, s23))/SQRT_2;
        complex c2 = (innerProd(down, s01) + innerProd(down, s23))/SQRT_2;
        complex c3 = (innerProd(up, s01) - innerProd(up, s23))/SQRT_2;
        complex e0 = mul(c0, eP);
        complex e1 = mul(c1, eP);
        complex e2 = mul(c2, eN);
        complex e3 = mul(c3, eN);
        if (v != 0.0) {
            s01 = c1C2(e0, up/SQRT_2) + c1C2(e1, down/SQRT_2)
                    + c1C2(e2, down/SQRT_2) + c1C2(e3, up/SQRT_2);
            s23 = c1C2(e0, up/SQRT_2) + c1C2(e1, -down/SQRT_2)
                    + c1C2(e2, down/SQRT_2) + c1C2(e3, -up/SQRT_2);
        }
    } else {
        complex eP = complex(cos(c*v*dt/hbar), -sin(c*v*dt/hbar));
        complex eN = complex(cos(c*v*dt/hbar), sin(c*v*dt/hbar));
        complex c0 = innerProd(up, s01);
        complex c1 = innerProd(down, s01);
        complex e0 = mul(c0, eP);
        complex e1 = mul(c1, eP);
        complex c2 = innerProd(up, s23);
        complex c3 = innerProd(down, s23);
        complex e2 = mul(c2, eN);
        complex e3 = mul(c3, eN);
        if (v != 0.0) {
            s01 = c1C2(e0, up) + c1C2(e1, down);
            s23 = c1C2(e2, up) + c1C2(e3, down);
        }
    }

    // Step the wave function using the scalar potential
    float arg = -c*potential.w*dt/hbar;
    complex expV = complex(cos(arg), sin(arg));

    fragColor = (spinorIndex == TOP)? c1C2(expV, s01): c1C2(expV, s23);
}
