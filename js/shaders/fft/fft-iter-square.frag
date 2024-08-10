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

complex2 compute00(complex2 ee, complex2 oe, complex2 eo, complex2 oo,
                   float angleX, float angleY) {
    return scale*(ee 
                  + c2C1(oe, expI(angleX)) + c2C1(eo, expI(angleY))
                  + c2C1(oo, mul(expI(angleX), expI(angleY))));
}

complex2 compute10(complex2 ee, complex2 oe, complex2 eo, complex2 oo,
                   float angleX, float angleY) {
    return scale*(ee 
                  - c2C1(oe, expI(angleX)) + c2C1(eo, expI(angleY))
                  - c2C1(oo, mul(expI(angleX), expI(angleY))));
}

complex2 compute01(complex2 ee, complex2 oe, complex2 eo, complex2 oo,
                   float angleX, float angleY) {
    return scale*(ee 
                  + c2C1(oe, expI(angleX)) - c2C1(eo, expI(angleY))
                  - c2C1(oo, mul(expI(angleX), expI(angleY))));
}

complex2 compute11(complex2 ee, complex2 oe, complex2 eo, complex2 oo,
                   float angleX, float angleY) {
    return scale*(ee 
                  - c2C1(oe, expI(angleX)) - c2C1(eo, expI(angleY))
                  + c2C1(oo, mul(expI(angleX), expI(angleY))));
}

void main() {
    vec2 angle00, angle10, angle01, angle11;
    {
        vec2 blockPosition = vec2(mod(UV[0], blockSize),
                                  mod(UV[1], blockSize)) - vec2(0.5/size);
        angle00 = angleSign*2.0*PI*blockPosition/blockSize;
        angle10 = angleSign*2.0*PI*(blockPosition 
                                    - vec2(blockSize/2.0, 0.0))/blockSize;
        angle01 = angleSign*2.0*PI*(blockPosition
                                    - vec2(0.0, blockSize/2.0))/blockSize;
        angle11 = angleSign*2.0*PI*(blockPosition
                                    - vec2(blockSize/2.0,
                                           blockSize/2.0))/blockSize;
    }
    complex2 valCC; 
    complex2 valRC, valRU, valCU, valLU, valLC;
    complex2 valLD, valCD, valRD;
    {
        float h = blockSize/2.0;
        valCC = texture2D(tex, UV);
        valRC = texture2D(tex, vec2(UV[0] + h, UV[1]));
        valRU = texture2D(tex, vec2(UV[0] + h, UV[1] + h));
        valCU = texture2D(tex, vec2(UV[0], UV[1] + h));
        valLU = texture2D(tex, vec2(UV[0] - h, UV[1] + h));
        valLC = texture2D(tex, vec2(UV[0] - h, UV[1]));
        valLD = texture2D(tex, vec2(UV[0] - h, UV[1] - h));
        valCD = texture2D(tex, vec2(UV[0], UV[1] - h));
        valRD = texture2D(tex, vec2(UV[0] + h, UV[1] - h));
    }
    complex2 out00, out01, out10, out11;
    // x even, y even (0, 0)
    {
        complex2 ee = valCC;
        complex2 oe = valRC;
        complex2 eo = valCU;
        complex2 oo = valRU;
        out00 = compute00(ee, oe, eo, oo, angle00.x, angle00.y);
    }
    // x odd, y even (1, 0) 
    {
        complex2 ee = valLC;
        complex2 oe = valCC;
        complex2 eo = valLU;
        complex2 oo = valCU;
        out10 = compute10(ee, oe, eo, oo, angle10.x, angle10.y);
        
    }
    // x even, y odd (0, 1)
    {
        complex2 ee = valCD;
        complex2 oe = valRD;
        complex2 eo = valCC;
        complex2 oo = valRC;
        out01 = compute01(ee, oe, eo, oo, angle01.x, angle01.y);
    }
    // x odd, y odd (1, 1)
    {
        complex2 ee = valLD;
        complex2 oe = valCD;
        complex2 eo = valLC;
        complex2 oo = valCC;
        out11 = compute11(ee, oe, eo, oo, angle11.x, angle11.y);

    }
    vec2 blockPosition = vec2(mod(UV[0], blockSize), mod(UV[1], blockSize));
    if (blockPosition.x <= blockSize/2.0 && 
        blockPosition.y <= blockSize/2.0) {
        fragColor = out00;
    } else if (blockPosition.x > blockSize/2.0 &&
               blockPosition.y <= blockSize/2.0) {
        fragColor = out10;
    } else if (blockPosition.x <= blockSize/2.0 &&
               blockPosition.y > blockSize/2.0) {
        fragColor = out01;
    } else if (blockPosition.x > blockSize/2.0 &&
               blockPosition.y > blockSize/2.0) {
        fragColor = out11;
    }
}
