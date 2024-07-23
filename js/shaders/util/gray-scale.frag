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
uniform float brightness;
uniform float offset;
uniform float maxBrightness;

void main() {
    vec3 color = vec3(texture2D(tex, UV)[0] + offset);
    fragColor 
        = vec4(max(min(brightness*color, maxBrightness), -maxBrightness),
        1.0);
}

