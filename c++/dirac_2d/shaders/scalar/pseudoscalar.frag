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

uniform sampler2D uTex;
uniform sampler2D vTex;

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

void main() {
    complex2 u = texture2D(uTex, UV);
    complex2 v = texture2D(vTex, UV);
    fragColor = vec4((innerProd(u, v) - innerProd(v, u)).g);
}
