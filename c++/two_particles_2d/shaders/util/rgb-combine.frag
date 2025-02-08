/* Add two textures together */
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

uniform sampler2D texR;
uniform sampler2D texG;
uniform sampler2D texB;
uniform float scaleR;
uniform float scaleG;
uniform float scaleB;

void main() {
    float r = scaleR*texture2D(texR, UV)[0];
    float g = scaleG*texture2D(texG, UV)[0];
    float b = scaleB*texture2D(texB, UV)[0];
    fragColor = vec4(min(r, 1.0), min(g, 1.0), min(b, 1.0), 1.0);
}
