/* Compute the electric fields from the four-vector potential in 3D,
using finite difference approximations for derivatives.
The field values are computed along a uniform staggered grid that's
offset (dx/2, dy/2, dz/2) away from the grid of four-vector potential values.*/
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

uniform sampler2D prevATex;
uniform sampler2D currATex;
uniform ivec3 texelDimensions3D;
uniform ivec2 texelDimensions2D;
uniform vec3 dimensions3D;
uniform float dt;

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

/* Bilinear interpolation */
vec4 blI(vec2 r, float x0, float y0, float x1, float y1,
         vec4 w00, vec4 w10, vec4 w01, vec4 w11) {
    float dx = x1 - x0, dy = y1 - y0;
    float ax = (dx == 0.0)? 0.0: (r.x - x0)/dx;
    float ay = (dy == 0.0)? 0.0: (r.y - y0)/dy;
    return mix(mix(w00, w10, ax), mix(w01, w11, ax), ay);
}

vec4 sample2DTextureAs3D(sampler2D tex, vec3 position) {
    vec3 r = position;
    float width3D = float(texelDimensions3D[0]);
    float height3D = float(texelDimensions3D[1]);
    float length3D = float(texelDimensions3D[2]);
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
    vec4 f000 = texture2D(tex, to2DTextureCoordinates(r000));
    vec4 f100 = texture2D(tex, to2DTextureCoordinates(r100));
    vec4 f010 = texture2D(tex, to2DTextureCoordinates(r010));
    vec4 f001 = texture2D(tex, to2DTextureCoordinates(r001));
    vec4 f110 = texture2D(tex, to2DTextureCoordinates(r110));
    vec4 f101 = texture2D(tex, to2DTextureCoordinates(r101));
    vec4 f011 = texture2D(tex, to2DTextureCoordinates(r011));
    vec4 f111 = texture2D(tex, to2DTextureCoordinates(r111));
    vec4 f0 = blI(r.xy, x0, y0, x1, y1, f000, f100, f010, f110);
    vec4 f1 = blI(r.xy, x0, y0, x1, y1, f001, f101, f011, f111);
    // Originally I made a mistake with the interpolation
    // where I neglected to consider the edge case of sampling a point at
    // at z0 (or x0 or y0) which resulted in a zero denominator for
    // some calculations. This created black spots in the final render.
    float dz = z1 - z0;
    return mix(f0, f1, (dz == 0.0)? 0.0: (r.z - z0)/dz);
}

vec4 timeAverage(sampler2D tex0, sampler2D tex1, vec3 offset) {
    vec4 a0 = sample2DTextureAs3D(tex0, offset);
    vec4 a1 = sample2DTextureAs3D(tex1, offset);
    return (a1 + a0)/2.0;
}

vec3 gradV(sampler2D prevATex, sampler2D currATex) {
    float dx = dimensions3D[0]/float(texelDimensions3D[0]);
    float dy = dimensions3D[1]/float(texelDimensions3D[1]);
    float dz = dimensions3D[2]/float(texelDimensions3D[2]);
    float du = 1.0/float(texelDimensions3D[0]);
    float dv = 1.0/float(texelDimensions3D[1]);
    float dw = 1.0/float(texelDimensions3D[2]);
    vec3 uvw = to3DTextureCoordinates(UV);
    float upV 
        = timeAverage(prevATex, currATex, uvw + 0.5*vec3(du, 2.0*dv, dw)).w;
    float downV
        = timeAverage(prevATex, currATex, uvw + 0.5*vec3(du, 0.0, dw)).w;
    float leftV
        = timeAverage(prevATex, currATex, uvw + 0.5*vec3(0.0, dv, dw)).w;
    float rightV
        = timeAverage(prevATex, currATex, uvw + 0.5*vec3(2.0*du, dv, dw)).w;
    float forwardV
        = timeAverage(prevATex, currATex, uvw + 0.5*vec3(0.0, 0.0, 2.0*dw)).w;
    float backwardV
        = timeAverage(prevATex, currATex, uvw + 0.5*vec3(0.0, 0.0, 0.0)).w;
    return vec3(
        (rightV - leftV)/dx, (upV - downV)/dy, (forwardV - backwardV)/dz);
}

vec3 dAdt(sampler2D prevATex, sampler2D currATex) {
    float du = 1.0/float(texelDimensions3D[0]);
    float dv = 1.0/float(texelDimensions3D[1]);
    float dw = 1.0/float(texelDimensions3D[2]);
    vec3 uvw = to3DTextureCoordinates(UV);
    vec3 prevA 
        = sample2DTextureAs3D(prevATex, uvw + 0.5*vec3(du, dv, dw)).xyz;
    vec3 currA
        = sample2DTextureAs3D(currATex, uvw + 0.5*vec3(du, dv, dw)).xyz;
    return (currA - prevA)/dt;
}

void main() {
    fragColor = vec4(
        -gradV(prevATex, currATex) - dAdt(prevATex, currATex), 1.0);
    
}