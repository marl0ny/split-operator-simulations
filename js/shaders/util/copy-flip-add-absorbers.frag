/* Copy and flip the contents of a texture along the y-direction
 to the output texture */
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

uniform sampler2D tex;

float pow2(float x) {
    return x*x;
}

void main() {
    float u = UV[0], v = UV[1];
    float a = -(
        exp(-u*u/0.001) + exp(-pow2(u - 1.0)/0.001)
        + exp(-v*v/0.001) + exp(-pow2(v - 1.0)/0.001));
    fragColor = texture2D(tex, vec2(UV.x, 1.0 - UV.y));
    fragColor.y += a;
    fragColor.w += a;
}
