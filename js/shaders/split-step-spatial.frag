/* GLSL implementation of the spatial step 
(that exponential term which only depends on position)
 for the split operator algorithm

References:

Split-Operator Method:
James Schloss. The Split Operator Method - Arcane Algorithm Archive.
https://www.algorithm-archive.org/contents/split-operator_method/
 split-operator_method.html
 
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

const complex IMAG_UNIT = complex(0.0, 1.0);

uniform complex dt;
uniform float m;
uniform float hbar;
uniform sampler2D potentialTex;
uniform sampler2D psiTex;


complex mul(complex z1, complex z2) {
    return complex(z1.x*z2.x - z1.y*z2.y, 
                   z1.x*z2.y + z1.y*z2.x);
}

complex expC(complex z) {
    return complex(exp(z.x)*cos(z.y), exp(z.x)*sin(z.y));
}


void main() {
    complex2 psi = texture2D(psiTex, UV);
    complex psi1 = psi.xy;
    complex psi2 = psi.zw;
    complex potential = texture2D(potentialTex, UV).xy;
    complex iVdt = mul(IMAG_UNIT, mul(potential, dt));
    fragColor = vec4(mul(expC(-iVdt/hbar), psi1),
                     mul(expC(-iVdt/hbar), psi2));
}
