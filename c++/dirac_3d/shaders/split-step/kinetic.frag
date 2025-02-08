/* The Dirac equation using an arbitrary four-vector potential and
with constants like c and hbar explicitly written out can be found
on pg 566 (eq. 20.2.2) of Principles of Quantum Mechanics by Shankar.

 The Split Operator momentum space propagator for the Dirac equation 
 in the Dirac representation is derived in II.3 of this article
 by Bauke and Keitel: https://arxiv.org/abs/1012.3911.
 To derive the momentum space propagator in the Weyl representation,
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

uniform int numberOfDimensions;
uniform ivec2 texelDimensions2D;
uniform vec2 dimensions2D;
uniform ivec3 texelDimensions3D;
uniform vec3 dimensions3D;

uniform sampler2D uTex;
uniform sampler2D vTex;
uniform float dt;
uniform float m;
uniform float c;
uniform float hbar;

uniform int spinorIndex;
const int TOP = 0;
const int BOTTOM = 1;

const int DIRAC_REP = 0;
const int WEYL_REP = 1;
uniform int representation;

#define complex vec2
#define complex2 vec4

const float PI = 3.141592653589793;


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

complex mul(complex z1, complex z2) {
    return complex(z1.x*z2.x - z1.y*z2.y, 
                   z1.x*z2.y + z1.y*z2.x);
}

complex conj(complex z) {
    return vec2(z.x, -z.y);
}

complex innerProd(complex2 z1, complex2 z2) {
    return mul(conj(z1.rg), z2.rg) + mul(conj(z1.ba), z2.ba);
}

/* Multiply a complex scalar c1 with a two-component complex vector c2.*/
complex2 c1C2(complex c1, complex2 c2) {
    complex a = complex(c2[0], c2[1]);
    complex b = complex(c2[2], c2[3]);
    return complex2(complex(c1.x*a.x - c1.y*a.y, c1.x*a.y + c1.y*a.x),
                    complex(c1.x*b.x - c1.y*b.y, c1.x*b.y + c1.y*b.x));
}


complex frac(complex z1, complex z2) {
    complex invZ2 = conj(z2)/(z2.x*z2.x + z2.y*z2.y);
    return mul(z1, invZ2);
}

vec3 getMomentum() {
    float u, v, w;
    float width, height, length_;
    int texelWidth, texelHeight, texelLength;
    if (numberOfDimensions == 3) {
        width = dimensions3D[0];
        height = dimensions3D[1];
        length_ = dimensions3D[2];
        texelWidth = texelDimensions3D[0];
        texelHeight = texelDimensions3D[1];
        texelLength = texelDimensions3D[2];
        vec3 uvw = to3DTextureCoordinates(UV);
        u = uvw[0], v = uvw[1], w = uvw[2];
    } else {
        width = dimensions2D[0];
        height = dimensions2D[1];
        length_ = 0.0;
        texelWidth = texelDimensions2D[0];
        texelHeight = texelDimensions2D[1];
        texelLength = 0;
        u = UV[0], v = UV[1], w = 0.0;
    }
    float freqU = ((u < 0.5)? u: -1.0 + u)*float(texelWidth) - 0.5;
    float freqV = ((v < 0.5)? v: -1.0 + v)*float(texelHeight) - 0.5;
    float freqW = ((w < 0.5)? w: -1.0 + w)*float(texelLength) - 0.5;
    return vec3(2.0*PI*freqU/width, 2.0*PI*freqV/height, 
                2.0*PI*freqW/length_);
}

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

void main() {

    vec3 pVec = getMomentum();
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

    vec2 vUp0, vUp1, vDown0, vDown1;
    // These will be used to compute the actual corresponding eigenvectors
    // of the eigenvalues declared previously.

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

    // Get each bispinor component of the wave function
    complex2 psi0 = texture2D(uTex, UV);
    complex2 psi1 = texture2D(vTex, UV);

    // Using the eigenvectors of the kinetic energy matrix
    // for the given momenta, express the wave function in terms
    // of it.
    complex d0 = innerProd(v00, psi0) + innerProd(v01, psi1);
    complex d1 = innerProd(v10, psi0) + innerProd(v11, psi1);
    complex d2 = innerProd(v20, psi0) + innerProd(v21, psi1);
    complex d3 = innerProd(v30, psi0) + innerProd(v31, psi1);

    // Advance the wave function in time
    d0 = mul(complex(cos(e0*c*dt/hbar), -sin(e0*c*dt/hbar)), d0);
    d1 = mul(complex(cos(e1*c*dt/hbar), -sin(e1*c*dt/hbar)), d1);
    d2 = mul(complex(cos(e2*c*dt/hbar), -sin(e2*c*dt/hbar)), d2);
    d3 = mul(complex(cos(e3*c*dt/hbar), -sin(e3*c*dt/hbar)), d3); 

    // Transform the wave function back to its initial representation
    psi0 = c1C2(d0, v00) + c1C2(d1, v10) + c1C2(d2, v20) + c1C2(d3, v30);
    psi1 = c1C2(d0, v01) + c1C2(d1, v11) + c1C2(d2, v21) + c1C2(d3, v31);

    fragColor = (spinorIndex == TOP)? psi0: psi1;

}

