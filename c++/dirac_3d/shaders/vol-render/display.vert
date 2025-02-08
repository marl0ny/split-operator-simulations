/* The attribute or input uvIndex contains the 2D coordinates represetation
of the volume render frame, which is then converted to 3D coordinates
and manipulated using the other uniforms.
It is also directly passed to the fragment shader as the varying or
out variable UV, so that it can be used to sample the volume data which
is stored in a 2D texture format. */
#if (__VERSION__ >= 330) || (defined(GL_ES) && __VERSION__ >= 300)
#define texture2D texture
#else
#define texture texture2D
#endif

#if (__VERSION__ > 120) || defined(GL_ES)
precision highp float;
#endif

#if __VERSION__ <= 120
attribute vec2 uvIndex;
varying vec2 UV;
#else
in vec2 uvIndex;
out vec2 UV;
#endif

#define quaternion vec4

uniform vec4 debugRotation;
uniform bool debugShow2DTexture;
uniform float scale;

uniform ivec3 texelDimensions3D;
uniform ivec2 texelDimensions2D;


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

vec4 project(vec4 x) {
    return vec4(x.x, x.y, 0.0, 1.0);
    /* vec4 y;
    y[0] = x[0]*5.0/(x[2] + 5.0);
    y[1] = x[1]*5.0/(x[2] + 5.0);
    y[2] = x[2];
    y[3] = 1.0;
    return y;*/
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

void main() {
    if (debugShow2DTexture) {
        gl_Position = vec4(2.0*(uvIndex - vec2(0.5, 0.5)), 0.0, 1.0);
        return;
    }
    UV = uvIndex.xy;
    vec4 viewPos = vec4(to3DTextureCoordinates(UV), 1.0)
                   - vec4(0.5, 0.5, 0.5, 0.0);
    gl_Position = project(2.0*scale*rotate(viewPos, debugRotation));
}
