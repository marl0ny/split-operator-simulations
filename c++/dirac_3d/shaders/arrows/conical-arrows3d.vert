#if __VERSION__ <= 120
attribute vec2 texCoord;
attribute vec4 localCoord;
varying vec2 UV;
varying float LENGTH;
varying vec3 FINAL_VERTEX_POSITION;
varying vec3 NORMAL;
#else
in vec2 texCoord;
in vec4 localCoord;
out vec2 UV;
out float LENGTH;
out vec3 NORMAL;
out vec3 FINAL_VERTEX_POSITION;
#endif

#if (__VERSION__ >= 330) || (defined(GL_ES) && __VERSION__ >= 300)
#define texture2D texture
#else
#define texture texture2D
#endif

#if (__VERSION__ > 120) || defined(GL_ES)
precision highp float;
#endif

#define PI 3.141592653589793

#define quaternion vec4

uniform sampler2D vecTex;
uniform float arrowScale;
uniform float maxLength;
uniform quaternion rotation;
uniform vec3 translate;
uniform float scale;
uniform ivec2 screenDimensions;
uniform ivec2 texelDimensions2D;
uniform ivec3 texelDimensions3D;
uniform ivec2 arrowsDimensions2D;
uniform ivec3 arrowsDimensions3D;
uniform bool useOrthogonalProjection;
uniform bool rescaleZ;


quaternion mul(quaternion q1, quaternion q2) {
    quaternion q3;
    q3.w = q1.w*q2.w - q1.x*q2.x - q1.y*q2.y - q1.z*q2.z;
    q3.x = q1.w*q2.x + q1.x*q2.w + q1.y*q2.z - q1.z*q2.y; 
    q3.y = q1.w*q2.y + q1.y*q2.w + q1.z*q2.x - q1.x*q2.z; 
    q3.z = q1.w*q2.z + q1.z*q2.w + q1.x*q2.y - q1.y*q2.x;
    return q3; 
}

quaternion conj(quaternion q) {
    return quaternion(-q.x, -q.y, -q.z, q.w);
}

quaternion rotate(quaternion x, quaternion r) {
    return quaternion(mul(conj(r), mul(x, r)).xyz, 1.0);
}

vec4 project(vec4 x) {
    vec4 y;
    y[0] = x[0]*4.0/(x[2] + 4.0);
    y[1] = float(screenDimensions[0])/float(screenDimensions[1])
            *x[1]*4.0/(x[2] + 4.0);
    y[2] = x[2]/4.0;
    y[3] = 1.0;
    return y;
}

vec2 transform(vec2 r, float ratio, float scale) {
    float h = sqrt(1.0 + ratio*ratio);
    float c = 1.0/h, s = ratio/h;
    return  scale*vec2(
        r.x*c - r.y*s, 
        r.x*s + r.y*c
    );
}

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

vec3 arrow3DPosition(vec2 uv) {
    int width3D = arrowsDimensions3D[0];
    int height3D = arrowsDimensions3D[1];
    int length3D = arrowsDimensions3D[2];
    int width2D = arrowsDimensions2D[0];
    int height2D = arrowsDimensions2D[1];
    float wStack = float(width2D)/float(width3D);
    float hStack = float(height2D)/float(height3D);
    float u = mod(uv[0]*wStack, 1.0);
    float v = mod(uv[1]*hStack, 1.0);
    float w = (floor(uv[1]*hStack)*wStack
               + floor(uv[0]*wStack) + 0.5)/float(length3D);
    return vec3(u, v, w);
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

vec2 rotate2D(vec2 r, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(
        c*r.x - s*r.y,
        s*r.x + c*r.y
    );
}

const float TAIL_LENGTH = 0.8;

bool inTail(float z) {
    float eps = 1e-30;
    return (abs(z) < eps || abs(z - TAIL_LENGTH) < eps);
}

vec3 getNonRotatedNormal(
    float phi, float z, float cosTheta,
    vec3 xH, vec3 yH, vec3 zH) {
    float sinTheta = sqrt(1.0 - cosTheta*cosTheta);
    vec3 localNorm = vec3(
        sinTheta*rotate2D(vec2(1.0, 0.0), phi), cosTheta);
    // if (inTail(z))
    //     localNorm = vec3(
    //         sinTheta*rotate2D(vec2(1.0, 0.0), phi - PI/4.0), cosTheta);
    return localNorm.x*xH + localNorm.y*yH + localNorm.z*zH;
}

void main() {
    UV = texCoord;
    vec3 arrowPos = arrow3DPosition(texCoord);
    float phi = localCoord[1];
    float z = localCoord[2];
    float cosTheta = localCoord[3];
    vec3 direction = sample2DTextureAs3D(vecTex, arrowPos).xyz;
    direction.z = -direction.z;
    if (length(direction) > maxLength)
        direction = normalize(direction)*maxLength;
    LENGTH = length(direction);
    float radius = LENGTH*localCoord[0];
    vec3 perp1 = cross(direction, vec3(0.0, 0.0, 1.0));
    if (dot(perp1, perp1) == 0.0)
        perp1 = (cross(direction, vec3(0.0, 1.0, 0.0)));
    perp1 = normalize(perp1);
    vec3 perp2 = cross(direction/LENGTH, perp1);
    vec2 rOffset = rotate2D(vec2(radius, 0.0), phi);
    vec3 zOffset = z*direction;
    vec3 offset = rOffset.x*perp1 + rOffset.y*perp2 + zOffset;
    if (LENGTH < 1e-2) {
        offset = vec3(0.0);
    }
    vec4 finalPosition = scale*rotate(
        vec4(arrowPos - vec3(0.5) + offset, 0.0), rotation) 
        + vec4(translate, 0.0);
    vec3 nonRotatedNormal = getNonRotatedNormal(
        phi, z, cosTheta, perp1, perp2, direction/LENGTH);
    NORMAL = rotate(quaternion(
        nonRotatedNormal, 1.0), rotation).xyz;
    FINAL_VERTEX_POSITION = vec3(finalPosition.xyz);
    finalPosition = (useOrthogonalProjection)? 
        vec4(finalPosition.xyz, 1.0): project(finalPosition);
    if (rescaleZ)
        finalPosition.z = finalPosition.z/100.0 - 0.01;
    // finalPosition.z = -finalPosition.z;
    gl_Position = finalPosition;
    if (useOrthogonalProjection)
        gl_Position.y *=
            float(screenDimensions[0])/float(screenDimensions[1]);
    
}