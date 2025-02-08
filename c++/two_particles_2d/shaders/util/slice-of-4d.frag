/* 2D slice of a 4D array stored in a 2D texture. Slicing is currently handled in a 
 nearest neighbour approach; no support for interpolations yet. */
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
uniform ivec4 texelDimensions4D;
uniform ivec2 sliceCoordinates;   // Location of the 2D slice.
uniform ivec2 sliceIndices;  // Indices used for the slice location.
uniform ivec2 sampleIndices;  // Indices used for texture sampling.

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

void main() {
    vec4 coord4D = vec4(0.0);
    coord4D[sliceIndices[0]]
        = (float(sliceCoordinates[0]) + 0.5) 
            / float(texelDimensions4D[sliceIndices[0]]);
    coord4D[sliceIndices[1]]
        = (float(sliceCoordinates[1]) + 0.5) 
            / float(texelDimensions4D[sliceIndices[1]]);
    coord4D[sampleIndices[0]] = UV[0];
    coord4D[sampleIndices[1]] = UV[1];
    fragColor = texture2D(tex, to2DTextureCoordinates(coord4D));
}
