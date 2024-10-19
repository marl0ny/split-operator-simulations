/* Reverse bit sort a 3D array of data that's organized into 
a single 2D texture. It is assumed the the side lengths of this
3D array are a power of two in size.
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

uniform ivec3 texelDimensions3D;
uniform ivec2 texelDimensions2D;


vec2 to2DTextureCoordinates(vec3 uvw) {
    int width2D = texelDimensions2D[0];
    int height2D = texelDimensions2D[1];
    int width3D = texelDimensions3D[0];
    int height3D = texelDimensions3D[1];
    int length3D = texelDimensions3D[2];
    float wStack = float(width2D)/float(width3D);
    // float hStack = float(height2D)/float(height3D);
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
 This very long function is used to reverse bit sort a finite-sized
 input texture with power of two dimensions without using any for loops.
 For more modern versions of GLSL a different implementation of reverse
 bit sorting which includes for loops is used instead.
*/
float revBitSort2SingleDimension(int index, int size) {
    int rev = 0, i = index;
    int asc = 1, des = size/2;
    float retVal;
    if (!revBitSort2SingleIter(rev, i, asc, des, size/2))
        retVal = (float(rev) + 0.5)/float(size);
    if (!revBitSort2SingleIter(rev, i, asc, des, size/2))
        retVal = (float(rev) + 0.5)/float(size);
    if (!revBitSort2SingleIter(rev, i, asc, des, size/2))
        retVal = (float(rev) + 0.5)/float(size);
    if (!revBitSort2SingleIter(rev, i, asc, des, size/2))
        retVal = (float(rev) + 0.5)/float(size);
    if (!revBitSort2SingleIter(rev, i, asc, des, size/2))
        retVal = (float(rev) + 0.5)/float(size);
    if (!revBitSort2SingleIter(rev, i, asc, des, size/2))
        retVal = (float(rev) + 0.5)/float(size);
    if (!revBitSort2SingleIter(rev, i, asc, des, size/2))
        retVal = (float(rev) + 0.5)/float(size);
    if (!revBitSort2SingleIter(rev, i, asc, des, size/2))
        retVal = (float(rev) + 0.5)/float(size);
    if (!revBitSort2SingleIter(rev, i, asc, des, size/2))
        retVal = (float(rev) + 0.5)/float(size);
    if (!revBitSort2SingleIter(rev, i, asc, des, size/2))
        retVal = (float(rev) + 0.5)/float(size);
    if (!revBitSort2SingleIter(rev, i, asc, des, size/2))
        retVal = (float(rev) + 0.5)/float(size);
    if (!revBitSort2SingleIter(rev, i, asc, des, size/2))
        retVal = (float(rev) + 0.5)/float(size);
    return retVal;
}

vec3 revBitSort2NoForLoop(vec3 uvw) {
    int indexU = int(floor(uvw[0]*float(texelDimensions3D[0])));
    int indexV = int(floor(uvw[1]*float(texelDimensions3D[1])));
    int indexW = int(floor(uvw[2]*float(texelDimensions3D[2])));
    return vec3(
        revBitSort2SingleDimension(indexU, texelDimensions3D[0]),
        revBitSort2SingleDimension(indexV, texelDimensions3D[1]),
        revBitSort2SingleDimension(indexW, texelDimensions3D[2])
    );
}

vec3 revBitSort2(vec3 uvw) {
    #if (!defined(GL_ES) && __VERSION__ >= 120) || (defined(GL_ES) && __VERSION__ > 300)
    vec3 uvw2 = vec3(0.0, 0.0, 0.0);
    int indexU = int(floor(uvw[0]*float(texelDimensions3D[0])));
    int indexV = int(floor(uvw[1]*float(texelDimensions3D[1])));
    int indexW = int(floor(uvw[2]*float(texelDimensions3D[2])));
    // u
    int rev = int(0), i = indexU;
    for (int asc = 1,
         des = texelDimensions3D[0]/2; des > 0; des /= 2, asc *= 2) {
        if (i/des > 0) {
            rev += asc;
            i -= des;
        }
    }
    uvw2[0] = (float(rev) + 0.5)/float(texelDimensions3D[0]);
    // v
    rev = 0, i = indexV;
    for (int asc = 1,
         des = texelDimensions3D[1]/2; des > 0; des /= 2, asc *= 2) {
        if (i/des > 0) {
            rev += asc;
            i -= des;
        }
    }
    uvw2[1] = (float(rev) + 0.5)/float(texelDimensions3D[1]);
    // w
    rev = 0, i = indexW;
    for (int asc = 1,
         des = texelDimensions3D[2]/2; des > 0; des /= 2, asc *= 2) {
        if (i/des > 0) {
            rev += asc;
            i -= des;
        }
    }
    uvw2[2] = (float(rev) + 0.5)/float(texelDimensions3D[2]);
    return uvw2;
    #else
    return revBitSort2NoForLoop(uvw);
    #endif
}


void main() {
    vec3 uvw = to3DTextureCoordinates(UV);
    fragColor = texture2D(tex, to2DTextureCoordinates(revBitSort2(uvw)));
}