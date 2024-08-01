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

vec3 revBitSort2(vec3 uvw) {
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
}


void main() {
    vec3 uvw = to3DTextureCoordinates(UV);
    fragColor = texture2D(tex, to2DTextureCoordinates(revBitSort2(uvw)));
}