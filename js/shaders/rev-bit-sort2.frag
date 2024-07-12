/* Reverse bit sort a texture whose width and height must be a power
of two.*/
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
uniform int width;
uniform int height;

bool revBitSort2SingleIter(inout int rev, inout int i,
                           inout int asc, inout int des, int stop) {
    if (i/des > 0) {
        rev += asc;
	i -= des;
    }
    des /= 2, asc *= 2;
    if (asc == 2*stop)
        return false;
    return true;
}

/* Older versions of GLSL do not support for loops.
 This very long function reverse bit sorts a finite-sized
 input texture with power of two dimensions without using any for loops.
 For more more modern versions of GLSL a different implementation of reverse
 bit sorting which uses for loops is used instead.
*/
vec2 revBitSort2NoForLoop(vec2 uv) {
    vec2 uv2 = vec2(0.0, 0.0);
    int indexU = int(floor(uv[0]*float(width)));
    int indexV = int(floor(uv[1]*float(height)));
 
    int rev = 0, i = indexU;
    int asc = 1, des = width/2;
    if (!revBitSort2SingleIter(rev, i, asc, des, width/2))
        uv2[0] = (float(rev) + 0.5)/float(width);
    if (!revBitSort2SingleIter(rev, i, asc, des, width/2))
        uv2[0] = (float(rev) + 0.5)/float(width);
    if (!revBitSort2SingleIter(rev, i, asc, des, width/2))
        uv2[0] = (float(rev) + 0.5)/float(width);
    if (!revBitSort2SingleIter(rev, i, asc, des, width/2))
        uv2[0] = (float(rev) + 0.5)/float(width);
    if (!revBitSort2SingleIter(rev, i, asc, des, width/2))
        uv2[0] = (float(rev) + 0.5)/float(width);
    if (!revBitSort2SingleIter(rev, i, asc, des, width/2))
        uv2[0] = (float(rev) + 0.5)/float(width);
    if (!revBitSort2SingleIter(rev, i, asc, des, width/2))
        uv2[0] = (float(rev) + 0.5)/float(width);
    if (!revBitSort2SingleIter(rev, i, asc, des, width/2))
        uv2[0] = (float(rev) + 0.5)/float(width);
    if (!revBitSort2SingleIter(rev, i, asc, des, width/2))
        uv2[0] = (float(rev) + 0.5)/float(width);
    if (!revBitSort2SingleIter(rev, i, asc, des, width/2))
        uv2[0] = (float(rev) + 0.5)/float(width);
    if (!revBitSort2SingleIter(rev, i, asc, des, width/2))
        uv2[0] = (float(rev) + 0.5)/float(width);
    if (!revBitSort2SingleIter(rev, i, asc, des, width/2))
        uv2[0] = (float(rev) + 0.5)/float(width);

    rev = 0, i = indexV;
    asc = 1, des = height/2;
    if (!revBitSort2SingleIter(rev, i, asc, des, height/2))
        uv2[1] = (float(rev) + 0.5)/float(height);
    if (!revBitSort2SingleIter(rev, i, asc, des, height/2))
        uv2[1] = (float(rev) + 0.5)/float(height);
    if (!revBitSort2SingleIter(rev, i, asc, des, height/2))
        uv2[1] = (float(rev) + 0.5)/float(height);
    if (!revBitSort2SingleIter(rev, i, asc, des, height/2))
        uv2[1] = (float(rev) + 0.5)/float(height);
    if (!revBitSort2SingleIter(rev, i, asc, des, height/2))
        uv2[1] = (float(rev) + 0.5)/float(height);
    if (!revBitSort2SingleIter(rev, i, asc, des, height/2))
        uv2[1] = (float(rev) + 0.5)/float(height);
    if (!revBitSort2SingleIter(rev, i, asc, des, height/2))
        uv2[1] = (float(rev) + 0.5)/float(height);
    if (!revBitSort2SingleIter(rev, i, asc, des, height/2))
        uv2[1] = (float(rev) + 0.5)/float(height);
    if (!revBitSort2SingleIter(rev, i, asc, des, height/2))
        uv2[1] = (float(rev) + 0.5)/float(height);
    if (!revBitSort2SingleIter(rev, i, asc, des, height/2))
        uv2[1] = (float(rev) + 0.5)/float(height);
    if (!revBitSort2SingleIter(rev, i, asc, des, height/2))
        uv2[1] = (float(rev) + 0.5)/float(height);
    if (!revBitSort2SingleIter(rev, i, asc, des, height/2))
        uv2[1] = (float(rev) + 0.5)/float(height);

    return uv2;
}

vec2 revBitSort2(vec2 uv) {
    #if (!defined(GL_ES) && __VERSION__ >= 120) || (defined(GL_ES) && __VERSION__ > 300)
    vec2 uv2 = vec2(0.0, 0.0);
    int indexU = int(floor(uv[0]*float(width)));
    int indexV = int(floor(uv[1]*float(height)));
    int rev = 0, i = indexU;
    for (int asc = 1, des = width/2; des > 0; des /= 2, asc *= 2) {
        if (i/des > 0) {
            rev += asc;
            i -= des;
        }
    }
    uv2[0] = (float(rev) + 0.5)/float(width);
    rev = 0, i = indexV;
    for (int asc = 1, des = height/2; des > 0; des /= 2, asc *= 2) {
        if (i/des > 0) {
            rev += asc;
            i -= des;
        }
    }
    uv2[1] = (float(rev) + 0.5)/float(height);
    return uv2;
    #else
    return revBitSort2NoForLoop(uv);
    #endif
}

void main() {
     fragColor = texture2D(tex, revBitSort2(UV));
}
