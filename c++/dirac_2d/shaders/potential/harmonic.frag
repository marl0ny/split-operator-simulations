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

uniform vec2 dimensions2D;

void main() {
    vec2 r = dimensions2D*(UV - vec2(0.5));
    fragColor = vec4(0.0, 0.0, 0.0, 20.0*dot(r, r));
}