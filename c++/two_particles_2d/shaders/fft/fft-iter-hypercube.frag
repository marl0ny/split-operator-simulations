/* This shader is used to implement the iterative part of the 
Cooley-Tukey iterative radix-2 FFT algorithm as applied to a 4D array of 
data points that is formatted as a 2D texture. 
It is assumed that the side lengths of this 4D array are equal
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

uniform ivec4 texelDimensions4D;

#define complex vec2
#define complex2 vec4

const float PI = 3.141592653589793;


complex expI(float angle) {
    return complex(cos(angle), sin(angle));
}

complex mul(complex z, complex w) {
    return complex(z.x*w.x - z.y*w.y, z.x*w.y + z.y*w.x);
}

complex mul4(complex a, complex b, complex c, complex d) {
    return mul(mul(mul(a, b), c), d);
}

complex2 c2C1(complex2 z, complex w) {
    return complex2(mul(z.rg, w), mul(z.ba, w));
}

vec2 to2DTextureCoordinates(vec4 textureCoordinate4D) {
    float texelWidth2D = float(texelDimensions4D[0]*texelDimensions4D[1]);
    float texelHeight2D = float(texelDimensions4D[2]*texelDimensions4D[3]);
    float x = textureCoordinate4D[0]*float(texelDimensions4D[0]);
    float y = textureCoordinate4D[1]*float(texelDimensions4D[1]);
    float z = textureCoordinate4D[2]*float(texelDimensions4D[2]);
    float w = textureCoordinate4D[3]*float(texelDimensions4D[3]);
    return vec2((x + floor(y)*float(texelDimensions4D[0]))/texelWidth2D,
                (z + floor(w)*float(texelDimensions4D[2]))/texelHeight2D);
}

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

complex2 getTerm(vec4 textureCoordinate4D,
                int i0, int i1, int i2, int i3,
                complex eIAngleX, complex eIAngleY,
                complex eIAngleZ, complex eIAngleW,
                vec4 signFactors, vec4 offset) {
    float overallSignFactor = 
        ((i0 == 0)? 1.0: signFactors.x)
        *((i1 == 0)? 1.0: signFactors.y)
        *((i2 == 0)? 1.0: signFactors.z)
        *((i3 == 0)? 1.0: signFactors.w);
    complex xPhaseFactor = (i0 == 0)? complex(1.0, 0.0): eIAngleX; 
    complex yPhaseFactor = (i1 == 0)? complex(1.0, 0.0): eIAngleY;
    complex zPhaseFactor = (i2 == 0)? complex(1.0, 0.0): eIAngleZ;
    complex wPhaseFactor = (i3 == 0)? complex(1.0, 0.0): eIAngleW;
    complex overallPhaseFactor 
        = mul4(xPhaseFactor, yPhaseFactor, zPhaseFactor, wPhaseFactor);
    vec2 coord = to2DTextureCoordinates(textureCoordinate4D
        + (blockSize/2.0)
        * (offset + vec4(float(i0), float(i1), float(i2), float(i3))));
    return overallSignFactor*c2C1(texture2D(tex, coord), overallPhaseFactor);
}

void main() {
    vec4 textureCoordinate4D = to4DTextureCoordinates(UV);
    vec4 blockPosition = vec4(
        mod(textureCoordinate4D[0], blockSize),
        mod(textureCoordinate4D[1], blockSize),
        mod(textureCoordinate4D[2], blockSize),
        mod(textureCoordinate4D[3], blockSize));
    float h = blockSize/2.0;
    vec4 signFactors = vec4((blockPosition.x <= h)? 1.0: -1.0,
                            (blockPosition.y <= h)? 1.0: -1.0,
                            (blockPosition.z <= h)? 1.0: -1.0,
                            (blockPosition.w <= h)? 1.0: -1.0);
    vec4 offset = vec4((blockPosition.x <= h)? 0.0: -1.0,
                       (blockPosition.y <= h)? 0.0: -1.0,
                       (blockPosition.z <= h)? 0.0: -1.0,
                       (blockPosition.w <= h)? 0.0: -1.0);
    vec4 angle = angleSign*2.0*PI*(
        blockPosition - vec4(0.5/size) + h*offset)/blockSize;
    complex eIAngleX = expI(angle.x);
    complex eIAngleY = expI(angle.y);
    complex eIAngleZ = expI(angle.z);
    complex eIAngleW = expI(angle.w);
    complex2 terms = complex2(0.0);
    for (int i0 = 0; i0 < 2; i0++)
        for (int i1 = 0; i1 < 2; i1++)
            for (int i2 = 0; i2 < 2; i2++)
                for (int i3 = 0; i3 < 2; i3++)
                    terms += getTerm(
                        textureCoordinate4D, i0, i1, i2, i3,
                        eIAngleX, eIAngleY, eIAngleZ, eIAngleW,
                        signFactors, offset);
    fragColor = pow(scale, 4.0)*terms;
}
