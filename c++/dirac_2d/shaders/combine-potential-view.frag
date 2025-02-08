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

uniform float potentialBrightness;
uniform sampler2D initialTex;
uniform sampler2D potentialTex;

void main() {
    vec4 initial = texture2D(initialTex, UV);
    fragColor = initial 
        + potentialBrightness*vec4(texture2D(potentialTex, UV).w);
    fragColor.a = 1.0;
}