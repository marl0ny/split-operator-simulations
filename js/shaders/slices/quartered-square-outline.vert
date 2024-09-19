#if __VERSION__ <= 120
attribute vec3 position;
varying vec2 UV; //Not actually used!
#else
in vec3 position;
out vec2 UV;
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

uniform vec3 cursorPosition;
uniform vec3 offset;
uniform float scale;
uniform quaternion rotation;
uniform ivec2 screenDimensions;


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

void main() {
    vec3 position2 = position;
    // Make the center vertex have the same position
    // as the cursor.
    if (abs(position.x) < 1e-30 && abs(position.y) < 1e-30) {
        position2 = cursorPosition;
    } else if (position.x == 0.0) {
        // Adjust the other vertices of the "cross" as well.
        position2.x = cursorPosition.x;
    } else if (position.y == 0.0) {
        position2.y = cursorPosition.y;
    }
    UV = position2.xy/2.0 + vec2(0.5, 0.5);
    gl_Position = rotate(quaternion(scale*(position2 + offset), 1.0),
                         rotation);
}
