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

uniform ivec2 texelDimensions2D;


void main() {
    vec2 uvShifted = vec2(
        (UV[0] < 0.5)? UV[0] + 0.5: UV[0] - 0.5,
        (UV[1] < 0.5)? UV[1] + 0.5: UV[1] - 0.5);
    fragColor = texture2D(tex, uvShifted);
}
