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

uniform sampler2D tex0;
uniform sampler2D tex1;
uniform sampler2D tex2;
uniform sampler2D tex3;
uniform vec4 scale0;
uniform vec4 scale1;
uniform vec4 scale2;
uniform vec4 scale3;

void main() {
    fragColor = scale0*texture2D(tex0, UV).r + scale1*texture2D(tex1, UV).r
              + scale2*texture2D(tex2, UV).r + scale3*texture2D(tex3, UV).r;
}
