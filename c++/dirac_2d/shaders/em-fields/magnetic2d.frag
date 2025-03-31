/* Compute the magnetic fields from the four-vector potential in 2D,
using finite difference approximations for derivatives.
The field values are computed along a uniform staggered grid that's
offset (dx/2, dy/2) away from the four-vector potential grid.*/
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

uniform sampler2D vecPotentialTex;
uniform ivec2 texelDimensions2D;
uniform vec2 dimensions2D;

vec3 dAdx(sampler2D vecTex) {
    float dx = dimensions2D[0]/float(texelDimensions2D[0]);
    float dy = dimensions2D[1]/float(texelDimensions2D[1]);
    float du = 1.0/float(texelDimensions2D[0]);
    float dv = 1.0/float(texelDimensions2D[1]);
    vec3 leftA = texture2D(vecTex, UV + vec2(0.0, 0.5*dv)).xyz;
    vec3 rightA = texture2D(vecTex, UV + vec2(du, 0.5*dv)).xyz;
    return (rightA - leftA)/dx;
}

vec3 dAdy(sampler2D vecTex) {
    float dx = dimensions2D[0]/float(texelDimensions2D[0]);
    float dy = dimensions2D[1]/float(texelDimensions2D[1]);
    float du = 1.0/float(texelDimensions2D[0]);
    float dv = 1.0/float(texelDimensions2D[1]);
    vec3 downA = texture2D(vecTex, UV + vec2(0.5*du, 0.0)).xyz;
    vec3 upA = texture2D(vecTex, UV + vec2(0.5*du, dv)).xyz;
    return (upA - downA)/dy;
}

vec3 dAdz(sampler2D vecTex) {
    return vec3(0.0);
}

void main() {
    fragColor = vec4(
        dAdy(vecPotentialTex).z - dAdz(vecPotentialTex).y,
        -dAdx(vecPotentialTex).z + dAdz(vecPotentialTex).x,
        dAdx(vecPotentialTex).y - dAdy(vecPotentialTex).x, 1.0);
    
}