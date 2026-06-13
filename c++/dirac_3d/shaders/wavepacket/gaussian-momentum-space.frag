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

// Amplitude of the wave packet
uniform float amplitude;
// Standard deviation of the wave packet
uniform vec3 sigma;
// Average momentum of the wave packet
uniform vec3 p0;
// wave packet's average position
uniform vec3 x0;
uniform complex2 spinor;
uniform bool useEnergyStatesCombinations;
uniform bool invertNegativeEnergyMomentum;
uniform vec3 dimensions3D;
uniform ivec2 texelDimensions2D;
uniform ivec3 texelDimensions3D;
uniform int spinorIndex;
uniform int representation;
uniform complex coefficient0;
uniform complex coefficient1;
uniform complex coefficient2;
uniform complex coefficient3;
uniform float m;
uniform float c;
uniform float hbar;
const int TOP = 0;
const int BOTTOM = 1;
const int DIRAC_REP = 0;
const int WEYL_REP = 1;


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

complex wavepacket(vec3 p, vec3 x0) {
    float sx = sigma.x;
    float sy = sigma.y;
    float sz = sigma.z;
    float gx = exp(-pow(p.x*sx/hbar, 2.0))/sqrt(PI*hbar/sx);
    float gy = exp(-pow(p.y*sy/hbar, 2.0))/sqrt(PI*hbar/sy);
    float gz = exp(-pow(p.z*sz/hbar, 2.0))/sqrt(PI*hbar/sz);
    float g = gx*gy*gz;
    complex phase = complex(cos(dot(p, x0)), -sin(dot(p, x0)));
    return amplitude*g*phase
        *float(texelDimensions3D[0])
        *float(texelDimensions3D[1])
        *float(texelDimensions3D[2]);
}



//////////////////////////////////////////////////////////////////////////////

vec3 getMomentum() {
    float u, v, w;
    float width, height, length_;
    int texelWidth, texelHeight, texelLength;
    width = dimensions3D[0];
    height = dimensions3D[1];
    length_ = dimensions3D[2];
    texelWidth = texelDimensions3D[0];
    texelHeight = texelDimensions3D[1];
    texelLength = texelDimensions3D[2];
    vec3 uvw = to3DTextureCoordinates(UV);
    u = uvw[0], v = uvw[1], w = uvw[2];
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

/*Compute the spin down eigenvector for a Pauli matrix oriented in an
arbitrary direction. See documentation for getSpinUpState for more 
information.*/
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

complex2 eigenvectorDiracRep(
    int spinorIndex, bool isPositiveE, bool isSpinUp, vec3 p) {
    bool isNegativeE = !isPositiveE, isSpinDown = !isSpinUp;
    float E = sqrt(m*m*c*c*c*c + c*c*dot(p, p));
    float absP = length(p);
    complex2 spin = (isSpinUp)? 
        getSpinUpState(p, absP): getSpinDownState(p, absP);
    float c0, c1;
    if (absP == 0.0) {
        c0 = (isPositiveE)? 1.0: 0.0;
        c1 = (isNegativeE)? 0.0: 1.0; 
        return (spinorIndex == 0)? c0*spin: c1*spin;
    } else {
        if (isSpinUp && isPositiveE) {
            c0 = 1.0;
            c1 = c*absP/(m*c*c + E);
        } else if (isSpinDown && isPositiveE) {
            c0 = 1.0;
            c1 = -c*absP/(m*c*c + E);
        } else if (isSpinUp && isNegativeE) {
            c0 = -c*absP/(m*c*c + E);
            c1 = 1.0;
        } else if (isSpinDown && isNegativeE) {
            c0 = c*absP/(m*c*c + E);
            c1 = 1.0;
        }
        return sqrt((m*c*c + E)/(2.0*E))
            *((spinorIndex == 0)? c0*spin: c1*spin);
    }
}

complex2 getEnergyStatesCombinationsDiracRep(
    vec3 p, complex c0, complex c1, complex c2, complex c3) {
    complex2 psi0 = 
          c1C2(c0, eigenvectorDiracRep(0, false, true, p))
        + c1C2(c1, eigenvectorDiracRep(0, true, true, p))
        + c1C2(c2, eigenvectorDiracRep(0, false, false, p))
        + c1C2(c3, eigenvectorDiracRep(0, true, false, p));
    complex2 psi1 = 
          c1C2(c0, eigenvectorDiracRep(1, false, true, p))
        + c1C2(c1, eigenvectorDiracRep(1, true, true, p))
        + c1C2(c2, eigenvectorDiracRep(1, false, false, p)) 
        + c1C2(c3, eigenvectorDiracRep(1, true, false, p));
    return (spinorIndex == TOP)? psi0: psi1;

}

complex2 getEnergyStatesCombinations(
    vec3 pVector, float pSquared,
    complex c0, complex c1, complex c2, complex c3) {
    if (representation == DIRAC_REP)
        return getEnergyStatesCombinationsDiracRep(
            pVector, c0, c1, c2, c3);
    float px = pVector.x, py = pVector.y, pz = pVector.z;
    float p2 = pSquared;
    float p = sqrt(p2);
    float mc = m*c;
    // Get the eigenvectors of that Pauli matrix that is
    // orientated in the same direction as the momentum
    complex2 up = getSpinUpState(pVector, p);
    complex2 down = getSpinDownState(pVector, p);
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
    if (useEnergyStatesCombinations) {
        vec3 pVector = getMomentum();
        float pSquared = dot(pVector, pVector);
        complex2 spinorPosNeg = getEnergyStatesCombinations(
            pVector, pSquared,
            coefficient0, coefficient1, coefficient2, coefficient3);
        complex2 spinorPos = getEnergyStatesCombinations(
            pVector, pSquared,
            complex(0.0), coefficient1, complex(0.0), coefficient3);
        complex2 spinorNeg = getEnergyStatesCombinations(
            pVector, pSquared,
            coefficient0, complex(0.0), coefficient2, complex(0.0));
        if (invertNegativeEnergyMomentum)
            fragColor = c1C2(wavepacket(pVector - p0, x0), spinorPos) 
                        + c1C2(wavepacket(pVector + p0, x0), spinorNeg);
        else
            fragColor = c1C2(wavepacket(pVector - p0, x0), spinorPosNeg);
    } else {
        vec3 p = getMomentum() - p0;
        complex w = wavepacket(p, x0);
        fragColor = c1C2(w, spinor);
    }
}



