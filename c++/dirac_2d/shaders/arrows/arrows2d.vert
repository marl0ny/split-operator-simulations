#if __VERSION__ <= 120
attribute vec4 position;
varying vec2 UV;
#else
in vec4 position;
out vec2 UV;
#endif

#if (__VERSION__ >= 330) || (defined(GL_ES) && __VERSION__ >= 300)
#define texture2D texture
#else
#define texture texture2D
#endif

#if (__VERSION__ > 120) || defined(GL_ES)
precision highp float;
#endif

uniform sampler2D vecTex;
uniform float arrowScale;
uniform float maxLength;

vec2 transform(vec2 r, float ratio, float scale) {
    float h = sqrt(1.0 + ratio*ratio);
    float c = 1.0/h, s = ratio/h;
    return  scale*vec2(
        r.x*c - r.y*s, 
        r.x*s + r.y*c
    );
}

void main() {
    UV = position.xy;
    float ratio = position[2];
    float arrowScale = position[3];
    vec2 direction = texture2D(vecTex, UV).xy;
    if (length(direction) > maxLength)
        direction = normalize(direction)*maxLength;
    gl_Position = vec4(
        2.0*(position.xy + 
            arrowScale*transform(direction, ratio, arrowScale) 
            - vec2(0.5)),
        vec2(0.0, 1.0));
}