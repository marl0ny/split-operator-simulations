/* Make a texture have a uniform rgba color.*/
#if (__VERSION__ >= 330) || (defined(GL_ES) && __VERSION__ >= 300)
#define texture2D texture
#else
#define texture texture2D
#endif

#if (__VERSION__ > 120) || defined(GL_ES)
precision highp float;
#endif
    
#if __VERSION__ <= 120
varying vec4 COLOR;
#define fragColor gl_FragColor
#else
in vec4 COLOR;
out vec4 fragColor;
#endif

uniform vec4 color;

void main() {
    fragColor = COLOR;
}
