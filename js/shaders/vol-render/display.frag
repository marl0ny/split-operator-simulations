/* The variable UV from the previous vertex shading step contains 
the 2D texture coordinate representation of the volume render.
It is 2D so that the gradient and density uniform textures are
properly sampled. These sampled gradient and density data points are used
together to determine how the pixel should be displayed.

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

uniform vec4 rotation;
uniform sampler2D gradientTex;
uniform sampler2D densityTex;

uniform ivec3 fragmentTexelDimensions3D;
uniform ivec2 fragmentTexelDimensions2D;
uniform float alphaBrightness;
uniform float colorBrightness;

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

vec2 to2DTextureCoordinates(vec3 uvw) {
    int width2D = fragmentTexelDimensions2D[0];
    int height2D = fragmentTexelDimensions2D[1];
    int width3D = fragmentTexelDimensions3D[0];
    int height3D = fragmentTexelDimensions3D[1];
    int length3D = fragmentTexelDimensions3D[2];
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
    int width3D = fragmentTexelDimensions3D[0];
    int height3D = fragmentTexelDimensions3D[1];
    int length3D = fragmentTexelDimensions3D[2];
    int width2D = fragmentTexelDimensions2D[0];
    int height2D = fragmentTexelDimensions2D[1];
    float wStack = float(width2D)/float(width3D);
    float hStack = float(height2D)/float(height3D);
    float u = mod(uv[0]*wStack, 1.0);
    float v = mod(uv[1]*hStack, 1.0);
    float w = (floor(uv[1]*hStack)*wStack
               + floor(uv[0]*wStack) + 0.5)/float(length3D);
    return vec3(u, v, w);
}


// void main() {
//     vec3 r = to3DTextureCoordinates(UV);
//     vec2 uv2 = to2DTextureCoordinates(r);
//     fragColor = vec4(r.z, r.z, r.z, length(r));
// }

// bilinear interpolation
vec4 blI(vec2 r, float x0, float y0, float x1, float y1,
         vec4 w00, vec4 w10, vec4 w01, vec4 w11) {
    float dx = x1 - x0, dy = y1 - y0;
    float ax = (dx == 0.0)? 0.0: (r.x - x0)/dx;
    float ay = (dy == 0.0)? 0.0: (r.y - y0)/dy;
    return mix(mix(w00, w10, ax), mix(w01, w11, ax), ay);
}

vec4 sample2DTextureAs3D(sampler2D tex, vec3 position) {
    vec3 r = position;
    float width3D = float(fragmentTexelDimensions3D[0]);
    float height3D = float(fragmentTexelDimensions3D[1]);
    float length3D = float(fragmentTexelDimensions3D[2]);
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

vec4 averageOutZSlice(sampler2D tex, vec3 r, vec3 dz) {
    ivec3 texelDimensions3D = fragmentTexelDimensions3D;
    vec3 dx = vec3(1.0/float(texelDimensions3D[0]), 0.0, 0.0);
    vec3 dy = vec3(0.0, 1.0/float(texelDimensions3D[1]), 0.0);
    vec4 vCC = texture2D(tex, to2DTextureCoordinates(r + dz));
    vec4 vRC = texture2D(tex, to2DTextureCoordinates(r + dx + dz));
    vec4 vRU = texture2D(tex, 
        to2DTextureCoordinates(r + dx + dy + dz));
    vec4 vCU = texture2D(tex, to2DTextureCoordinates(r + dy + dz));
    vec4 vLU = texture2D(tex,
        to2DTextureCoordinates(r - dx + dy + dz));
    vec4 vLC = texture2D(tex, to2DTextureCoordinates(r - dx + dz));
    vec4 vLD = texture2D(tex,
        to2DTextureCoordinates(r - dx - dy + dz));
    vec4 vCD = texture2D(tex, to2DTextureCoordinates(r - dy + dz));
    vec4 vRD = texture2D(tex,
        to2DTextureCoordinates(r + dx - dy + dz));
    return (vCC + vRC + vRU + vCU + vLU + vLC + vLD + vCD + vRD)/9.0;
}

vec4 averageOut(sampler2D tex, vec3 r) {
    ivec3 texelDimensions3D = fragmentTexelDimensions3D;
    vec3 dz = vec3(0.0, 0.0, 1.0/float(texelDimensions3D[2]));
    vec4 vC = averageOutZSlice(tex, r, vec3(0.0));
    vec4 vF = averageOutZSlice(tex, r, dz);
    vec4 vB = averageOutZSlice(tex, r, -dz);
    return (vC + vF + vB)/3.0;
}

vec4 gaussianFilter3x3x3(sampler2D tex, vec3 r)
{
    ivec3 texelDimensions3D = fragmentTexelDimensions3D;
    vec3 dx = vec3(1.0/float(texelDimensions3D[0]), 0.0, 0.0);
    vec3 dy = vec3(0.0, 1.0/float(texelDimensions3D[1]), 0.0);
    vec3 dz = vec3(0.0, 0.0, 1.0/float(texelDimensions3D[2]));
    vec4 g = vec4(0.0);
    g += 0.009658879892818452*texture2D(tex, 
        to2DTextureCoordinates(r + (-1.0)*dx + (-1.0)*dy + (-1.0)*dz));
    g += 0.012062481229969411*texture2D(tex, 
        to2DTextureCoordinates(r + (0.0)*dx + (-1.0)*dy + (-1.0)*dz));
    g += 0.009658879892818452*texture2D(tex, 
        to2DTextureCoordinates(r + (1.0)*dx + (-1.0)*dy + (-1.0)*dz));
    g += 0.012062481229969411*texture2D(tex, 
        to2DTextureCoordinates(r + (-1.0)*dx + (0.0)*dy + (-1.0)*dz));
    g += 0.015064216041401318*texture2D(tex, 
        to2DTextureCoordinates(r + (0.0)*dx + (0.0)*dy + (-1.0)*dz));
    g += 0.012062481229969411*texture2D(tex, 
        to2DTextureCoordinates(r + (1.0)*dx + (0.0)*dy + (-1.0)*dz));
    g += 0.009658879892818452*texture2D(tex, 
        to2DTextureCoordinates(r + (-1.0)*dx + (1.0)*dy + (-1.0)*dz));
    g += 0.012062481229969411*texture2D(tex, 
        to2DTextureCoordinates(r + (0.0)*dx + (1.0)*dy + (-1.0)*dz));
    g += 0.009658879892818452*texture2D(tex, 
        to2DTextureCoordinates(r + (1.0)*dx + (1.0)*dy + (-1.0)*dz));
    g += 0.012062481229969411*texture2D(tex, 
        to2DTextureCoordinates(r + (-1.0)*dx + (-1.0)*dy + (0.0)*dz));
    g += 0.015064216041401318*texture2D(tex, 
        to2DTextureCoordinates(r + (0.0)*dx + (-1.0)*dy + (0.0)*dz));
    g += 0.012062481229969411*texture2D(tex, 
        to2DTextureCoordinates(r + (1.0)*dx + (-1.0)*dy + (0.0)*dz));
    g += 0.01506421604140132*texture2D(tex, 
        to2DTextureCoordinates(r + (-1.0)*dx + (0.0)*dy + (0.0)*dz));
    g += 0.018812929165701035*texture2D(tex, 
        to2DTextureCoordinates(r + (0.0)*dx + (0.0)*dy + (0.0)*dz));
    g += 0.01506421604140132*texture2D(tex, 
        to2DTextureCoordinates(r + (1.0)*dx + (0.0)*dy + (0.0)*dz));
    g += 0.012062481229969411*texture2D(tex, 
        to2DTextureCoordinates(r + (-1.0)*dx + (1.0)*dy + (0.0)*dz));
    g += 0.015064216041401318*texture2D(tex, 
        to2DTextureCoordinates(r + (0.0)*dx + (1.0)*dy + (0.0)*dz));
    g += 0.012062481229969411*texture2D(tex, 
        to2DTextureCoordinates(r + (1.0)*dx + (1.0)*dy + (0.0)*dz));
    g += 0.009658879892818452*texture2D(tex, 
        to2DTextureCoordinates(r + (-1.0)*dx + (-1.0)*dy + (1.0)*dz));
    g += 0.012062481229969411*texture2D(tex, 
        to2DTextureCoordinates(r + (0.0)*dx + (-1.0)*dy + (1.0)*dz));
    g += 0.009658879892818452*texture2D(tex, 
        to2DTextureCoordinates(r + (1.0)*dx + (-1.0)*dy + (1.0)*dz));
    g += 0.012062481229969411*texture2D(tex, 
        to2DTextureCoordinates(r + (-1.0)*dx + (0.0)*dy + (1.0)*dz));
    g += 0.015064216041401318*texture2D(tex, 
        to2DTextureCoordinates(r + (0.0)*dx + (0.0)*dy + (1.0)*dz));
    g += 0.012062481229969411*texture2D(tex, 
        to2DTextureCoordinates(r + (1.0)*dx + (0.0)*dy + (1.0)*dz));
    g += 0.009658879892818452*texture2D(tex, 
        to2DTextureCoordinates(r + (-1.0)*dx + (1.0)*dy + (1.0)*dz));
    g += 0.012062481229969411*texture2D(tex, 
        to2DTextureCoordinates(r + (0.0)*dx + (1.0)*dy + (1.0)*dz));
    g += 0.009658879892818452*texture2D(tex, 
        to2DTextureCoordinates(r + (1.0)*dx + (1.0)*dy + (1.0)*dz));
    return g;
}

vec4 averageOutZDir(sampler2D tex, vec3 r) {
    ivec3 texelDimensions3D = fragmentTexelDimensions3D;
    vec3 dz = vec3(0.0, 0.0, 1.0/float(texelDimensions3D[2]));
    vec4 vB4 = texture2D(tex, to2DTextureCoordinates(r - 4.0*dz));
    vec4 vB3 = texture2D(tex, to2DTextureCoordinates(r - 3.0*dz));
    vec4 vB2 = texture2D(tex, to2DTextureCoordinates(r - 2.0*dz));
    vec4 vB1 = texture2D(tex, to2DTextureCoordinates(r - dz));
    vec4 vF0 = texture2D(tex, to2DTextureCoordinates(r));
    vec4 vF1 = texture2D(tex, to2DTextureCoordinates(r + dz));
    vec4 vF2 = texture2D(tex, to2DTextureCoordinates(r + 2.0*dz));
    vec4 vF3 = texture2D(tex, to2DTextureCoordinates(r + 3.0*dz));
    vec4 vF4 = texture2D(tex, to2DTextureCoordinates(r + 4.0*dz));
    return (vF4 + vF3 + vF2 + vF1 + vF0 + vB1 + vB2 + vB3 + vB4)/9.0;
}

vec4 gaussianZDir(sampler2D tex, vec3 r) {
    ivec3 texelDimensions3D = fragmentTexelDimensions3D;
    vec3 dz = vec3(0.0, 0.0, 1.0/float(texelDimensions3D[2]));
    // vec4 vB4 = texture2D(tex, to2DTextureCoordinates(r - 4.0*dz));
    vec4 vB3 = texture2D(tex, to2DTextureCoordinates(r - 3.0*dz));
    vec4 vB2 = texture2D(tex, to2DTextureCoordinates(r - 2.0*dz));
    vec4 vB1 = texture2D(tex, to2DTextureCoordinates(r - dz));
    vec4 vF0 = texture2D(tex, to2DTextureCoordinates(r));
    vec4 vF1 = texture2D(tex, to2DTextureCoordinates(r + dz));
    vec4 vF2 = texture2D(tex, to2DTextureCoordinates(r + 2.0*dz));
    vec4 vF3 = texture2D(tex, to2DTextureCoordinates(r + 3.0*dz));
    // vec4 vF4 = texture2D(tex, to2DTextureCoordinates(r + 4.0*dz));
    float wF0 = 0.26596152, wF1 = 0.21296534;
    float wF2 = 0.10934005, wF3 = 0.03599398;
    return (wF3*vF3 + wF2*vF2 + wF1*vF1 + wF0*vF0 
            + wF1*vB1 + wF2*vB2 + wF3*vB3);
}

vec4 laplacian(sampler2D tex, vec4 vc, vec3 r) {
    ivec3 texelDimensions3D = fragmentTexelDimensions3D;
    vec3 dx = vec3(1.0/float(texelDimensions3D[0]), 0.0, 0.0);
    vec3 dy = vec3(0.0, 1.0/float(texelDimensions3D[1]), 0.0);
    vec3 dz = vec3(0.0, 0.0, 1.0/float(texelDimensions3D[2]));
    vec2 zF = to2DTextureCoordinates(r + dz);
    vec2 zB = to2DTextureCoordinates(r - dz);
    vec2 xF = to2DTextureCoordinates(r + dx);
    vec2 xB = to2DTextureCoordinates(r - dx);
    vec2 yF = to2DTextureCoordinates(r + dy);
    vec2 yB = to2DTextureCoordinates(r - dy);
    vec4 vzF = texture2D(tex, zF);
    vec4 vzB = texture2D(tex, zB);
    vec4 vxF = texture2D(tex, xF);
    vec4 vxB = texture2D(tex, xB);
    vec4 vyF = texture2D(tex, yF);
    vec4 vyB = texture2D(tex, yB);
    return (vzF + vzB - 2.0*vc)/(dx[0]*dx[0]) 
            + (vyF + vyB - 2.0*vc)/(dy[1]*dy[1]) 
            + (vxF + vxB - 2.0*vc)/(dz[2]*dz[2]);
}

void main() {
    vec3 r = to3DTextureCoordinates(UV);
    vec2 uv2 = to2DTextureCoordinates(r);
    
    vec3 grad = texture2D(gradientTex, uv2).xyz;
    vec4 density = texture2D(densityTex, uv2);
    // density += 0.00001*laplacian(densityTex, density, r);

    // vec4 density = averageOutZSlice(densityTex, r, vec3(0.0, 0.0, 0.0));

    // vec4 density = gaussianFilter3x3x3(densityTex, r);
    // vec3 grad = gaussianFilter3x3x3(gradientTex, r).xyz;
    // vec4 density = gaussianZDir(densityTex, r);

    // vec3 grad = averageOutZDir(gradientTex, r).xyz;
    // vec4 density = averageOutZDir(densityTex, r);

    // vec3 grad = averageOut(gradientTex, r).xyz;
    // vec4 density = averageOut(densityTex, r);

    // vec3 grad = sample2DTextureAs3D(gradientTex, r).xyz;
    // vec4 density = sample2DTextureAs3D(densityTex, r);
    vec3 normal = rotate(quaternion(0.0, 0.0, 1.0, 1.0),
                         conj(rotation)).xyz;
    vec4 pix = density;
    
    // pix.a = pix.b;
    // lf (length(grad) < 0.0000001) discard;
    if (pix.a < 0.05) discard;
    if (dot(grad, grad) == 0.0) discard;
    // fragColor = 4.0*pix;
    float a = dot(normal, normalize(grad));
    if (a <= 0.0) discard;
    
    // fragColor = vec4(1.0*normalize(density.rgb), a*a);
    
    // float densityLength = length(density.rgb);
    // if (densityLength == 0.0) discard;
    // fragColor = vec4(density.rgb/densityLength, a);
    
    fragColor = vec4(normalize(density.rgb)*colorBrightness, a*alphaBrightness);
    
    // fragColor = vec4(4.0*normalize(density.rgb), 0.1*a);
    // fragColor = vec4(1.0);
}