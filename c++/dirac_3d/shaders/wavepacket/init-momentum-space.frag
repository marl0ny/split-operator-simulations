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
#define complex2 vec4

// Expectation values
uniform vec3 position;
uniform vec3 momentum;

// Standard deviation (momentum space)
uniform vec3 sigma;

// Dimensions
uniform vec3 dimensions3D;
uniform ivec2 texelDimensions2D;
uniform ivec3 texelDimensions3D;

uniform complex2 spinor;

const float PI = 3.141592653589793;


complex mul(complex z1, complex z2) {
    return complex(z1.x*z2.x - z1.y*z2.y, 
                   z1.x*z2.y + z1.y*z2.x);
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

/* vec3 wavenumberToMomentum(ivec3 wavenumber) {
    float width = float(dimensions[0]);
    float height = float(dimensions[1]);
    float length_ = float(dimensions[2]);
    int texelWidth = texelDimensions[0];
    int texelHeight = texelDimensions[1];
    int texelLength = texelDimensions[2];
    vec3 wn = vec3(float(wavenumber.x)/float(texelWidth),
                   float(wavenumber.y)/float(texelHeight),
                   float(wavenumber.z)/float(texelLength));
    return 2.0*PI*vec3(
        wn.x/width, wn.y/height, 
        (texelDimensions[2] != 0)? wn.z/length_: 0.0);
}*/

vec3 getMomentum() {
    float u, v, w;
    float width, height, length_;
    int texelWidth, texelHeight, texelLength;
    width = dimensions3D[0];
    height = dimensions3D[1];
    length_ = dimensions3D[2];
    texelWidth = texelDimensions3D[0];
    texelHeight = texelDimensions3D[1];
    texelLength = texelDimensions3D[2];
    vec3 uvw = to3DTextureCoordinates(UV);
    u = uvw[0], v = uvw[1], w = uvw[2];
    float freqU = ((u < 0.5)? u: -1.0 + u)*float(texelWidth) - 0.5;
    float freqV = ((v < 0.5)? v: -1.0 + v)*float(texelHeight) - 0.5;
    float freqW = ((w < 0.5)? w: -1.0 + w)*float(texelLength) - 0.5;
    return vec3(2.0*PI*freqU/width, 2.0*PI*freqV/height, 
                2.0*PI*freqW/length_);
}

void main() {
    vec3 x = position;
    vec3 p = getMomentum();
    vec3 p0 = momentum;
    complex s0 = complex(spinor[0], spinor[1]);
    complex s1 = complex(spinor[2], spinor[3]);
    vec3 s = sigma;
    float dist = exp(-0.5*dot((p - p0)/s, (p - p0)/s));
    fragColor = dist*complex2(mul(s0, complex(cos(dot(p, x)), 
                                              sin(dot(p, x)))),
                              mul(s1, complex(cos(dot(p, x)), 
                                              sin(dot(p, x)))));
}
