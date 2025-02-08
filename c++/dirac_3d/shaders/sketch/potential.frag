/* Shader for sketching a potential */
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
uniform vec2 location;
uniform float amplitude;
uniform vec2 sigmaXY;

void main() {
    complex oldVal = texture2D(tex, UV).xy;
    float x0 = location.x;
    float y0 = location.y;
    float sigmaX = sigmaXY[0];
    float sigmaY = sigmaXY[1];
    float x = UV.x;
    float y = UV.y;
    float gx = exp(-0.5*(x - x0)*(x - x0)/(sigmaX*sigmaX));
    float gy = exp(-0.5*(y - y0)*(y - y0)/(sigmaY*sigmaY));
    complex newVal = oldVal + amplitude*complex(gx*gy, 0.0);
    if (newVal.x > 2.0)
        newVal.x = (oldVal.x < 2.0)? 2.0: oldVal.x;
    if (newVal.x < 0.0)
        newVal.x = (oldVal.x > 0.0)? 0.0: oldVal.x; 
    fragColor = vec4(newVal, newVal);

}
