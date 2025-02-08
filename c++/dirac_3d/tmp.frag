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
const float PI = 3.141592653589793;

uniform complex t;

const complex IMAG_UNIT = complex(0.0, 1.0); 

float absSquared(complex z) {
    return z.x*z.x + z.y*z.y;
}

complex absC(complex z) {
    return complex(sqrt(absSquared(z)), 0.0);
}

complex stepC(complex z) {
    return complex((z.x > 0.0)? 1.0: 0.0, 0.0);
}

complex conj(complex z) {
    return complex(z[0], -z[1]);
}

complex inv(complex z) {
    return conj(z)/absSquared(z);
}

float arg(complex z) {
    return atan(z.y, z.x);
}

complex r2C(float r) {
    return complex(float(r), 0.0);
}

complex mul(complex z, complex w) {
    return complex(z.x*w.x - z.y*w.y, z.x*w.y + z.y*w.x);
}

complex add(complex z, complex w) {
    return z + w;
}

complex sub(complex z, complex w) {
    return z - w;
}

complex div(complex z, complex w) {
    return mul(z, inv(w));
}

complex expC(complex z) {
    return exp(z.x)*complex(cos(z.y), sin(z.y));

}

complex cosC(complex z) {
    return 0.5*(expC(mul(IMAG_UNIT, z)) + expC(mul(-IMAG_UNIT, z)));
}

complex sinC(complex z) {
    return mul(expC(mul(IMAG_UNIT, z)) - expC(mul(-IMAG_UNIT, z)),
               -0.5*IMAG_UNIT);
}

complex tanC(complex z) {
    return sinC(z)/cosC(z); 
}

complex logC(complex z) {
    if (z.y == 0.0)
        return complex(log(z.x), 0.0);
    return complex(log(absC(z)[0]), arg(z));
}

complex coshC(complex z) {
    return 0.5*(expC(z) + expC(-z));
}

complex sinhC(complex z) {
    return 0.5*(expC(z) - expC(-z));
}

complex tanhC(complex z) {
    return div(sinhC(z), coshC(z));
}

complex powC(complex z, complex w) {
    if (z.y == 0.0 && w.y == 0.0)
        return complex(pow(z.x, w.x), 0.0);
    if (w.x == 0.0 && w.y == 0.0)
        return complex(1.0, 0.0);
    return expC(mul(logC(z), w));
}

complex sqrtC(complex z) {
    return powC(z, complex(0.5, 0.0));
}

uniform complex width;
uniform complex height;
uniform complex depth;
uniform ivec2 texelDimensions2D;
uniform ivec3 texelDimensions3D;

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

#define _REPLACEMENT_EXPRESSION_0 complex(0.0)
#define _REPLACEMENT_EXPRESSION_1 complex(0.0)
#define _REPLACEMENT_EXPRESSION_2 complex(0.0)
#define _REPLACEMENT_EXPRESSION_3 complex(0.0)

uniform bool useRealPartOfExpression;

vec4 function(vec2 uv) {
    complex i = IMAG_UNIT;
    complex pi = complex(PI, 0.0);
    vec3 texUVW = to3DTextureCoordinates(uv);
    complex y = mul(height, complex(texUVW[0], 0.0)) - height/2.0;
    complex x = mul(width, complex(texUVW[1], 0.0)) - width/2.0;
    complex z = mul(depth, complex(texUVW[2], 0.0)) - depth/2.0;
    if (useRealPartOfExpression)
        return vec4(
            (add(x, y))[0],
            (add(x, z))[0],
            (add(powC(z, r2C(2.0)), y))[0],
            (_REPLACEMENT_EXPRESSION_3)[0]
        );
    else
        return vec4(
            (add(x, y))[1],
            (add(x, z))[1],
            (add(powC(z, r2C(2.0)), y))[1],
            (_REPLACEMENT_EXPRESSION_3)[1]
        );
}
