/* Take the rgb values of two different textures and combine
the two together.*/
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

uniform float scale1;
uniform sampler2D tex1;
uniform float scale2;
uniform sampler2D tex2;

void main() {
    vec3 color1 = texture2D(tex1, UV).rgb;
    vec3 color2 = texture2D(tex2, UV).rgb;
    fragColor = vec4(scale1*abs(color1) + scale2*abs(color2), 1.0);
}


