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

uniform sampler2D psiTex;
uniform ivec4 texelDimensions4D;
uniform vec4 dimensions4D;

uniform float m1;
uniform float m2;
uniform float hbar;

#define PI 3.141592653589793

#define complex vec2

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

complex mul(complex z, complex w) {
    return complex(z.x*w.x - z.y*w.y, z.x*w.y + z.y*w.x);
}

vec4 centered2ndOrderGradient(int index, sampler2D tex) {
    vec4 coord4D = to4DTextureCoordinates(UV);
    vec4 step_ = vec4(
        (index == 0)? 1.0: 0.0, (index == 1)? 1.0: 0.0,
        (index == 2)? 1.0: 0.0, (index == 3)? 1.0: 0.0
    )/vec4(texelDimensions4D);
    vec4 forward = mod(coord4D + step_, vec4(1.0));
    vec4 backward = coord4D - step_;
    if ((backward[0] + backward[1] + backward[2] + backward[3]) < 0.0)
        backward = vec4(1.0) + backward;
    vec4 forwardSample = texture2D(tex, to2DTextureCoordinates(forward));
    vec4 backwardSample = texture2D(tex, to2DTextureCoordinates(backward));
    float d = dot(step_, dimensions4D);
    return (forwardSample - backwardSample)/(2.0*d);
}

void main() {
    complex grad0Psi = centered2ndOrderGradient(0, psiTex).xy;
    complex grad1Psi = centered2ndOrderGradient(1, psiTex).xy;
    complex grad2Psi = centered2ndOrderGradient(2, psiTex).xy;
    complex grad3Psi = centered2ndOrderGradient(3, psiTex).xy;
    complex psi = texture2D(psiTex, UV).xy;
    vec4 j = hbar*vec4(
        mul(psi, grad0Psi)[1]/m1, mul(psi, grad1Psi)[1]/m1,
        mul(psi, grad2Psi)[1]/m2, mul(psi, grad3Psi)[1]/m2);
}