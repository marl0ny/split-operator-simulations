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

#define XY_SLICE 0
#define ZY_SLICE 1
#define XZ_SLICE 2
uniform int orientation;
uniform int slice;
uniform bool showAxis;
uniform bool showOutline;
uniform float alpha;

uniform sampler2D tex;
uniform ivec3 sourceTexelDimensions3D;
uniform ivec2 sourceTexelDimensions2D;


vec2 to2DSourceTextureCoordinates(vec3 uvw) {
    int width2D = sourceTexelDimensions2D[0];
    int height2D = sourceTexelDimensions2D[1];
    int width3D = sourceTexelDimensions3D[0];
    int height3D = sourceTexelDimensions3D[1];
    int length3D = sourceTexelDimensions3D[2];
    float wStack = float(width2D)/float(width3D);
    // float hStack = float(height2D)/float(height3D);
    float xIndex = float(width3D)*mod(uvw[0], 1.0);
    float yIndex = float(height3D)*mod(uvw[1], 1.0);
    float zIndex = mod(floor(float(length3D)*uvw[2]), float(length3D));
    float uIndex = mod(zIndex, wStack)*float(width3D) + xIndex; 
    float vIndex = floor(zIndex / wStack)*float(height3D) + yIndex; 
    return vec2(uIndex/float(width2D), vIndex/float(height2D));
}

// bilinear interpolation
vec4 blI(vec2 r, float x0, float y0, float x1, float y1,
         vec4 w00, vec4 w10, vec4 w01, vec4 w11) {
    float dx = x1 - x0, dy = y1 - y0;
    float ax = (dx == 0.0)? 0.0: (r.x - x0)/dx;
    float ay = (dy == 0.0)? 0.0: (r.y - y0)/dy;
    return mix(mix(w00, w10, ax), mix(w01, w11, ax), ay);
}

/*
Currently this assumes that the texture being sampled from
is smaller for all dimensions than the texture being
rendered to.
*/
vec4 sample2DTextureAs3D(sampler2D tex, vec3 position) {
    vec3 r = position;
    float width3D = float(sourceTexelDimensions3D[0]);
    float height3D = float(sourceTexelDimensions3D[1]);
    float length3D = float(sourceTexelDimensions3D[2]);
    float x0 = (floor(r.x*width3D - 0.5) + 0.5)/width3D;
    float y0 = (floor(r.y*height3D - 0.5) + 0.5)/height3D;
    float z0 = (floor(r.z*length3D - 0.5) + 0.5)/length3D;
    float x1 = (ceil(r.x*width3D - 0.5) + 0.5)/width3D;
    float y1 = (ceil(r.y*height3D - 0.5) + 0.5)/height3D;
    float z1 = (ceil(r.z*length3D - 0.5) + 0.5)/length3D;
    vec3 r000 = vec3(x0, y0, z0);
    vec3 r100 = vec3(x1, y0, z0);
    vec3 r010 = vec3(x0, y1, z0);
    vec3 r001 = vec3(x0, y0, z1);
    vec3 r110 = vec3(x1, y1, z0);
    vec3 r101 = vec3(x1, y0, z1);
    vec3 r011 = vec3(x0, y1, z1);
    vec3 r111 = vec3(x1, y1, z1);
    vec4 f000 = texture2D(tex, to2DSourceTextureCoordinates(r000));
    vec4 f100 = texture2D(tex, to2DSourceTextureCoordinates(r100));
    vec4 f010 = texture2D(tex, to2DSourceTextureCoordinates(r010));
    vec4 f001 = texture2D(tex, to2DSourceTextureCoordinates(r001));
    vec4 f110 = texture2D(tex, to2DSourceTextureCoordinates(r110));
    vec4 f101 = texture2D(tex, to2DSourceTextureCoordinates(r101));
    vec4 f011 = texture2D(tex, to2DSourceTextureCoordinates(r011));
    vec4 f111 = texture2D(tex, to2DSourceTextureCoordinates(r111));
    vec4 f0 = blI(r.xy, x0, y0, x1, y1, f000, f100, f010, f110);
    vec4 f1 = blI(r.xy, x0, y0, x1, y1, f001, f101, f011, f111);
    // Originally I made a mistake with the interpolation
    // where I neglected to consider the edge case of sampling a point at
    // at z0 (or x0 or y0) which resulted in a zero denominator for
    // some calculations.
    float dz = z1 - z0;
    return mix(f0, f1, (dz == 0.0)? 0.0: (r.z - z0)/dz);
}

void main() {
    vec3 uvw;
    if (orientation == XY_SLICE) {
        float z = (float(slice) + 0.5)/float(sourceTexelDimensions3D[2]);
        uvw = vec3(UV[0], UV[1], z);
    } else if (orientation == ZY_SLICE) { 
        float x = (float(slice) + 0.5)/float(sourceTexelDimensions3D[0]);
        uvw = vec3(x, UV[1], UV[0]);
    } else if (orientation == XZ_SLICE) {
        float y = (float(slice) + 0.5)/float(sourceTexelDimensions3D[1]);
        uvw = vec3(UV[0], y, UV[1]);
    }
    // fragColor = vec4(1.0);
    // fragColor = vec4(5.0*uv[0], 0.0, 0.0, 1.0);
    fragColor = vec4(sample2DTextureAs3D(tex, uvw).rgb, alpha);
    // fragColor = vec4(1.0, 1.0, 1.0, 1.0);
    if (showAxis) {
        if (abs(UV[0] - 0.5) < 1.0/float(sourceTexelDimensions2D[0]) ||
            abs(UV[1] - 0.5) < 1.0/float(sourceTexelDimensions2D[1])) {
            fragColor += vec4(1.0, 1.0, 1.0, 0.0);
        }
    }
    if (showOutline) {
        float d = 0.01;
        float col = smoothstep(1.0 - d, 1.0, 1.0 - UV[0])
                        + smoothstep(1.0 - d, 1.0, UV[0])
                        + smoothstep(1.0 - d, 1.0, 1.0 - UV[1])
                        + smoothstep(1.0 - d, 1.0, UV[1]);
        fragColor += vec4(col);
    }
}