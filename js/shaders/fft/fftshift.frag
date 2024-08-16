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


void main() {
    float u0 = UV[0], v0 = UV[1];
    float u = (u0 < 0.5)? u0 + 0.5: u0 - 0.5;
    float v = (v0 < 0.5)? v0 + 0.5: v0 - 0.5;
    fragColor = texture2D(tex, vec2(u, v));
}