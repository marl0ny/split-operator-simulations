/* This shadder is used to implement part of the 
Cooley-Tukey iterative radix-2 FFT algorithm.

References:

Wikipedia - Cooley–Tukey FFT algorithm
https://en.wikipedia.org/wiki/Cooley%E2%80%93Tukey_FFT_algorithm

MathWorld Wolfram - Fast Fourier Transform:
http://mathworld.wolfram.com/FastFourierTransform.html

William Press et al.
12.2 Fast Fourier Transform (FFT) - in Numerical Recipes
https://websites.pmc.ucsc.edu/~fnimmo/eart290c_17/NumericalRecipesinF77.pdf

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

uniform sampler2D tex;
uniform float blockSize;
uniform bool isVertical;
uniform float angleSign;
uniform float size;
uniform float scale;

uniform bool useCosTable;
uniform sampler2D cosTableTex;

const float PI = 3.141592653589793;
const complex IMAG_UNIT = complex(0.0, 1.0);


float getValueFromCosTable(float angle) {
    return texture2D(cosTableTex,
                     vec2(angle/PI + 0.5/(size/2.0), 0.5)).r;
}

complex expI(float angle) {
    if (!useCosTable)
        return complex(cos(angle), sin(angle));
    float c = getValueFromCosTable(abs(angle));
    float s = (abs(angle) < PI/2.0)?
        -getValueFromCosTable(abs(angle) + PI/2.0):
        getValueFromCosTable(abs(angle) - PI/2.0);
    return complex(c, sign(angle)*s);
}

complex mul(complex z, complex w) {
    return complex(z.x*w.x - z.y*w.y, z.x*w.y + z.y*w.x);
}

complex2 c2C1(complex2 z, complex w) {
    return complex2(mul(z.rg, w), mul(z.ba, w));
}

complex2 getOdd1(float x, float y) {
    return (!isVertical)? texture2D(tex, vec2(x + blockSize/2.0, y)):
                          texture2D(tex, vec2(x, y + blockSize/2.0));
}

complex2 getEven2(float x, float y) {
    return (!isVertical)? texture2D(tex, vec2(x - blockSize/2.0, y)):
                          texture2D(tex, vec2(x, y - blockSize/2.0));
}

void main() {
    float val = (!isVertical)? mod(UV[0], blockSize): mod(UV[1], blockSize);
    // even lower half
    complex2 even1 = texture2D(tex, UV);
    complex2 odd1 = getOdd1(UV[0], UV[1]);
    float angle1 = angleSign*2.0*PI*(val - 0.5/size)/blockSize;
    complex2 out1 = scale*(even1 + c2C1(odd1, expI(angle1)));
    // odd upper half
    complex2 even2 = getEven2(UV[0], UV[1]);
    complex2 odd2 = texture2D(tex, UV);
    float angle2 = angleSign*2.0*PI
        *((val - 0.5/size) - blockSize/2.0)/blockSize;
    complex2 out2 = scale*(even2 - c2C1(odd2, expI(angle2)));
    fragColor = (val <= blockSize/2.0)? out1: out2;
}
