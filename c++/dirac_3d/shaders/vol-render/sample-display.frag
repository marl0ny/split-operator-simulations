/* The variable UV from the previous vertex shading step contains 
the 2D texture coordinate representation of the volume render.
It is in 2D because the gradient and density are stored in 2D textures.
These sampled gradient and density data points are combined to determine
how the pixel should be displayed.

This corresponds to the shading step as given on the Wikipedia
page for Volume ray casting.

References:

Volume ray casting - Wikipedia
https://en.wikipedia.org/wiki/Volume_ray_casting

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

#define quaternion vec4

uniform float viewScale;

uniform vec4 rotation;
uniform sampler2D gradientTex;
uniform sampler2D densityTex;

uniform ivec3 sampleTexelDimensions3D;
uniform ivec2 sampleTexelDimensions2D;
uniform ivec3 viewTexelDimensions3D;
uniform ivec2 viewTexelDimensions2D;

quaternion mul(quaternion q1, quaternion q2) {
    quaternion q3;
    q3.w = q1.w*q2.w - q1.x*q2.x - q1.y*q2.y - q1.z*q2.z;
    q3.x = q1.w*q2.x + q1.x*q2.w + q1.y*q2.z - q1.z*q2.y; 
    q3.y = q1.w*q2.y + q1.y*q2.w + q1.z*q2.x - q1.x*q2.z; 
    q3.z = q1.w*q2.z + q1.z*q2.w + q1.x*q2.y - q1.y*q2.x;
    return q3; 
}

quaternion conj(quaternion r) {
    return quaternion(-r.x, -r.y, -r.z, r.w);
}

quaternion rotate(quaternion x, quaternion r) {
    quaternion xr = mul(x, r);
    quaternion rInv = conj(r);
    quaternion x2 = mul(rInv, xr);
    x2.w = 1.0;
    return x2; 
}

/* Sample and interpolate data points from the texture containing the 
initial raw 3D volumetric data to points on volume render frame.
This corresponds to the sampling step given in the Wikipedia page
for volume ray casting.

References:

Volume ray casting - Wikipedia
https://en.wikipedia.org/wiki/Volume_ray_casting

*/

vec2 to2DSampleTextureCoordinates(vec3 uvw) {
    int width2D = sampleTexelDimensions2D[0];
    int height2D = sampleTexelDimensions2D[1];
    int width3D = sampleTexelDimensions3D[0];
    int height3D = sampleTexelDimensions3D[1];
    int length3D = sampleTexelDimensions3D[2];
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
    float width3D = float(sampleTexelDimensions3D[0]);
    float height3D = float(sampleTexelDimensions3D[1]);
    float length3D = float(sampleTexelDimensions3D[2]);
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
    vec4 f000 = texture2D(tex, to2DSampleTextureCoordinates(r000));
    vec4 f100 = texture2D(tex, to2DSampleTextureCoordinates(r100));
    vec4 f010 = texture2D(tex, to2DSampleTextureCoordinates(r010));
    vec4 f001 = texture2D(tex, to2DSampleTextureCoordinates(r001));
    vec4 f110 = texture2D(tex, to2DSampleTextureCoordinates(r110));
    vec4 f101 = texture2D(tex, to2DSampleTextureCoordinates(r101));
    vec4 f011 = texture2D(tex, to2DSampleTextureCoordinates(r011));
    vec4 f111 = texture2D(tex, to2DSampleTextureCoordinates(r111));
    vec4 f0 = blI(r.xy, x0, y0, x1, y1, f000, f100, f010, f110);
    vec4 f1 = blI(r.xy, x0, y0, x1, y1, f001, f101, f011, f111);
    // Originally I made a mistake with the interpolation
    // where I neglected to consider the edge case of sampling a point at
    // at z0 (or x0 or y0) which resulted in a zero denominator for
    // some calculations. This created black spots in the final render.
    float dz = z1 - z0;
    return mix(f0, f1, (dz == 0.0)? 0.0: (r.z - z0)/dz);
}

vec3 to3DTextureCoordinates(vec2 uv) {
    int width3D = viewTexelDimensions3D[0];
    int height3D = viewTexelDimensions3D[1];
    int length3D = viewTexelDimensions3D[2];
    int width2D = viewTexelDimensions2D[0];
    int height2D = viewTexelDimensions2D[1];
    float wStack = float(width2D)/float(width3D);
    float hStack = float(height2D)/float(height3D);
    float u = mod(uv[0]*wStack, 1.0);
    float v = mod(uv[1]*hStack, 1.0);
    float w = (floor(uv[1]*hStack)*wStack
               + floor(uv[0]*wStack) + 0.5)/float(length3D);
    return vec3(u, v, w);
}


void main() {
    // float viewScaleAdj = max(viewScale, 2.0);
    vec3 r = to3DTextureCoordinates(UV);
    vec3 rSampler = rotate(quaternion(r - vec3(0.5), 1.0), 
                           conj(rotation)).xyz/viewScale + vec3(0.5);

    // This check needs to be done to avoid a repeating effect
    // caused by sampling beyond the initial boundary.
    if (rSampler.x < 0.0 || rSampler.x >= 1.0 ||
        rSampler.y < 0.0 || rSampler.y >= 1.0 ||
        rSampler.z < 0.0 || rSampler.z >= 1.0) 
        discard;

    vec3 grad = sample2DTextureAs3D(gradientTex, rSampler).xyz;
    vec4 density = sample2DTextureAs3D(densityTex, rSampler);
    if (density.a < 0.05)
        discard;
    if (dot(grad, grad) == 0.0)
        discard;

    vec3 normal = rotate(quaternion(0.0, 0.0, 1.0, 1.0),
                         conj(rotation)).xyz;
    float a = dot(normal, normalize(grad));
    if (a <= 0.0)
        discard;
    fragColor = vec4(normalize(density.rgb), 0.1*a);
}