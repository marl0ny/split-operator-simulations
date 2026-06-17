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
#define complex2 vec4

uniform sampler2D uTex;
uniform sampler2D vTex;

const int DIRAC_REP = 0;
const int WEYL_REP = 1;
uniform int representation;

const int SCALAR = 0;
const int PSEUDOSCALAR = 1;
uniform int scalarType;

uniform float brightness;

uniform bool imposeAdditionalGrayScaleTex;
uniform sampler2D tex2;
uniform float gsOffset;
uniform float gsBrightness;
uniform float gsMaxBrightness;

#define PI 3.141592653589793

complex conj(complex z) {
    return complex(z[0], -z[1]);
}

complex mul(complex w, complex z) {
    return complex(w[0]*z[0] - w[1]*z[1], w[0]*z[1] + w[1]*z[0]);
}

complex innerProd(complex2 w, complex2 z) {
    return mul(conj(w.rg), z.rg) + mul(conj(w.ba), z.ba);
}

float getScalar() {
    complex2 u = texture2D(uTex, UV);
    complex2 v = texture2D(vTex, UV);
    if (representation == DIRAC_REP)
        return innerProd(u, u).r - innerProd(v, v).r;
    else
        return 2.0*innerProd(u, v).r;
}

float getPsuedoScalar() {
    complex2 u = texture2D(uTex, UV);
    complex2 v = texture2D(vTex, UV);
    return (innerProd(u, v) - innerProd(v, u)).g;
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

uniform int brightnessMode;
const int ABS_VAL = 1;
const int ABS_VAL_SQUARED = 2;
const int INV_ABS_VAL = -1;

vec4 getGrayScaleTexel(sampler2D grayTex) {
    float initVal = texture2D(grayTex, UV)[0];
    float val;
    if (brightnessMode == INV_ABS_VAL) {
        val = 1.0/abs(initVal) + gsOffset - 1.0;
    } else if (brightnessMode == ABS_VAL_SQUARED) {
        val = abs(initVal)*abs(initVal) + gsOffset;
    } else {
        val = initVal + gsOffset;
    }
    vec3 color = vec3(val);
    return vec4(
        max(min(brightness*color, gsMaxBrightness), -gsMaxBrightness),
        max(min(brightness*val, gsMaxBrightness), -gsMaxBrightness));
}

void main() {
    float scalarVal = getScalar();
    if (scalarType == PSEUDOSCALAR)
        scalarVal = getPsuedoScalar();
    vec3 color = argumentToColor((scalarVal < 0.0)? PI: 0.0);
    fragColor = vec4(
        brightness*abs(scalarVal)*color, abs(scalarVal)*brightness);
    if (imposeAdditionalGrayScaleTex)
        fragColor += getGrayScaleTexel(tex2);
}