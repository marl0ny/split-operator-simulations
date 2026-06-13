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
varying float LENGTH;
varying vec3 FINAL_VERTEX_POSITION;
varying vec3 NORMAL;
#define fragColor gl_FragColor
#else
in vec2 UV;
in float LENGTH;
in vec3 NORMAL;
in vec3 FINAL_VERTEX_POSITION;
out vec4 fragColor;
#endif

uniform vec4 color;

void main() {
    /* if (abs(FINAL_VERTEX_POSITION.x) > 2.0 || 
        abs(FINAL_VERTEX_POSITION.y) > 2.0 ||
        abs(FINAL_VERTEX_POSITION.z) > 2.0)
        discard; */
    if (LENGTH < 1e-2)
        discard;
    vec3 lightSourceLoc = vec3(0.0, 0.0, -3.0);
    vec3 vertexToLightSource = lightSourceLoc - FINAL_VERTEX_POSITION;
    float diffuse = max(dot(NORMAL, normalize(vertexToLightSource)), 0.0);
    fragColor = vec4(color.rgb*(diffuse + 0.25), color.a);
}
