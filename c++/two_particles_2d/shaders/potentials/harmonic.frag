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

uniform vec2 r0;
uniform float omega;
uniform float m1;
uniform float m2;


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

void main() {
    vec4 normalizedCoord4D = to4DTextureCoordinates(UV);
    vec4 r = normalizedCoord4D*dimensions4D;
    vec2 r1 = r.xy;
    vec2 r2 = r.zw;
    float potential1 = m1*dot(omega*(r1 - r0), omega*(r1 - r0))/2.0;
    float potential2 = m2*dot(omega*(r2 - r0), omega*(r2 - r0))/2.0;
    fragColor = vec4(potential1, 0.0, potential2, 0.0);
}