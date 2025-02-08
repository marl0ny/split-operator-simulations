/* Shader for sketching a potential */
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

#define complex vec2
#define PI 3.141592653589793

uniform sampler2D tex;
uniform vec3 location;
uniform float amplitude;
uniform vec3 sigma;

uniform ivec3 texelDimensions3D;
uniform ivec2 texelDimensions2D;

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
    complex oldVal = texture2D(tex, UV).xy;
    float x0 = location.x;
    float y0 = location.y;
    float z0 = location.z;
    float sigmaX = sigma[0];
    float sigmaY = sigma[1];
    float sigmaZ = sigma[2];
    vec3 xyz = to3DTextureCoordinates(UV);
    float x = xyz.x, y = xyz.y, z = xyz.z;
    float gx = exp(-0.5*(x - x0)*(x - x0)/(sigmaX*sigmaX));
    float gy = exp(-0.5*(y - y0)*(y - y0)/(sigmaY*sigmaY));
    float gz = exp(-0.5*(z - z0)*(z - z0)/(sigmaZ*sigmaZ));
    complex newVal = oldVal + amplitude*complex(gx*gy*gz, 0.0);
    if (newVal.x > 2.0)
        newVal.x = (oldVal.x < 2.0)? 2.0: oldVal.x;
    if (newVal.x < 0.0)
        newVal.x = (oldVal.x > 0.0)? 0.0: oldVal.x; 
    fragColor = vec4(newVal, newVal);

}
