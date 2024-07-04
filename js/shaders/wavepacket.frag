/* Generate a new wavepacket. */
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

complex mul(complex a, complex b) {
    return complex(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
}

// wave number of the wave packet (w.r.t. simulation domains)
uniform vec2 waveNumber;
// Position Offset of the wave packet in texture coordinates
uniform vec2 texOffset;
// Amplitude of the wave packet
uniform float amplitude;
// Standard deviation of the wave packet, in texture coordinates
uniform vec2 sigmaXY;

void main() {
    float x = UV.x;
    float y = UV.y;
    float x0 = texOffset.x;
    float y0 = texOffset.y;
    float sx = sigmaXY.x;
    float sy = sigmaXY.y;
    float gx = exp(-0.25*pow((x - x0)/sx, 2.0))/sqrt(sx*sqrt(2.0*PI));
    float gy = exp(-0.25*pow((y - y0)/sy, 2.0))/sqrt(sy*sqrt(2.0*PI));
    float g = gx*gy;
    float nx = waveNumber.x;
    float ny = waveNumber.y;
    complex phase = complex(cos(2.0*PI*(nx*x + ny*y)),
                            sin(2.0*PI*(nx*x + ny*y)));
    fragColor = amplitude*g*vec4(phase, phase);
}
