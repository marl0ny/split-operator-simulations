/* Generate a new wavepacket. */
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

complex mul(complex a, complex b) {
    return complex(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
}

uniform float amplitude;
uniform vec3 waveNumber;
uniform vec3 texOffset;
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

complex wavepacket(vec3 r) {
    float sx = sigma.x;
    float sy = sigma.y;
    float sz = sigma.z;
    float gx = exp(-0.25*pow(r.x/sx, 2.0))/sqrt(sx*sqrt(2.0*PI));
    float gy = exp(-0.25*pow(r.y/sy, 2.0))/sqrt(sy*sqrt(2.0*PI));
    float gz = exp(-0.25*pow(r.z/sz, 2.0))/sqrt(sz*sqrt(2.0*PI));
    float g = gx*gy*gz;
    complex phase = complex(cos(2.0*PI*dot(waveNumber, r)),
                            sin(2.0*PI*dot(waveNumber, r)));
    return amplitude*g*phase;
}

void main() {
    vec3 r = to3DTextureCoordinates(UV) - texOffset;
    complex w =
        + wavepacket(vec3(r.x + (-1.0), r.y + (-1.0), r.z + (-1.0)))
        + wavepacket(vec3(r.x + (-1.0), r.y + (-1.0), r.z + (0.0)))
        + wavepacket(vec3(r.x + (-1.0), r.y + (-1.0), r.z + (1.0)))
        + wavepacket(vec3(r.x + (-1.0), r.y + (0.0), r.z + (-1.0)))
        + wavepacket(vec3(r.x + (-1.0), r.y + (0.0), r.z + (0.0)))
        + wavepacket(vec3(r.x + (-1.0), r.y + (0.0), r.z + (1.0)))
        + wavepacket(vec3(r.x + (-1.0), r.y + (1.0), r.z + (-1.0)))
        + wavepacket(vec3(r.x + (-1.0), r.y + (1.0), r.z + (0.0)))
        + wavepacket(vec3(r.x + (-1.0), r.y + (1.0), r.z + (1.0)))
        + wavepacket(vec3(r.x + (0.0), r.y + (-1.0), r.z + (-1.0)))
        + wavepacket(vec3(r.x + (0.0), r.y + (-1.0), r.z + (0.0)))
        + wavepacket(vec3(r.x + (0.0), r.y + (-1.0), r.z + (1.0)))
        + wavepacket(vec3(r.x + (0.0), r.y + (0.0), r.z + (-1.0)))
        + wavepacket(vec3(r.x + (0.0), r.y + (0.0), r.z + (0.0)))
        + wavepacket(vec3(r.x + (0.0), r.y + (0.0), r.z + (1.0)))
        + wavepacket(vec3(r.x + (0.0), r.y + (1.0), r.z + (-1.0)))
        + wavepacket(vec3(r.x + (0.0), r.y + (1.0), r.z + (0.0)))
        + wavepacket(vec3(r.x + (0.0), r.y + (1.0), r.z + (1.0)))
        + wavepacket(vec3(r.x + (1.0), r.y + (-1.0), r.z + (-1.0)))
        + wavepacket(vec3(r.x + (1.0), r.y + (-1.0), r.z + (0.0)))
        + wavepacket(vec3(r.x + (1.0), r.y + (-1.0), r.z + (1.0)))
        + wavepacket(vec3(r.x + (1.0), r.y + (0.0), r.z + (-1.0)))
        + wavepacket(vec3(r.x + (1.0), r.y + (0.0), r.z + (0.0)))
        + wavepacket(vec3(r.x + (1.0), r.y + (0.0), r.z + (1.0)))
        + wavepacket(vec3(r.x + (1.0), r.y + (1.0), r.z + (-1.0)))
        + wavepacket(vec3(r.x + (1.0), r.y + (1.0), r.z + (0.0)))
        + wavepacket(vec3(r.x + (1.0), r.y + (1.0), r.z + (1.0)))
        ;
    fragColor = vec4(w, w.r, w.r);
}
