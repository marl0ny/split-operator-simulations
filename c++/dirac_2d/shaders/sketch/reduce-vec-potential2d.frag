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
uniform vec2 offsetTexCoord;
uniform vec2 sigmaTexCoord;
uniform float amplitude;

void main() {
    float x0 = offsetTexCoord.x;
    float y0 = offsetTexCoord.y;
    float sigmaX = sigmaTexCoord[0];
    float sigmaY = sigmaTexCoord[1];
    float x = UV.x;
    float y = UV.y;
    float gx = exp(-0.5*(x - x0)*(x - x0)/(sigmaX*sigmaX));
    float gy = exp(-0.5*(y - y0)*(y - y0)/(sigmaY*sigmaY));
    vec4 fourVec = texture2D(tex, UV);
    vec3 threeVec = fourVec.xyz;
    float threeVecMag = length(threeVec) - amplitude*gx*gy;
    if (threeVecMag < 0.0)
        threeVecMag = 0.0;
    if (length(threeVec) > 0.0)
        threeVec = normalize(threeVec)*threeVecMag;
    fragColor = vec4(threeVec, fourVec.w);

}
