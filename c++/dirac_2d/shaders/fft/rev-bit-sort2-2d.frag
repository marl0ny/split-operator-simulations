/* Reverse bit sort the pixels of a texture based on its indices.
It is assumed that its side lengths are a power of two in size.
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

uniform ivec2 texelDimensions2D;

vec2 reverseBitsOfCoordinateIndices(vec2 uv) {
    // The variable uv2 will be the normalized texture
    // coordinates that corresponds to the reversed bit indices
    // of the initial coordinates.
    vec2 uv2 = vec2(0.0, 0.0);
    // Convert uv which represents the coordinates
    // of the current texel unit in normalized texture
    // coordinates to texel indices.
    ivec2 indices = ivec2(
        int(floor(uv[0]*float(texelDimensions2D[0]))),
        int(floor(uv[1]*float(texelDimensions2D[1])))
    );
    for (int i = 0; i < 2; i++) {
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
        for (int asc = 1, des = texelDimensions2D[i]/2; 
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
        uv2[i] = (float(rev) + 0.5)/float(texelDimensions2D[i]);
    }
    return uv2;
}

void main() {
    vec2 uv2 = reverseBitsOfCoordinateIndices(UV);
    fragColor = texture2D(tex, uv2);
}