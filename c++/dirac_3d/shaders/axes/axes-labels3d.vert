#if (__VERSION__ >= 330) || (defined(GL_ES) && __VERSION__ >= 300)
#define texture2D texture
#else
#define texture texture2D
#endif

#if (__VERSION__ > 120) || defined(GL_ES)
precision highp float;
#endif

#if __VERSION__ <= 120
attribute vec3 position;
varying vec4 COLOR;
#else
in vec3 position;
out vec4 COLOR;
#endif

#define quaternion vec4

uniform float viewScale;
uniform vec4 rotation;
uniform vec3 offset;
uniform bool usePerspectiveProjection;
uniform ivec2 screenDimensions;
uniform float colorScale;

quaternion mul(quaternion q1, quaternion q2) {
    quaternion q3;
    q3.w = q1.w*q2.w - q1.x*q2.x - q1.y*q2.y - q1.z*q2.z;
    q3.x = q1.w*q2.x + q1.x*q2.w + q1.y*q2.z - q1.z*q2.y; 
    q3.y = q1.w*q2.y + q1.y*q2.w + q1.z*q2.x - q1.x*q2.z; 
    q3.z = q1.w*q2.z + q1.z*q2.w + q1.x*q2.y - q1.y*q2.x;
    return q3; 
}

quaternion conj(quaternion r) {
    return vec4(-r.x, -r.y, -r.z, r.w);
}

quaternion rotate(quaternion x, quaternion r) {
    quaternion xr = mul(x, r);
    quaternion rInv = conj(r);
    quaternion x2 = mul(rInv, xr);
    x2.w = 1.0;
    return x2; 
}

vec4 project(vec4 x) {
    vec4 y;
    y[0] = x[0]*4.0/(x[2] + 4.0);
    y[1] = x[1]*4.0/(x[2] + 4.0);
    y[2] = x[2]/4.0;
    y[3] = 1.0;
    return y;
}

void main() {
    vec3 locOffset;
    vec2 letterScale;
    if (position[2] == 0.0) {
        locOffset = vec3(1.25, 0.0, 0.0);
        COLOR = vec4(colorScale, 0.0, 0.0, 1.0);
        letterScale = vec2(0.06, 0.1);
    } else if (position[2] == 1.0) {
        locOffset = vec3(0.0, 1.15, 0.0);
        COLOR = vec4(0.0, colorScale, 0.0, 1.0);
        letterScale = vec2(0.066, 0.1);
    } else if (position[2] == 2.0) {
        locOffset = vec3(0.0, 0.0, 1.25);
        COLOR = vec4(0.0, 0.0, colorScale, 1.0);
        letterScale = vec2(0.06, 0.09);
    }
    vec3 r = rotate(quaternion(locOffset, 1.0), 
                    rotation).xyz*viewScale;
    gl_Position = vec4(r, 1.0);
    if (usePerspectiveProjection) {
        gl_Position = project(vec4(r + offset, 1.0));
        gl_Position.xyz -= project(vec4(offset, 1.0)).xyz;
        gl_Position.y *= float(screenDimensions[0])/float(screenDimensions[1]);
        gl_Position.xyz += offset;
        gl_Position.xy += position.xy*viewScale*letterScale;
    } else {
        gl_Position.y *= float(screenDimensions[0])/float(screenDimensions[1]);
        gl_Position.z *= 0.1;
        gl_Position.xyz += offset;
        gl_Position.xy += position.xy*viewScale*letterScale;
    }
}
