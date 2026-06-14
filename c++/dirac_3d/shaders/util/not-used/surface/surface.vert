 
#if __VERSION__ <= 120
attribute vec2 position;
varying vec2 UV;
varying vec3 FINAL_VERTEX_POSITION;
varying vec3 NORMAL;
#else
in vec2 position;
out vec2 UV;
out vec3 FINAL_VERTEX_POSITION;
out vec3 NORMAL;
#endif

#if (__VERSION__ >= 330) || (defined(GL_ES) && __VERSION__ >= 300)
#define texture2D texture
#else
#define texture texture2D
#endif

#if (__VERSION__ > 120) || defined(GL_ES)
precision highp float;
#endif
    

#define quaternion vec4

#define complex vec2

uniform sampler2D heightTex;
uniform quaternion rotation;
uniform ivec2 screenDimensions;
uniform vec3 translate;
uniform float heightScale;
uniform float scale;
uniform ivec2 dimensions2D;
const int REAL_DATA_TYPE = 0;
const int COMPLEX_DATA_TYPE = 1;
uniform int heightDataType;

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

vec3 getNormal(vec2 xy) {
    float x = xy[0], y = xy[1];
    float dx = 1.0/float(dimensions2D[0]);
    float dy = 1.0/float(dimensions2D[1]);
    float height = heightScale*texture2D(
        heightTex, xy)[0];
    float heightR = heightScale*texture2D(
        heightTex, xy + vec2(dx, 0.0))[0];
    float heightU = heightScale*texture2D(
        heightTex, xy + vec2(0.0, dy))[0];
    vec3 vC = vec3(x, y, height);
    vec3 vR = vec3(x + dx, y, heightR);
    vec3 vU = vec3(x, y + dy, heightU);
    vec3 eU = vU - vC;
    vec3 eR = vR - vC;
    /* Note that since the z-axis points away from the screen,
    and that the surface height map is inverted in the other direction,
    these normal vectors point into the surface instead of away.
    */
    return normalize(mul(quaternion(eR, 0.0), quaternion(eU, 0.0)).xyz);
}


void main() {
    UV = position;
    float height = texture2D(heightTex, UV)[0];
    if (heightDataType == COMPLEX_DATA_TYPE) {
        complex psi = texture2D(heightTex, UV).xy;
        height = psi.x*psi.x + psi.y*psi.y;
    }
    vec4 position2 = scale*(vec4(UV - vec2(0.5, 0.5), 0.0, 0.0) 
                            + vec4(0.0, 0.0, -heightScale*height, 0.0));

    // vec4 finalPosition = vec4(position2.xyz, 1.0);
    vec4 finalPosition = rotate(position2, rotation) + vec4(translate, 0.0);

    NORMAL = rotate(quaternion(-getNormal(UV), 1.0), conj(rotation)).xyz;
    FINAL_VERTEX_POSITION = finalPosition.xyz;
    gl_Position = project(finalPosition);
}   