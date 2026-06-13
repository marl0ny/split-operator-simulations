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
uniform float brightness;
uniform vec3 color;
uniform int index;

void main() {
    complex z = (index == 0)? texture2D(tex, UV).xy: texture2D(tex, UV).zw;
    float brightness2 = brightness*sqrt(z.x*z.x + z.y*z.y);
    fragColor = vec4(color*brightness2, brightness2);
}
