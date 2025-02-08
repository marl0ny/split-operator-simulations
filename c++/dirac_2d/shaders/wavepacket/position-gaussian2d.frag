/* Generate a new wavepacket. */
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

#define complex vec2
#define complex2 vec4

#define PI 3.141592653589793

// wave number of the wave packet (w.r.t. simulation domains)
uniform vec2 waveNumber;
// Position offset of the wave packet in texture coordinates
uniform vec2 offsetTexCoord;
// Amplitude of the wave packet
uniform float amplitude;
// Standard deviation of the wave packet, in texture coordinates
uniform vec2 sigmaTexCoord;
uniform complex2 spinor;

uniform bool useEnergyStatesCombinations;
uniform vec3 momentum;
uniform vec2 dimensions2D;
uniform ivec2 texelDimensions2D;
uniform int spinorIndex;
uniform int representation;
uniform complex c0;
uniform complex c1;
uniform complex c2;
uniform complex c3;
uniform float m;
uniform float c;
const int TOP = 0;
const int BOTTOM = 1;
const int DIRAC_REP = 0;
const int WEYL_REP = 1;

complex conj(complex z) {
    return complex(z.x, -z.y);
}

complex2 conj(complex2 z) {
    return complex2(conj(z.rg), conj(z.ba));
}

complex mul(complex a, complex b) {
    return complex(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
}

/* Multiply a complex scalar c1 with a two-component complex vector c2.*/
complex2 c1C2(complex c1, complex2 c2) {
    complex a = complex(c2[0], c2[1]);
    complex b = complex(c2[2], c2[3]);
    return complex2(complex(c1.x*a.x - c1.y*a.y, c1.x*a.y + c1.y*a.x),
                    complex(c1.x*b.x - c1.y*b.y, c1.x*b.y + c1.y*b.x));
}

complex2 innerProd(complex2 a, complex2 b) {
    return complex2(mul(conj(a.xy), b.xy), mul(conj(a.zw), b.zw));
}

complex frac(complex z1, complex z2) {
    complex invZ2 = conj(z2)/(z2.x*z2.x + z2.y*z2.y);
    return mul(z1, invZ2);
}

complex wavepacket(vec2 r) {
    float sx = sigmaTexCoord.x;
    float sy = sigmaTexCoord.y;
    float gx = exp(-0.25*pow(r.x/sx, 2.0))/sqrt(sx*sqrt(2.0*PI));
    float gy = exp(-0.25*pow(r.y/sy, 2.0))/sqrt(sy*sqrt(2.0*PI));
    float g = gx*gy;
    float nx = waveNumber.x;
    float ny = waveNumber.y;
    complex phase = complex(cos(2.0*PI*(nx*r.x + ny*r.y)),
                            sin(2.0*PI*(nx*r.x + ny*r.y)));
    return amplitude*g*phase;
}


//////////////////////////////////////////////////////////////////////////////

/* Compute the spin up eigenvector for a Pauli matrix oriented in an
arbitrary direction. Although easily accomplishable by pencil and paper,
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
complex2 getSpinUpState(vec3 orientation, float len) {
    float n = len;
    float nx = orientation.x, ny = orientation.y, nz = orientation.z;
    complex az = complex(1.0, 0.0);
    complex bz = complex(0.0, 0.0);
    complex a = frac(complex(n + nz, 0.0),
                     complex(nx, ny)*sqrt((nz + n)*(nz + n)/(nx*nx + ny*ny)
                                          + 1.0));
    complex b = complex(1.0/sqrt((nz + n)*(nz + n)/(nx*nx + ny*ny) + 1.0),
                        0.0);
    if ((nx*nx + ny*ny) == 0.0)
        return complex2(az, bz);
    return complex2(a, b);
}

/*Compute the spin down eigenvector for a Pauli matrix oriented in an
arbitrary direction. See documentation for getSpinUpState for more 
information.*/
complex2 getSpinDownState(vec3 orientation, float len) {
    float n = len;
    float nx = orientation.x, ny = orientation.y, nz = orientation.z;
    complex az = complex(0.0, 0.0);
    complex bz = complex(1.0, 0.0);
    complex a = frac(complex(-n + nz, 0.0),
                     complex(nx, ny)*sqrt((nz - n)*(nz - n)/(nx*nx + ny*ny)
                                          + 1.0));
    complex b = complex(1.0/sqrt((nz - n)*(nz - n)/(nx*nx + ny*ny) + 1.0),
                        0.0);
    if ((nx*nx + ny*ny) == 0.0)
        return complex2(az, bz);
    return complex2(a, b);
}

float pow2(float val) {
    return val*val;
} 

/*
Find the eigenvalues of a real symmetric 2x2 matrix.
The argument i indexes which eigenvalue to get, 
while d0 and d1 denote the top and bottom diagonal elements respectively.
The variable nd corresponds to the non-diagonal element.

It is assumed that the eigenvalues of the matrix is purely real,
which implies that 
    d0*d0 - 2*d0*d1 + d1*d1 + 4*nd*nd > 0.

The eigenvalues and eigenvectors are found using Python
with [Sympy](https://www.sympy.org/en/index.html):

>>> from sympy import Matrix
>>> from sympy import Symbol
>>> d0 = Symbol('d0', real=True)
>>> d1 = Symbol('d1', real=True)
>>> nd = Symbol('nd', real=True)
>>> mat = Matrix([[d0, nd], [nd, d1]])
>>> mat_eigenvects = mat.eigenvects()
>>> for eig_info in mat_eigenvects:
>>>     eigval, degeneracy, eigvects = eig_info
>>>     print('Eigenvalue: ', eigval, '\nDegeneracy: ', degeneracy)
>>>     for eigvect in eigvects:
>>>         eigvect_normalized = eigvect/eigvect.norm()
>>>         eigvect_normalized.simplify()
>>>         print(eigvect_normalized)
>>>         print()

*/
float eigenvalueRealSymmetric2x2(int i, float d0, float d1, float nd) {
    if (nd == 0.0)
        return (i == 0)? d0: d1;
    if (i == 0)
        return d0/2.0 + d1/2.0
                 - sqrt(d0*d0 - 2.0*d0*d1 + d1*d1 + 4.0*nd*nd)/2.0;
    else
        return d0/2.0 + d1/2.0 
                 + sqrt(d0*d0 - 2.0*d0*d1 + d1*d1 + 4.0*nd*nd)/2.0;
}

/*
Find the eigenvectors of a real symmetric 2x2 matrix.
The argument i indexes which eigenvector to get, 
while d0 and d1 denote the top and bottom diagonal elements respectively.
The variable nd corresponds to the non-diagonal element.

It is assumed that the eigenvalues of the matrix is purely real,
which implies that 
    d0*d0 - 2*d0*d1 + d1*d1 + 4*nd*nd > 0.

The eigenvalues and eigenvectors are found using Python
with [Sympy](https://www.sympy.org/en/index.html):

>>> from sympy import Matrix
>>> from sympy import Symbol
>>> d0 = Symbol('d0', real=True)
>>> d1 = Symbol('d1', real=True)
>>> nd = Symbol('nd', real=True)
>>> mat = Matrix([[d0, nd], [nd, d1]])
>>> mat_eigenvects = mat.eigenvects()
>>> for eig_info in mat_eigenvects:
>>>     eigval, degeneracy, eigvects = eig_info
>>>     print('Eigenvalue: ', eigval, '\nDegeneracy: ', degeneracy)
>>>     for eigvect in eigvects:
>>>         eigvect_normalized = eigvect/eigvect.norm()
>>>         eigvect_normalized.simplify()
>>>         print(eigvect_normalized)
>>>         print()

*/
vec2 eigenvectorRealSymmetric2x2(int i, float d0, float d1, float nd) {
    if (nd == 0.0)
        return (i == 0)? vec2(1.0, 0.0): vec2(0.0, 1.0);
    if (i == 0)
        return vec2(
            (d0 - d1 - sqrt(d0*d0 - 2.0*d0*d1 + d1*d1 + 4.0*nd*nd))
             / (nd*sqrt(pow2((-d0 + d1
                              + sqrt(d0*d0 - 2.0*d0*d1 + d1*d1 + 4.0*nd*nd)
                             )/nd
                            ) + 4.0
                        )
                ),
            2.0/sqrt(pow2((-d0 + d1
                           + sqrt(d0*d0 - 2.0*d0*d1 + d1*d1 + 4.0*nd*nd)
                          )/nd
                          ) + 4.0)
        );
    else
        return vec2(
            (d0 - d1 + sqrt(d0*d0 - 2.0*d0*d1 + d1*d1 + 4.0*nd*nd))
             / (nd*sqrt(pow2((d0 - d1 
                              + sqrt(d0*d0 - 2.0*d0*d1 + d1*d1 + 4.0*nd*nd)
                             )/nd
                            ) + 4.0
                        )
                ),
            2.0/sqrt(pow2((d0 - d1
                           + sqrt(d0*d0 - 2.0*d0*d1 + d1*d1 + 4.0*nd*nd)
                          )/nd
                          ) + 4.0)
        );
}

complex2 getEnergyStatesCombinations() {
    vec3 pVec = momentum;
    float px = pVec.x, py = pVec.y, pz = pVec.z;
    float p2 = px*px + py*py + pz*pz;
    float p = sqrt(p2);
    float mc = m*c;
    // Get the eigenvectors of that Pauli matrix that is
    // orientated in the same direction as the momentum
    complex2 up = getSpinUpState(pVec, p);
    complex2 down = getSpinDownState(pVec, p);
    // Scaled eigenvalues of the kinetic energy matrix for the given momenta.
    float e0, e1, e2, e3;
    // These will be used to compute the actual corresponding eigenvectors
    // of the eigenvalues declared previously.
    vec2 vUp0, vUp1, vDown0, vDown1;
    if (representation == DIRAC_REP) {
        // Suggestion: note that for the second and third arguments 
        // of the function eigenvalueRealSymmetric2x2, d0 and d1,
        // the relation d0 + d1 = 0 always holds for this system.
        // Use this to do some further simplifications to the problem
        // at hand.
        e0 = eigenvalueRealSymmetric2x2(0, mc, -mc, p);
        vUp0 = eigenvectorRealSymmetric2x2(0, mc, -mc, p);
        e1 = eigenvalueRealSymmetric2x2(1, mc, -mc, p);
        vUp1 = eigenvectorRealSymmetric2x2(1, mc, -mc, p);
        e2 = eigenvalueRealSymmetric2x2(0, mc, -mc, -p);
        vDown0 = eigenvectorRealSymmetric2x2(0, mc, -mc, -p);
        e3 = eigenvalueRealSymmetric2x2(1, mc, -mc, -p);
        vDown1 = eigenvectorRealSymmetric2x2(1, mc, -mc, -p);
    } else if (representation == WEYL_REP) {
        e0 = eigenvalueRealSymmetric2x2(0, -p, p, mc);
        vUp0 = eigenvectorRealSymmetric2x2(0, -p, p, mc);
        e1 = eigenvalueRealSymmetric2x2(1, -p, p, mc);
        vUp1 = eigenvectorRealSymmetric2x2(1, -p, p, mc);
        e2 = eigenvalueRealSymmetric2x2(0, p, -p, mc);
        vDown0 = eigenvectorRealSymmetric2x2(0, p, -p, mc);
        e3 = eigenvalueRealSymmetric2x2(1, p, -p, mc);
        vDown1 = eigenvectorRealSymmetric2x2(1, p, -p, mc);
    }
    // Compute the eigenvectors of the kinetic energy matrix for
    // the given momentum.
    // Note that v00 denotes the first 2 components of the v0 eigenvector,
    // and v01 the last two. Likewise v1 is split into v10 and v11,
    // v2 into v20 and v21, and v3 into v30 and v31.
    complex2 v00 = vUp0[0]*up,     v01 = vUp0[1]*up; 
    complex2 v10 = vUp1[0]*up,     v11 = vUp1[1]*up;
    complex2 v20 = vDown0[0]*down, v21 = vDown0[1]*down;
    complex2 v30 = vDown1[0]*down, v31 = vDown1[1]*down;
    complex2 psi0 
        = c1C2(c0, v00) + c1C2(c1, v10) + c1C2(c2, v20) + c1C2(c3, v30);
    complex2 psi1
        = c1C2(c0, v01) + c1C2(c1, v11) + c1C2(c2, v21) + c1C2(c3, v31);
    return (spinorIndex == TOP)? psi0: psi1;
}

//////////////////////////////////////////////////////////////////////////////


void main() {
    float x = UV.x;
    float y = UV.y;
    float x0 = offsetTexCoord.x;
    float y0 = offsetTexCoord.y;
    vec2 r = vec2(x - x0, y - y0);
    complex w = wavepacket(r)
        + wavepacket(vec2(r.x + 1.0, r.y)) 
        + wavepacket(vec2(r.x - 1.0, r.y)) 
        + wavepacket(vec2(r.x, r.y + 1.0))
        + wavepacket(vec2(r.x, r.y - 1.0))
        + wavepacket(vec2(r.x - 1.0, r.y - 1.0))
        + wavepacket(vec2(r.x + 1.0, r.y + 1.0))
        + wavepacket(vec2(r.x + 1.0, r.y - 1.0))
        + wavepacket(vec2(r.x - 1.0, r.y + 1.0));
    if (!useEnergyStatesCombinations) {
        fragColor = c1C2(w, spinor);
    } else {
        complex2 spinor2 = getEnergyStatesCombinations();
        fragColor = c1C2(w, spinor2);
    }
}
