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

uniform ivec4 texelDimensions4D;

uniform float symmetryFactor;

// Amplitude of the wave packet
uniform float amplitude1;
uniform float amplitude2;
// Standard deviation of the wave packet, in texture coordinates
uniform vec2 sigma1;
uniform vec2 sigma2;
// Position Offset of the wave packet in texture coordinates
uniform vec2 texOffset1;
uniform vec2 texOffset2;
// wave number of the wave packet (w.r.t. simulation domains)
uniform vec2 waveNumber1;
uniform vec2 waveNumber2;

complex mul(complex a, complex b) {
    return complex(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
}

vec2 to2DTextureCoordinates(vec4 textureCoordinate4D) {
    float texelWidth2D = float(texelDimensions4D[0]*texelDimensions4D[1]);
    float texelHeight2D = float(texelDimensions4D[2]*texelDimensions4D[3]);
    float x = textureCoordinate4D[0]*float(texelDimensions4D[0]);
    float y = textureCoordinate4D[1]*float(texelDimensions4D[1]);
    float z = textureCoordinate4D[2]*float(texelDimensions4D[2]);
    float w = textureCoordinate4D[3]*float(texelDimensions4D[3]);
    return vec2((x + floor(y)*float(texelDimensions4D[0]))/texelWidth2D,
                (z + floor(w)*float(texelDimensions4D[2]))/texelHeight2D);
}

vec4 to4DTextureCoordinates(vec2 textureCoordinate2D) {
    float texelWidth2D = float(texelDimensions4D[0]*texelDimensions4D[1]);
    float texelHeight2D = float(texelDimensions4D[2]*texelDimensions4D[3]);
    vec2 texelPosition2D = vec2(textureCoordinate2D[0]*texelWidth2D,
                                textureCoordinate2D[1]*texelHeight2D);
    float x = mod(texelPosition2D[0], float(texelDimensions4D[0]));
    float y = floor(texelPosition2D[0] / float(texelDimensions4D[0])) + 0.5;
    float z = mod(texelPosition2D[1], float(texelDimensions4D[2]));
    float w = floor(texelPosition2D[1] / float(texelDimensions4D[2])) + 0.5;
    return vec4(
        x/float(texelDimensions4D[0]), y/float(texelDimensions4D[1]),
        z/float(texelDimensions4D[2]), w/float(texelDimensions4D[3]));
}

complex wavepacket(float amplitude, vec2 sigma, vec2 waveNumber, vec2 r) {
    float sx = sigma.x;
    float sy = sigma.y;
    float gx = exp(-0.25*pow(r.x/sx, 2.0))/sqrt(sx*sqrt(2.0*PI));
    float gy = exp(-0.25*pow(r.y/sy, 2.0))/sqrt(sy*sqrt(2.0*PI));
    float g = gx*gy;
    float nx = waveNumber.x;
    float ny = waveNumber.y;
    complex phase = complex(cos(2.0*PI*(nx*r.x + ny*r.y)),
                            sin(2.0*PI*(nx*r.x + ny*r.y)));
    return amplitude*g*phase;
}

complex periodicWavepacket(
    float amplitude, vec2 sigma, vec2 waveNumber, vec2 r) {
    return wavepacket(amplitude, sigma, waveNumber, r)
        + wavepacket(amplitude, sigma, waveNumber, vec2(r.x + 1.0, r.y))
        + wavepacket(amplitude, sigma, waveNumber, vec2(r.x - 1.0, r.y)) 
        + wavepacket(amplitude, sigma, waveNumber, vec2(r.x, r.y + 1.0))
        + wavepacket(amplitude, sigma, waveNumber, vec2(r.x, r.y - 1.0))
        + wavepacket(amplitude, sigma, waveNumber, vec2(r.x - 1.0, r.y - 1.0))
        + wavepacket(amplitude, sigma, waveNumber, vec2(r.x + 1.0, r.y + 1.0))
        + wavepacket(amplitude, sigma, waveNumber, vec2(r.x + 1.0, r.y - 1.0))
        + wavepacket(
            amplitude, sigma, waveNumber, vec2(r.x - 1.0, r.y + 1.0));
}

void main() {
    vec4 coord4D = to4DTextureCoordinates(UV);
    vec2 r1 = coord4D.xy;
    vec2 r2 = coord4D.zw;
    complex phi1 = mul(
        periodicWavepacket(amplitude1, sigma1, waveNumber1, r1 - texOffset1),
        periodicWavepacket(amplitude2, sigma2, waveNumber2, r2 - texOffset2)
    );
    complex phi2 = mul(
        periodicWavepacket(amplitude1, sigma1, waveNumber1, r2 - texOffset1),
        periodicWavepacket(amplitude2, sigma2, waveNumber2, r1 - texOffset2)
    );
    complex psi = phi1 + symmetryFactor*phi2;
    fragColor = vec4(psi, psi);
}