/* Copy the contents of a texture to the output texture */
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

uniform ivec2 texelDimensions2D;
uniform vec2 center;

void main() {
    float dx = 1.0/float(texelDimensions2D[0]);
    float dy = 1.0/float(texelDimensions2D[1]);
    fragColor = vec4(0.0);
    if (abs(UV.x - center.x) < 2.0*dx ||
        abs(UV.y - center.y) < 2.0*dy)
        fragColor = vec4(1.0);
}
