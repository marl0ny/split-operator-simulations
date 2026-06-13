/* Interpret the first two channels of a texel as complex value
and convert it to a colour

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
varying vec3 NORMAL;
varying vec3 FINAL_VERTEX_POSITION;
#define fragColor gl_FragColor
#else
in vec2 UV;
in vec3 NORMAL;
in vec3 FINAL_VERTEX_POSITION;
out vec4 fragColor;
#endif

#define complex vec2

#define PI 3.141592653589793

uniform sampler2D tex;
uniform float brightness;
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
    if (abs(FINAL_VERTEX_POSITION.x) > 2.0 || abs(FINAL_VERTEX_POSITION.y) > 2.0 ||
        abs(FINAL_VERTEX_POSITION.z) > 2.0)
        discard;
    complex z1 = texture2D(tex, UV).xy;
    complex phaseFactor = complex(cos(phaseAdjust), sin(phaseAdjust));
    complex z2 = mul(phaseFactor, z1);
    float ambient = 0.01;
    // float diffuse = abs(dot(NORMAL, vec3(0.0, 0.0, -1.0)));
    float brightness2 = brightness*length(z2);
    vec3 color = ambient 
        + (
            1.0 // + diffuse
        )*brightness2*argumentToColor(atan(z2.y, z2.x));
    // fragColor = vec4(color, min(1.0, 10.0*brightness2));
    fragColor = vec4(color, 1.0);
}
