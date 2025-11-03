/* Assuming the output viewport is exactly half the width of the input texture
but it shares the same height, or if it's half the height as the input but
shares the same width, sample the two closest texel units at each
of the UV texture coordinates and add them together, then write this value
to the output texel. This is used as one part of an implementation that
eventually sums the entire contents of a texture, particularly if
it is not possible to use LINEAR for the filtering. */
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
uniform ivec2 texDimensions2D;
uniform int reductionAxis;

void main() {
    float dx = 1.0/float(texDimensions2D[0]);
    float dy = 1.0/float(texDimensions2D[1]);
    vec2 uvLeft = vec2(UV.x - 0.25*dx, UV.y);
    vec2 uvRight = vec2(UV.x + 0.25*dx, UV.y);
    vec2 uvTop = vec2(UV.x, UV.y + 0.25*dy);
    vec2 uvBottom = vec2(UV.x, UV.y - 0.25*dy);
    if (reductionAxis == 0)
        fragColor = texture2D(tex, uvLeft) + texture2D(tex, uvRight);
    else if (reductionAxis == 1)
        fragColor = texture2D(tex, uvTop) + texture2D(tex, uvBottom);
}
