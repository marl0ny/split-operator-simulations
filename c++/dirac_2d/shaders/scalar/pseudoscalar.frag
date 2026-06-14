/* The discussion given on pg 43 of Introduction to Quantum Field Theory
 by Peskin and Schoeder shows how to construct the Lorentz covariant
 scalar from the Dirac spinors and the 0th gamma matrix. The 0th gamma
 matrix in the Weyl representation is given in (3.25) on pg. 41 of 
 the same book. The beta matrix as presented in 20.1.12 on
 pg 565 of Principles of Quantum Mechanics by Shankar is used as the 0th gamma
 matrix for the Dirac representation.
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

#define complex vec2
#define complex2 vec4

#define hermitian2x2 vec4

uniform sampler2D psiUpperTex;
uniform sampler2D psiLowerTex;

const int DIRAC_REP = 0;
const int WEYL_REP = 1;
uniform int representation;

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

void main() {
    complex2 psi0 = texture2D(psiUpperTex, UV);
    complex2 psi1 = texture2D(psiLowerTex, UV);
    hermitian2x2 zeros = hermitian2x2(0.0);
    hermitian2x2 id = hermitian2x2(1.0, 1.0, complex(0.0));
    complex2 gamma5Psi0, gamma5Psi1;
    if (representation == DIRAC_REP) {
        gamma5Psi0 = matrixMul(0, 
            zeros, id, psi0, 
            id, zeros, psi1);
        gamma5Psi1 = matrixMul(1, 
            zeros, id, psi0, 
            id, zeros, psi1);
    } else if (representation == WEYL_REP) {
        gamma5Psi0 = matrixMul(0, 
            -id, zeros, psi0, 
            zeros, id, psi1);
        gamma5Psi1 = matrixMul(1, 
            -id, zeros, psi0, 
            zeros, id, psi1);
    }
    complex pseudoScalar = diracProd(psi0, psi1, gamma5Psi0, gamma5Psi1);
    fragColor = vec4(pseudoScalar.r);
}
