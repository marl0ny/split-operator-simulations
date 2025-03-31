/* Compute the electric fields from the four-vector potential in 2D,
using finite difference approximations for derivatives.
The field values are computed along a uniform staggered grid that's
offset (dx/2, dy/2) away from the grid of four-vector potential values.*/
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


uniform sampler2D prevATex;
uniform sampler2D currATex;
uniform ivec2 texelDimensions2D;
uniform vec2 dimensions2D;
uniform float dt;

vec4 spatialAverage(sampler2D tex) {
    float du = 1.0/float(texelDimensions2D[0]);
    float dv = 1.0/float(texelDimensions2D[1]);
    vec4 a00 = texture2D(tex, UV);
    vec4 a10 = texture2D(tex, UV + vec2(du, 0.0));
    vec4 a01 = texture2D(tex, UV + vec2(0.0, dv));
    vec4 a11 = texture2D(tex, UV + vec2(du, dv));
    return (a00 + a10 + a01 + a11)/4.0;
}

vec4 timeAverage(sampler2D tex0, sampler2D tex1, vec2 offset) {
    vec4 a0 = texture2D(tex0, offset);
    vec4 a1 = texture2D(tex1, offset);
    return (a1 + a0)/2.0;
}

vec3 gradV(sampler2D prevATex, sampler2D currATex) {
    float dx = dimensions2D[0]/float(texelDimensions2D[0]);
    float dy = dimensions2D[1]/float(texelDimensions2D[1]);
    float du = 1.0/float(texelDimensions2D[0]);
    float dv = 1.0/float(texelDimensions2D[1]);
    float upV = timeAverage(prevATex, currATex, UV + vec2(0.5*du, dv)).w;
    float downV = timeAverage(prevATex, currATex, UV + vec2(0.5*du, 0.0)).w;
    float leftV = timeAverage(prevATex, currATex, UV + vec2(0.0, 0.5*dv)).w;
    float rightV = timeAverage(prevATex, currATex, UV + vec2(du, 0.5*dv)).w;
    return vec3((rightV - leftV)/dx, (upV - downV)/dy, 0.0);
}

vec3 dAdt(sampler2D prevATex, sampler2D currATex) {
    vec3 prevA = spatialAverage(prevATex).xyz;
    vec3 currA = spatialAverage(currATex).xyz;
    return (currA - prevA)/dt;
}

void main() {
    fragColor = vec4(
        -gradV(prevATex, currATex) - dAdt(prevATex, currATex), 1.0);
    
}