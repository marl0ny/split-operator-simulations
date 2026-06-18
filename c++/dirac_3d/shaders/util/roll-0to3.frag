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
    vec4 texel = texture2D(tex, UV);
    vec3 xyz = vec3(texel[1], texel[2], texel[3]);
    float w = texel[0];
    fragColor = vec4(xyz, w);
}