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

void main() {
    float initVal = texture2D(tex, UV)[0];
    float val;
    if (brightnessMode == INV_ABS_VAL) {
        val = 1.0/abs(initVal) + offset - 1.0;
    } else if (brightnessMode == ABS_VAL_SQUARED) {
        val = abs(initVal)*abs(initVal) + offset;
    } else {
        val = initVal + offset;
    }
    vec3 color = vec3(val);
    fragColor 
        = vec4(max(min(brightness*color, maxBrightness), -maxBrightness),
               max(min(brightness*val, maxBrightness), -maxBrightness));
}

