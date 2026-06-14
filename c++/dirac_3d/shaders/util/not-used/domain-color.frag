/* Interpret the first two channels of a texel as a complex value
and convert it to a colour

References:

Wikipedia - Domain coloring
https://en.wikipedia.org/wiki/Domain_coloring

Wikipedia - Hue
https://en.wikipedia.org/wiki/Hue

https://en.wikipedia.org/wiki/Hue#/media/File:HSV-RGB-comparison.svg

*/
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

#define complex vec2

#define PI 3.141592653589793

uniform sampler2D tex;
uniform float brightness;
uniform int index;
uniform bool encodeMagAsBrightness;
uniform float phaseAdjust;

complex mul(complex w, complex z) {
    return complex(w.x*z.x - w.y*z.y, w.x*z.y + w.y*z.x);
}

vec3 argumentToColor(float argVal) {
    float maxCol = 1.0;
    float minCol = 50.0/255.0;
    float colRange = maxCol - minCol;
    if (argVal <= PI/3.0 && argVal >= 0.0) {
        return vec3(maxCol,
                    minCol + colRange*argVal/(PI/3.0), minCol);
    } else if (argVal > PI/3.0 && argVal <= 2.0*PI/3.0){
        return vec3(maxCol - colRange*(argVal - PI/3.0)/(PI/3.0),
                    maxCol, minCol);
    } else if (argVal > 2.0*PI/3.0 && argVal <= PI){
        return vec3(minCol, maxCol,
                    minCol + colRange*(argVal - 2.0*PI/3.0)/(PI/3.0));
    } else if (argVal < 0.0 && argVal > -PI/3.0){
        return vec3(maxCol, minCol,
                    minCol - colRange*argVal/(PI/3.0));
    } else if (argVal <= -PI/3.0 && argVal > -2.0*PI/3.0){
        return vec3(maxCol + (colRange*(argVal + PI/3.0)/(PI/3.0)),
                    minCol, maxCol);
    } else if (argVal <= -2.0*PI/3.0 && argVal >= -PI){
        return vec3(minCol,
                    minCol - (colRange*(argVal + 2.0*PI/3.0)/(PI/3.0)), 
                    maxCol);
    }
    else {
        return vec3(minCol, maxCol, maxCol);
    }
}

void main() {
    complex z1 = (index == 0)? texture2D(tex, UV).xy: texture2D(tex, UV).zw;
    complex phaseFactor = complex(cos(phaseAdjust), sin(phaseAdjust));
    complex z2 = mul(phaseFactor, z1);
    vec3 color = brightness*((encodeMagAsBrightness)? length(z2): 1.0)
        *argumentToColor(atan(z2.y, z2.x));
    fragColor = vec4(color, brightness);
}
