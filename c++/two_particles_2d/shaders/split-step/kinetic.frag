/* GLSL implementation of the momentum portion of the split operator algorithm

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

uniform ivec4 texelDimensions4D;
uniform vec4 dimensions4D;

#define complex vec2
#define complex2 vec4

const float PI = 3.141592653589793;
const complex IMAG_UNIT = complex(0.0, 1.0);

uniform complex dt;
uniform float m1;
uniform float m2;
uniform float hbar;
uniform sampler2D psiTex;
uniform bool useCustomKETex;
uniform sampler2D customKETex;


vec4 to4DTextureCoordinates(vec2 textureCoordinate2D) {
    float texelWidth2D = float(texelDimensions4D[0]*texelDimensions4D[1]);
    float texelHeight2D = float(texelDimensions4D[2]*texelDimensions4D[3]);
    vec2 texelPosition2D = vec2(textureCoordinate2D[0]*texelWidth2D,
                                textureCoordinate2D[1]*texelHeight2D);
    float x = mod(texelPosition2D[0], float(texelDimensions4D[0]));
    float y = floor(texelPosition2D[0] / float(texelDimensions4D[0])) + 0.5;
    float z = mod(texelPosition2D[1], float(texelDimensions4D[2]));
    float w = floor(texelPosition2D[1] / float(texelDimensions4D[2])) + 0.5;
    return vec4(
        x/float(texelDimensions4D[0]), y/float(texelDimensions4D[1]),
        z/float(texelDimensions4D[2]), w/float(texelDimensions4D[3]));
}

complex mul(complex z, float r) {
    return r*z;
}
complex mul(float r, complex z) {
    return mul(z, r);
}
complex mul(complex z1, complex z2) {
    return complex(z1.x*z2.x - z1.y*z2.y, 
                   z1.x*z2.y + z1.y*z2.x);
}

complex expC(complex z) {
    return complex(exp(z.x)*cos(z.y), exp(z.x)*sin(z.y));
}

vec4 getMomentum() {
    vec4 coord4D = to4DTextureCoordinates(UV);
    vec4 frequency = vec4(
        ((coord4D[0] < 0.5)? coord4D[0]: (-1.0 + coord4D[0]))
        * float(texelDimensions4D[0]),
        ((coord4D[1] < 0.5)? coord4D[1]: (-1.0 + coord4D[1]))
        * float(texelDimensions4D[1]),
        ((coord4D[2] < 0.5)? coord4D[2]: (-1.0 + coord4D[2]))
        * float(texelDimensions4D[2]),
        ((coord4D[3] < 0.5)? coord4D[3]: (-1.0 + coord4D[3]))
        * float(texelDimensions4D[3])
        ) - vec4(0.5);
    return 2.0*PI*frequency/dimensions4D;
}

void main() {
    complex2 psi = texture2D(psiTex, UV);
    complex psi1 = psi.xy;
    complex psi2 = psi.zw;
    complex idt = mul(IMAG_UNIT, dt);
    if (useCustomKETex) {
        complex kineticEnergy = texture2D(customKETex, UV).xy;
        fragColor = vec4(mul(expC(-mul(idt, kineticEnergy)/hbar), psi1),
                         mul(expC(-mul(idt, kineticEnergy)/hbar), psi2));
    } else {
        vec4 p = getMomentum();
        vec2 p1 = p.xy;
        vec2 p2 = p.zw;
        fragColor = vec4(
            mul(expC(-idt*(dot(p1, p1)/m1 + dot(p2, p2)/m2)/(2.0*hbar)),
                psi1),
            mul(expC(-idt*(dot(p1, p1)/m1 + dot(p2, p2)/m2)/(2.0*hbar)),
                psi2));
    }

}