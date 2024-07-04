/* GLSL implementation of the momentum step for the split operator algorithm

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

uniform int numberOfDimensions;
uniform ivec2 texelDimensions2D;
uniform vec2 dimensions2D;
uniform ivec3 texelDimensions3D;
uniform vec3 dimensions3D;

#define complex vec2
#define complex2 vec4

const float PI = 3.141592653589793;
const complex IMAG_UNIT = complex(0.0, 1.0);

uniform complex dt;
uniform float m;
uniform float hbar;
uniform sampler2D psiTex;
uniform bool useCustomKETex;
uniform sampler2D customKETex;


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
                (numberOfDimensions == 3)? 2.0*PI*freqW/length_: 0.0);
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
        vec3 p = getMomentum();
        float p2 = p.x*p.x + p.y*p.y + p.z*p.z;
        fragColor = vec4(mul(expC(-idt*p2/(2.0*m*hbar)), psi1),
                         mul(expC(-idt*p2/(2.0*m*hbar)), psi2));
    }

}