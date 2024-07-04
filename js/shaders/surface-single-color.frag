/* Output a single colour for every texel of the output texture. */
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
varying vec3 NORMAL;
#define fragColor gl_FragColor
#else
in vec2 UV;
in vec3 NORMAL;
out vec4 fragColor;
#endif

uniform vec4 color;

void main() {
    // float brightness = dot(NORMAL, vec3(0.0, 0.0, -1.0));
    float diffuse = 0.5*abs(dot(NORMAL, vec3(0.0, 0.0, 1.0)));
    fragColor = vec4(color.rgb*(diffuse + 0.25), color.a);
}
