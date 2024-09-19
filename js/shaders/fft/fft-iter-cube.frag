/* This shadder is used to implement part of the 
Cooley-Tukey iterative radix-2 FFT algorithm for 3D array data stored
in 2D textures. It is assumed that the 3D array data has equal side
lengths.

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

uniform bool useCosTable;
uniform sampler2D cosTableTex;

uniform ivec2 texelDimensions2D;
uniform ivec3 texelDimensions3D;

#define complex vec2
#define complex2 vec4

const float PI = 3.141592653589793;


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

void main() {
    vec3 uvw = to3DTextureCoordinates(UV);
    vec3 blockPosition = vec3(
        mod(uvw[0], blockSize),
        mod(uvw[1], blockSize),
        mod(uvw[2], blockSize));
    float h = blockSize/2.0;
    vec3 signFactor = vec3((blockPosition.x <= h)? 1.0: -1.0,
                           (blockPosition.y <= h)? 1.0: -1.0,
                           (blockPosition.z <= h)? 1.0: -1.0);
    vec3 offset = vec3((blockPosition.x <= h)? 0.0: -1.0,
                       (blockPosition.y <= h)? 0.0: -1.0,
                       (blockPosition.z <= h)? 0.0: -1.0);
    complex2 eee = texture2D(
        tex, to2DTextureCoordinates(uvw + h*offset));
    complex2 oee = texture2D(
        tex, to2DTextureCoordinates(uvw + h*(vec3(1.0, 0.0, 0.0) + offset)));
    complex2 eoe = texture2D(
        tex, to2DTextureCoordinates(uvw + h*(vec3(0.0, 1.0, 0.0) + offset)));
    complex2 ooe = texture2D(
        tex, to2DTextureCoordinates(uvw + h*(vec3(1.0, 1.0, 0.0) + offset)));
    complex2 eeo = texture2D(
        tex, to2DTextureCoordinates(uvw + h*(vec3(0.0, 0.0, 1.0) + offset)));
    complex2 oeo = texture2D(
        tex, to2DTextureCoordinates(uvw + h*(vec3(1.0, 0.0, 1.0) + offset)));
    complex2 eoo = texture2D(
        tex, to2DTextureCoordinates(uvw + h*(vec3(0.0, 1.0, 1.0) + offset)));
    complex2 ooo = texture2D(
        tex, to2DTextureCoordinates(uvw + h*(vec3(1.0, 1.0, 1.0) + offset)));
    vec3 angle = angleSign*2.0*PI*(
        blockPosition - vec3(0.5/size) + h*offset)/blockSize;
    complex eIAngleX = expI(angle.x);
    complex eIAngleY = expI(angle.y);
    complex eIAngleZ = expI(angle.z);
    fragColor = scale*scale*scale*(
        eee
         + signFactor.x*c2C1(oee, eIAngleX)
         + signFactor.y*c2C1(eoe, eIAngleY)
         + signFactor.z*c2C1(eeo, eIAngleZ)
         + signFactor.x*signFactor.y*c2C1(ooe, mul(eIAngleX, eIAngleY))
         + signFactor.z*signFactor.x*c2C1(oeo, mul(eIAngleZ, eIAngleX))
         + signFactor.y*signFactor.z*c2C1(eoo, mul(eIAngleY, eIAngleZ))
         + signFactor.x*signFactor.y*signFactor.z
            *c2C1(ooo, mul(mul(eIAngleX, eIAngleY), eIAngleZ))
    );
}