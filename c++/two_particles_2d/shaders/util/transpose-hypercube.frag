/* Transpose a 4D cube array of data points that's formatted into 
 a single 2D texture*/ 
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
uniform ivec4 indices;
uniform ivec4 texelDimensions4D;

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

void main() {
    vec4 coord4D = to4DTextureCoordinates(UV);
    fragColor = texture2D(
        tex,
        to2DTextureCoordinates(
            // coord4D
            vec4(coord4D[indices[0]],
                 coord4D[indices[1]],
                 coord4D[indices[2]],
                 coord4D[indices[3]])
        )
    );
}

