/* Reverse bit sort a 4D array of data that's organized into 
a single 2D texture. It is assumed the the side lengths of this
4D array are a power of two in size.
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


vec4 reverseBitsOfCoordinateIndices(vec4 coord4D) {
    // The variable coord4D2 will be the normalized texture
    // coordinates that corresponds to the reversed bit indices
    // of the initial coordinates.
    vec4 coord4D2 = vec4(0.0, 0.0, 0.0, 0.0);
    // Convert the coord4D which represents the coordinates
    // of the current texel unit in normalized texture
    // coordinates to texel indices.
    ivec4 indices = ivec4(
        int(floor(coord4D[0]*float(texelDimensions4D[0]))),
        int(floor(coord4D[1]*float(texelDimensions4D[1]))),
        int(floor(coord4D[2]*float(texelDimensions4D[2]))),
        int(floor(coord4D[3]*float(texelDimensions4D[3])))
    );
    for (int i = 0; i < 4; i++) {
        // The index variable corresponds to the index of the texel
        // unit for the current spatial index i,
        // while the rev variable will contain the reversed bits of
        // the index variable.
        int rev = 0, index = indices[i];
        // The variables asc and des represent bit positions
        // of the variable index: asc starts at the lowest bit value
        // and ascends to the larger bit after each iteration of the
        // for loop, while des begins at the largest bit
        // and descends to the smaller bit.
        for (int asc = 1, des = texelDimensions4D[i]/2; 
             des > 0; des /= 2, asc *= 2) {
            // If statement checks if the des bit position 
            // of index contains a one. It does this by
            // assessing if index is greater than des.
            //  For this check to work,
            // the larger non-zero bit values of index
            //  must be zeroed-out in the previous iterations!
            if (index/des > 0) {
                // Add the asc bit to the rev variable if
                // the des bit contains a one.
                rev += asc;
                // Turn the current des bit position of index to zero,
                // so that the if statement check works as intended
                // for subsequent loop iterations.
                index -= des;
            }
        }
        coord4D2[i] = (float(rev) + 0.5)/float(texelDimensions4D[i]);
    }
    return coord4D2;
}

void main() {
    vec4 coord4D = to4DTextureCoordinates(UV);
    vec4 bitRevIndCoord4D = reverseBitsOfCoordinateIndices(coord4D);
    vec2 coord2D = to2DTextureCoordinates(bitRevIndCoord4D);
    fragColor = texture2D(tex, coord2D);
}