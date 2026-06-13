/*Copy the contents of one texture to another.*/
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
uniform int size;
uniform int orientation;
uniform ivec2 textureDimensions2D;

const float PI = 3.141592653589793;

float gaussian(float x, float sigma) {
    return exp(-0.5*x*x/(sigma*sigma))/(sqrt(2.0*PI)*sigma);
}

void main() {
    fragColor = vec4(0.0);
    float dx = 1.0/float(textureDimensions2D[0]);
    float dy = 1.0/float(textureDimensions2D[1]);
    vec2 d = (orientation == 0)? vec2(dx, 0.0): vec2(0.0, dy);
    float sigma = float(size);
    for (float x = -2.0*sigma; x <= 2.0*sigma; x += 1.0)
        fragColor += gaussian(x, sigma)*texture2D(
            tex, UV + x*d);
}
