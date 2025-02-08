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
uniform float brightness;
uniform float offset;
uniform float maxBrightness;

uniform int brightnessMode;
const int ABS_VAL_SQUARED = 2;
const int INV_ABS_VAL = -1;

#define PI 3.141592653589793


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
    float initVal = texture2D(tex, UV)[0];
    float val;
    if (brightnessMode == INV_ABS_VAL) {
        val = brightness/initVal + brightness*offset - 1.0;
    } else if (brightnessMode == ABS_VAL_SQUARED) {
        val = brightness*(abs(initVal)*abs(initVal) + offset);
    } else {
        val = brightness*(abs(initVal) + offset);
    }
    float angle = -PI*val - 2.0*PI/3.0;
    if (angle < -PI) {
        angle = 2.0*PI + angle;
        if (angle < 0.0) {
            angle = 0.0;
        }
    }
    vec3 visualVal = min(val/16.0, maxBrightness)*
                        argumentToColor(angle);
    fragColor = vec4(visualVal, length(visualVal));
}