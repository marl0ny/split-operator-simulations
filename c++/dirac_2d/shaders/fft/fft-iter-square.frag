/* This shader is used to implement the iterative part of the 
Cooley-Tukey iterative radix-2 FFT algorithm in 2D, 
where it is assumed that the side lengths of the input are equal
to each other.

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


uniform sampler2D tex;
uniform float blockSize;
uniform float angleSign;
uniform float size;
uniform float scale;

#define complex vec2
#define complex2 vec4

const float PI = 3.141592653589793;


complex expI(float angle) {
    return complex(cos(angle), sin(angle));
}

complex mul(complex z, complex w) {
    return complex(z.x*w.x - z.y*w.y, z.x*w.y + z.y*w.x);
}

complex2 c2C1(complex2 z, complex w) {
    return complex2(mul(z.rg, w), mul(z.ba, w));
}

complex2 getTerm(vec2 uv, bool isOddX, bool isOddY,
                 complex eIAngleX, complex eIAngleY,
                 vec2 signFactors, vec2 offset) {
    float overallSignFactor = 
        ((isOddX)? signFactors.x: 1.0)
        *((isOddY)? signFactors.y: 1.0);
    complex xPhaseFactor = (isOddX)? eIAngleX: complex(1.0, 0.0); 
    complex yPhaseFactor = (isOddY)? eIAngleY: complex(1.0, 0.0);
    complex overallPhaseFactor = mul(xPhaseFactor, yPhaseFactor);
    vec2 coord = uv + (blockSize/2.0)*(
        offset + vec2((isOddX)? 1.0: 0.0, (isOddY)? 1.0: 0.0));
    return overallSignFactor*c2C1(texture2D(tex, coord), overallPhaseFactor);
}

void main() {
    vec2 blockPosition = vec2(mod(UV[0], blockSize),
                              mod(UV[1], blockSize));
    float h = blockSize/2.0;
    vec2 signFactors = vec2((blockPosition.x <= h)? 1.0: -1.0,
                            (blockPosition.y <= h)? 1.0: -1.0);
    vec2 offset = vec2((blockPosition.x <= h)? 0.0: -1.0,
                       (blockPosition.y <= h)? 0.0: -1.0);
    vec2 angle = angleSign*2.0*PI*(
        blockPosition - vec2(0.5/size) + h*offset)/blockSize;
    complex eIAngleX = expI(angle.x);
    complex eIAngleY = expI(angle.y);
    fragColor = scale*scale*(
        getTerm(UV, false, false, eIAngleX, eIAngleY, signFactors, offset)
         + getTerm(UV, false, true, eIAngleX, eIAngleY, signFactors, offset)
         + getTerm(UV, true, false, eIAngleX, eIAngleY, signFactors, offset)
         + getTerm(UV, true, true, eIAngleX, eIAngleY, signFactors, offset));
}
