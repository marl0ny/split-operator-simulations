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

uniform sampler2D tex;

void main() {
    complex psi1 = texture2D(tex, UV).xy;
    complex psi2 = texture2D(tex, UV).zw;
    fragColor = vec4(dot(psi1, psi1), 0.0, dot(psi2, psi2), 0.0);
}
