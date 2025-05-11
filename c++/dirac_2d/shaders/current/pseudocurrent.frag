/* (3.73) on pg. 50 of an An Introduction to Quantum Field Theory
 by Michael Peskin and Daniel Schoeder gives the formula for
 computing the current and pseudocurrent. These are computed with just the
 spinor field and the gamma matrices, where the first four gamma matrices 
 in the Weyl representation are given on (3.25) in pg. 41, the formula
 for obtaining the fifth is given on (3.68) on pg. 50, and its elements
 are explicitly given in (3.72) in the same page.
 For the gamma matrices in the Dirac representation, this is obtained from
 the alpha matrices and beta matrix as presented in 20.1.12 on
 pg 565 of Principles of Quantum Mechanics by Shankar. 
 For computing the elements of \gamma^{5} in the Dirac representation,
 the involutory property of the Pauli matrix are used which are given in 
 the Pauli matrices Wikipedia page.
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

/* The type hermitian2x2 corresponds to a 2x2 Hermitian matrix.
The first two components are the diagonals.
The last two components store the complex off-diagonal element
that's in the first row.*/
#define hermitian2x2 vec4

#define complex vec2
#define complex2 vec4

uniform hermitian2x2 sigmaX;
uniform hermitian2x2 sigmaY;
uniform hermitian2x2 sigmaZ;
uniform sampler2D psiUpperTex;
uniform sampler2D psiLowerTex;


const int DIRAC_REP = 0;
const int WEYL_REP = 1;
uniform int representation;

float real(complex z) {
    return z[0];
}

float imag(complex z) {
    return z[1];
}

complex conj(complex z) {
    return complex(z[0], -z[1]);
}

complex mul(complex w, complex z) {
    return complex(w[0]*z[0] - w[1]*z[1], w[0]*z[1] + w[1]*z[0]);
}

complex innerProd(complex2 w, complex2 z) {
    return mul(conj(w.rg), z.rg) + mul(conj(w.ba), z.ba);
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

complex2 matrixMul(int index,
                   hermitian2x2 m00, hermitian2x2 m01, complex2 v0,
                   hermitian2x2 m10, hermitian2x2 m11, complex2 v1) {
    if (index == 0)
        return matrixMul(m00, v0) + matrixMul(m01, v1);
    else
        return matrixMul(m10, v0) + matrixMul(m11, v1);
}

complex diracProd(complex2 psi0, complex2 psi1, 
                  complex2 phi0, complex2 phi1) {
    if (representation == DIRAC_REP)
        return innerProd(psi0, phi0) - innerProd(psi1, phi1);
    else
        return innerProd(psi1, phi0) + innerProd(psi0, phi1);
}

vec4 computePseudoCurrentDiracRep(complex2 psi0, complex2 psi1) {
    hermitian2x2 zeros = hermitian2x2(0.0);
    hermitian2x2 id = hermitian2x2(1.0, 1.0, complex(0.0));
    complex2 gamma5Psi0 = matrixMul(0, 
        zeros, id, psi0, 
        id, zeros, psi1);
    complex2 gamma5Psi1 = matrixMul(1, 
        zeros, id, psi0, 
        id, zeros, psi1);
    vec4 pseudoCurrent;
    pseudoCurrent.x = diracProd(psi0, psi1,
        matrixMul(0, 
            zeros, sigmaX, gamma5Psi0, 
            -sigmaX, zeros, gamma5Psi1),
        matrixMul(1, 
            zeros, sigmaX, gamma5Psi0, 
            -sigmaX, zeros, gamma5Psi1)).r;
    pseudoCurrent.y = diracProd(psi0, psi1,
        matrixMul(0, 
            zeros, sigmaY, gamma5Psi0, 
            -sigmaY, zeros, gamma5Psi1),
        matrixMul(1, 
            zeros, sigmaY, gamma5Psi0, 
            -sigmaY, zeros, gamma5Psi1)).r;
    pseudoCurrent.z = diracProd(psi0, psi1,
        matrixMul(0,
            zeros, sigmaZ, gamma5Psi0,
            -sigmaZ, zeros, gamma5Psi1),
        matrixMul(1,
            zeros, sigmaZ, gamma5Psi0,
            -sigmaZ, zeros, gamma5Psi1)).r;
    pseudoCurrent.w = diracProd(psi0, psi1,
        matrixMul(0,
            id, zeros, gamma5Psi0, 
            zeros, -id, gamma5Psi1),
        matrixMul(1, 
            id, zeros, gamma5Psi0, 
            zeros, -id, gamma5Psi1)).r;
    return pseudoCurrent;
}

vec4 computePseudoCurrentWeylRep(complex2 psi0, complex2 psi1) {
    hermitian2x2 zeros = hermitian2x2(0.0);
    hermitian2x2 id = hermitian2x2(1.0, 1.0, complex(0.0));
    complex2 gamma5Psi0 = matrixMul(0, 
        -id, zeros, psi0, 
        zeros, id, psi1);
    complex2 gamma5Psi1 = matrixMul(1, 
        -id, zeros, psi0, 
        zeros, id, psi1);
    vec4 pseudoCurrent;
    pseudoCurrent.x = diracProd(psi0, psi1,
        matrixMul(0, 
            zeros, sigmaX, gamma5Psi0, 
            -sigmaX, zeros, gamma5Psi1),
        matrixMul(1, 
            zeros, sigmaX, gamma5Psi0, 
            -sigmaX, zeros, gamma5Psi1)).r;
    pseudoCurrent.y = diracProd(psi0, psi1,
        matrixMul(0, 
            zeros, sigmaY, gamma5Psi0, 
            -sigmaY, zeros, gamma5Psi1),
        matrixMul(1, 
            zeros, sigmaY, gamma5Psi0, 
            -sigmaY, zeros, gamma5Psi1)).r;
    pseudoCurrent.z = diracProd(psi0, psi1,
        matrixMul(0,
            zeros, sigmaZ, gamma5Psi0,
            -sigmaZ, zeros, gamma5Psi1),
        matrixMul(1,
            zeros, sigmaZ, gamma5Psi0,
            -sigmaZ, zeros, gamma5Psi1)).r;
    pseudoCurrent.w = diracProd(psi0, psi1,
        matrixMul(0,
            zeros, id, gamma5Psi0, 
            id, zeros, gamma5Psi1),
        matrixMul(1, 
            zeros, id, gamma5Psi0, 
            id, zeros, gamma5Psi1)).r;
    return pseudoCurrent;
}

void main() {
    complex2 psi0 = texture2D(psiUpperTex, UV);
    complex2 psi1 = texture2D(psiLowerTex, UV);
    if (representation == DIRAC_REP)
        fragColor = computePseudoCurrentDiracRep(psi0, psi1);
    else
        fragColor = computePseudoCurrentWeylRep(psi0, psi1);
}
