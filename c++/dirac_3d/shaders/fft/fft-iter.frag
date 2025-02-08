/* This shader is used to implement the iterative part of the 
Cooley-Tukey iterative radix-2 FFT algorithm in 3D, where
this 3D data is formatted as a 2D texture.

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
uniform int orientation;
uniform float angleSign;
uniform float size;
uniform float scale;

uniform bool useCosTable;
uniform sampler2D cosTableTex;

uniform ivec2 texelDimensions2D;
uniform ivec3 texelDimensions3D;

#define complex vec2
#define complex2 vec4

const float PI = 3.141592653589793;

const int ORIENTATION_0 = 0;
const int ORIENTATION_1 = 1;
const int ORIENTATION_2 = 2;


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

vec2 to2DTextureCoordinates(vec3 uvw) {
    int width2D = texelDimensions2D[0];
    int height2D = texelDimensions2D[1];
    int width3D = texelDimensions3D[0];
    int height3D = texelDimensions3D[1];
    int length3D = texelDimensions3D[2];
    float wStack = float(width2D)/float(width3D);
    float xIndex = float(width3D)*mod(uvw[0], 1.0);
    float yIndex = float(height3D)*mod(uvw[1], 1.0);
    float zIndex = mod(floor(float(length3D)*uvw[2]), float(length3D));
    float uIndex = mod(zIndex, wStack)*float(width3D) + xIndex; 
    float vIndex = floor(zIndex / wStack)*float(height3D) + yIndex; 
    return vec2(uIndex/float(width2D), vIndex/float(height2D));
}

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

vec4 getOdd1(vec3 uvw) {
    if (orientation == ORIENTATION_0) {
        vec3 uvw2 = vec3(uvw[0] + 0.5*blockSize, uvw[1], uvw[2]);
        return texture2D(tex, to2DTextureCoordinates(uvw2));
    } else if (orientation == ORIENTATION_1) {
        vec3 uvw2 = vec3(uvw[0], uvw[1] + 0.5*blockSize, uvw[2]);
        return texture2D(tex, to2DTextureCoordinates(uvw2));
    } else if (orientation == ORIENTATION_2) {
        vec3 uvw2 = vec3(uvw[0], uvw[1], uvw[2] + 0.5*blockSize);
        return texture2D(tex, to2DTextureCoordinates(uvw2));
    }
}

vec4 getEven2(vec3 uvw) {
    if (orientation == ORIENTATION_0) {
        vec3 uvw2 = vec3(uvw[0] - 0.5*blockSize, uvw[1], uvw[2]);
        return texture2D(tex, to2DTextureCoordinates(uvw2));
    } else if (orientation == ORIENTATION_1) {
        vec3 uvw2 = vec3(uvw[0], uvw[1] - 0.5*blockSize, uvw[2]);
        return texture2D(tex, to2DTextureCoordinates(uvw2));
    } else if (orientation == ORIENTATION_2) {
        vec3 uvw2 = vec3(uvw[0], uvw[1], uvw[2] - 0.5*blockSize);
        return texture2D(tex, to2DTextureCoordinates(uvw2));
    }
}

void main() {
    vec3 uvw = to3DTextureCoordinates(UV);
    float val = 0.0;
    if (orientation == ORIENTATION_0) {
        val = mod(uvw[0], blockSize);
    } else if (orientation == ORIENTATION_1) {
        val = mod(uvw[1], blockSize);
    } else if (orientation == ORIENTATION_2) {
        val = mod(uvw[2], blockSize);
    }
    vec4 texVal = texture2D(tex, UV);

    // Even lower half
    vec4 even1 = texVal;
    vec4 odd1 = getOdd1(uvw);
    float angle1 = angleSign*2.0*PI*(val - 0.5/size)/blockSize;
    complex2 out1 = scale*(even1 + c2C1(odd1, expI(angle1)));

    // Odd upper half
    complex2 even2 = getEven2(uvw);
    complex2 odd2 = texVal;
    float angle2 = angleSign*2.0*PI
        *((val - 0.5/size) - blockSize/2.0)/blockSize;
    complex2 out2 = scale*(even2 - c2C1(odd2, expI(angle2)));

    fragColor = (val <= blockSize/2.0)? out1: out2;
}
