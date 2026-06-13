/* For the 3D array data that's stored in the source texture,
    set those values along the 3D array boundaries to zero. */
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

uniform ivec3 texelDimensions3D;
uniform ivec2 texelDimensions2D;
uniform vec4 rotation;
uniform float viewScale;

uniform sampler2D tex;

#define quaternion vec4

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
    vec3 uvw = to3DTextureCoordinates(UV);
    vec3 dimensions3D = vec3(
        float(texelDimensions3D[0]),
        float(texelDimensions3D[1]),
        float(texelDimensions3D[2])
    );
    fragColor = texture2D(tex, UV);
    if (uvw[0] < 1.0/dimensions3D[0] || 
        uvw[0] > (dimensions3D[0] - 1.0)/dimensions3D[0] ||
        uvw[1] <  1.0/dimensions3D[1] || 
        uvw[1] > (dimensions3D[1] - 1.0)/dimensions3D[1] ||
        uvw[2] <  1.0/dimensions3D[2] || 
        uvw[2] > (dimensions3D[2] - 1.0)/dimensions3D[2])
        fragColor = vec4(0.0);
    vec4 viewPosition 
        = vec4(uvw - vec3(0.5), 1.0);
    float viewScaleAdj = viewScale;
    vec3 r = rotate(viewPosition, rotation).xyz*viewScaleAdj
         + vec3(0.5);
    if (r[0] < 1.0/dimensions3D[0] || 
        r[0] > (dimensions3D[0] - 1.0)/dimensions3D[0] ||
        r[1] <  1.0/dimensions3D[1] || 
        r[1] > (dimensions3D[1] - 1.0)/dimensions3D[1] ||
        r[2] <  1.0/dimensions3D[2] || 
        r[2] > (dimensions3D[2] - 1.0)/dimensions3D[2])
        fragColor = vec4(0.0);
} 
