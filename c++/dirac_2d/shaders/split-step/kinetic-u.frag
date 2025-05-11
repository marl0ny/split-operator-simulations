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
uniform bool isPropagatingForward;

// The following represents the first two complex components of the bispinor
// psi, where these two components require four real numbers in total, which
// is the max number of channels that a texture can support.
uniform sampler2D psiUpperTex;
// Last two components of psi.
uniform sampler2D psiLowerTex;

uniform float dt;
uniform float m;
uniform float c;
uniform float hbar;

uniform int spinorIndex;

const int DIRAC_REP = 0;
const int WEYL_REP = 1;
uniform int representation;

const bool FORWARD_PROP = true;
const bool BACKWARD_PROP = !FORWARD_PROP;
const bool SPIN_UP = true;
const bool SPIN_DOWN = !SPIN_UP;

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

complex expI(float angle) {
    return complex(cos(angle), sin(angle));
}

complex conj(complex z) {
    return vec2(z.x, -z.y);
}

complex innerProd(complex2 z1, complex2 z2) {
    return mul(conj(z1.rg), z2.rg) + mul(conj(z1.ba), z2.ba);
}

complex adjProd(complex2 z1, complex2 z2, complex2 w1, complex2 w2) {
    if (representation == DIRAC_REP)
        return innerProd(z1, w1) - innerProd(z2, w2);
    else if (representation == WEYL_REP)
        return innerProd(z2, w1) + innerProd(z1, w2);
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

/* Compute the 3-momentum that corresponds to the texture coordinates
 of the texel which this shader program is currently operating on. */
vec3 getMomentum(vec2 texCoord) {
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
        vec3 uvw = to3DTextureCoordinates(texCoord);
        u = uvw[0], v = uvw[1], w = uvw[2];
    } else {
        width = dimensions2D[0];
        height = dimensions2D[1];
        length_ = 1.0;
        texelWidth = texelDimensions2D[0];
        texelHeight = texelDimensions2D[1];
        texelLength = 0;
        u = texCoord[0], v = texCoord[1], w = 0.0;
    }
    float freqU = ((u < 0.5)? u: -1.0 + u)*float(texelWidth) - 0.5;
    float freqV = ((v < 0.5)? v: -1.0 + v)*float(texelHeight) - 0.5;
    float freqW = ((w < 0.5)? w: -1.0 + w)*float(texelLength) - 0.5;
    return vec3(2.0*PI*freqU/width, 2.0*PI*freqV/height, 
                2.0*PI*freqW/length_);
}

/* Get the spin up eigenvector corresponding to the given axis orientation.
 For computational efficiency reasons, the length of this axis axisLength
 is passed in as a parameter as well.*/
complex2 getSpinUpState(vec3 axis, float axisLength) {
    if (dot(axis.xy, axis.xy) == 0.0)
        return (axis.z >= 0.0)? 
            complex2(complex(1.0, 0.0), complex(0.0)):
            complex2(complex(0.0), complex(1.0, 0.0));
    return complex2(
        complex(axis.z + axisLength, 0.0),
        complex(axis.x, axis.y) 
    )/sqrt(2.0*axisLength*(axisLength + axis.z));
}

/* Get the spin down eigenvector corresponding to the given axis orientation.
 For computational efficiency reasons, the length of this axis axisLength
 is passed in as a parameter as well.*/
complex2 getSpinDownState(vec3 axis, float axisLength) {
    if (dot(axis.xy, axis.xy) == 0.0)
        return (axis.z >= 0.0)? 
            complex2(complex(0.0), complex(1.0, 0.0)):
            complex2(complex(1.0, 0.0), complex(0.0));
    return complex2(
        complex(axis.z - axisLength, 0.0),
        complex(axis.x, axis.y) 
    )/sqrt(2.0*axisLength*(axisLength - axis.z));
}

complex2 getWeylRepresentationEigenvector(
    int spinorIndex, bool isPositiveE, bool isSpinUp, vec3 p) {
    bool isNegativeE = !isPositiveE, isSpinDown = !isSpinUp;
    float E = sqrt(m*m*c*c*c*c + c*c*dot(p, p));
    float absP = length(p);
    complex2 spin = (isSpinUp)? 
        getSpinUpState(p, absP): getSpinDownState(p, absP);
    float c0, c1;
    if (absP == 0.0) {
        c0 = 1.0/sqrt(2.0), c1 = ((isPositiveE)? 1.0: -1.0)/sqrt(2.0);
        return (spinorIndex == 0)? c0*spin: c1*spin;
    } else {
        if (isSpinUp && isPositiveE) {
            c0 = sqrt(E - c*absP);
            c1 = sqrt(E + c*absP);
        } else if (isSpinDown && isPositiveE) {
            c0 = sqrt(E + c*absP);
            c1 = sqrt(E - c*absP);
        } else if (isSpinUp && isNegativeE) {
            c0 = -sqrt(E + c*absP);
            c1 = sqrt(E - c*absP);
        } else if (isSpinDown && isNegativeE) {
            c0 = -sqrt(E - c*absP);
            c1 = sqrt(E + c*absP);
        }
        return ((spinorIndex == 0)? c0*spin: c1*spin)/sqrt(2.0*E);
    }   
}

complex2 getDiracRepresentationEigenvector(
    int spinorIndex, bool isForwardProp, bool isSpinUp, vec3 p) {
    bool isBackwardProp = !isForwardProp, isSpinDown = !isSpinUp;
    float E = c*sqrt(m*m*c*c + dot(p, p));
    float absP = length(p);
    complex2 spin = (isSpinUp)? 
        getSpinUpState(p, absP): getSpinDownState(p, absP);
    float c0, c1;
    if (absP == 0.0) {
        c0 = (isForwardProp)? 1.0: 0.0;
        c1 = (isBackwardProp)? 0.0: 1.0; 
        return (spinorIndex == 0)? c0*spin: c1*spin;
    } else {
        if (isSpinUp && isForwardProp) {
            c0 = 1.0;
            c1 = c*absP/(m*c*c + E);
        } else if (isSpinDown && isForwardProp) {
            c0 = 1.0;
            c1 = -c*absP/(m*c*c + E);
        } else if (isSpinUp && isBackwardProp) {
            c0 = c*absP/(m*c*c + E);
            c1 = 1.0;
        } else if (isSpinDown && isBackwardProp) {
            c0 = -c*absP/(m*c*c + E);
            c1 = 1.0;
        }
        return sqrt((m*c*c + E)/(2.0*E))
            *((spinorIndex == 0)? c0*spin: c1*spin);
    }
}

/* Get the eigenvectors of the kinetic energy matrix in
momentum space. For a free particle this is the same as
the eigenvectors of the momentum space Hamiltonian. */
complex2 getEigenvector(
    int spinorIndex, bool isForwardProp, bool isSpinUp, vec3 p
) {
    if (representation == DIRAC_REP)
        return getDiracRepresentationEigenvector(
            spinorIndex, isForwardProp, isSpinUp, p);
    else if (representation == WEYL_REP)
        return getWeylRepresentationEigenvector(
            spinorIndex, isForwardProp, isSpinUp, p);
}

void main() {

    // Compute the 3-momentum from the texture coordinates UV that this
    // shader program is currently using.
    vec3 p = getMomentum(UV);
    // Get the energy as a function of the 3-momentum.
    float E = sqrt(m*m*c*c*c*c + c*c*dot(p, p));

    // Get each bispinor component of the wave function.
    complex2 psi0 = texture2D(psiUpperTex, UV);
    complex2 psi1 = texture2D(psiLowerTex, UV);

    if (isPropagatingForward) {

        // Declare then define the eigenvectors of the kinetic energy matrix
        // in momentum space.
        complex2 uUp0, uUp1;  // Spin up w.r.t. momentum axis
        complex2 uDown0, uDown1; // Spin down "    "
        uUp0 = getEigenvector(0, FORWARD_PROP, SPIN_UP, p),
        uUp1 = getEigenvector(1, FORWARD_PROP, SPIN_UP, p);
        uDown0 = getEigenvector(0, FORWARD_PROP, SPIN_DOWN, p),
        uDown1 = getEigenvector(1, FORWARD_PROP, SPIN_DOWN, p);

        // Express the wave function in terms of the eigenvectors of
        // the kinetic energy matrix.
        complex psiUUp = adjProd(uUp0, uUp1, psi0, psi1)*E/(m*c*c);
        complex psiUDown = adjProd(uDown0, uDown1, psi0, psi1)*E/(m*c*c);

        // Time evolve the wave function using the energy eigenvalues
        // of the kinetic energy matrix.
        psiUUp = mul(expI(-E*dt/hbar), psiUUp);
        psiUDown = mul(expI(-E*dt/hbar), psiUDown);

        // Transform this part of the wave function back to its initial
        // representation.
        psi0 = c1C2(psiUUp, uUp0) + c1C2(psiUDown, uDown0);
        psi1 = c1C2(psiUUp, uUp1) + c1C2(psiUDown, uDown1);

    } else {

        complex2 nuUp0, nuUp1;  // Backward propagating, spin up "   "
        complex2 nuDown0, nuDown1;  // Backward propagating, spin down "   "
        nuUp0 = getEigenvector(0, BACKWARD_PROP, SPIN_UP, p),
        nuUp1 = getEigenvector(1, BACKWARD_PROP, SPIN_UP, p);
        nuDown0 = getEigenvector(0, BACKWARD_PROP, SPIN_DOWN, p),
        nuDown1 = getEigenvector(1, BACKWARD_PROP, SPIN_DOWN, p);

        // float normVal = sqrt(dot(psi0, psi0) + dot(psi1, psi1));
        complex psiNuUp = 0.5*adjProd(nuUp0, nuUp1, psi0, psi1)*E/(m*c*c);
        complex psiNuDown = 0.5*adjProd(nuDown0, nuDown1, psi0, psi1)*E/(m*c*c);
        // float normVal2 = 

        psiNuUp = complex(0.0); // mul(expI(E*dt/hbar), psiNuUp);
        psiNuDown = complex(0.0); // mul(expI(E*dt/hbar), psiNuDown);

        // Transform this part of the wave function back to its initial
        // representation.
        psi0 = c1C2(psiNuUp, nuUp0) + c1C2(psiNuDown, nuDown0);
        psi1 = c1C2(psiNuUp, nuUp1) + c1C2(psiNuDown, nuDown1);
    }

    fragColor = (spinorIndex == 0)? psi0: psi1;
}
