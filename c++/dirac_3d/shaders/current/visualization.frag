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

/* The vec4 type alias hermitian2x2 corresponds to a two by two
Hermitian matrix. The first two components are the diagonals.
The last two components store the complex off-diagonal element
that's in the first row.*/
#define hermitian2x2 vec4

#define complex vec2
#define complex2 vec4

uniform hermitian2x2 sigmaX;
uniform hermitian2x2 sigmaY;
uniform hermitian2x2 sigmaZ;
uniform sampler2D uTex;
uniform sampler2D vTex;

const int DIRAC_REP = 0;
const int WEYL_REP = 1;
uniform int representation;

const int CURRENT0 = 0;
const int PSEUDOCURRENT0 = 1;
const int CURRENT123 = 2;
const int PSEUDOCURRENT123 = 3;
uniform int currentType;

uniform float brightness;

uniform bool imposeAdditionalGrayScaleTex;
uniform sampler2D tex2;
uniform float gsOffset;
uniform float gsBrightness;
uniform float gsMaxBrightness;

#define PI 3.141592653589793


float real(complex z) {
    return z[0];
}

float imag(complex z) {
    return z[1];
}

complex conj(complex z) {
    return complex(z[0], -z[1]);
}

complex mul(complex w, complex z) {
    return complex(w[0]*z[0] - w[1]*z[1], w[0]*z[1] + w[1]*z[0]);
}

complex innerProd(complex2 w, complex2 z) {
    return mul(conj(w.rg), z.rg) + mul(conj(w.ba), z.ba);
}

complex2 matrixMul(hermitian2x2 m, complex2 v) {
    complex m00 = complex(m[0], 0.0);
    complex m11 = complex(m[1], 0.0);
    complex m01 = complex(m[2], m[3]);
    complex m10 = conj(m01);
    complex v0 = v.rg;
    complex v1 = v.ba;
    return complex2(mul(m00, v0) + mul(m01, v1),
                    mul(m10, v0) + mul(m11, v1));
}

float expectationValue(hermitian2x2 operator, complex2 state) {
    return real(innerProd(state, matrixMul(operator, state)));
}

vec4 getCurrent() {
    complex2 u = texture2D(uTex, UV);
    complex2 v = texture2D(vTex, UV);
    if (representation == DIRAC_REP)
        return vec4(2.0*real(innerProd(u, matrixMul(sigmaX, v))),
                    2.0*real(innerProd(u, matrixMul(sigmaY, v))),
                    2.0*real(innerProd(u, matrixMul(sigmaZ, v))),
                    dot(u, u) + dot(v, v));
    else
        return vec4(
            -expectationValue(sigmaX, u) + expectationValue(sigmaX, v),
            -expectationValue(sigmaY, u) + expectationValue(sigmaY, v),
            -expectationValue(sigmaZ, u) + expectationValue(sigmaZ, v),
            dot(u, u) + dot(v, v));
}

vec4 getPseudoCurrent() {
    complex2 u = texture2D(uTex, UV);
    complex2 v = texture2D(vTex, UV);
    if (representation == DIRAC_REP)
        return vec4(
            expectationValue(sigmaX, u) - expectationValue(sigmaX, v),
            expectationValue(sigmaY, u) - expectationValue(sigmaY, v),
            expectationValue(sigmaZ, u) - expectationValue(sigmaZ, v),
            (-innerProd(u, v) - innerProd(v, u)).r);
    else
        return vec4(
            expectationValue(sigmaX, u) + expectationValue(sigmaX, v),
            expectationValue(sigmaY, u) + expectationValue(sigmaY, v),
            expectationValue(sigmaZ, u) + expectationValue(sigmaZ, v),
            (innerProd(u, v) + innerProd(v, -u)).r);
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
    vec4 current = getCurrent();
    if (currentType == PSEUDOCURRENT0 || currentType == PSEUDOCURRENT123)
        current = getPseudoCurrent();
    vec3 color = argumentToColor((current.w < 0.0)? PI: 0.0);
    fragColor = vec4(
        brightness*abs(current.w)*color, abs(current.w)*brightness);
    if (currentType == CURRENT123) {
        fragColor = vec4(brightness*current.xyz, 1.0);
    } else if (currentType == PSEUDOCURRENT123) {
        fragColor = vec4(brightness*current.xyz, 1.0);
    }
    if (imposeAdditionalGrayScaleTex)
        fragColor += getGrayScaleTexel(tex2);
}