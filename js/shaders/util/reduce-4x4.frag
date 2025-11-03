/* Assuming the output viewport is exactly half the width and height of
the input texture tex, sample the four closest texel units at each
of the UV texture coordinates and add them together, then write this value
to the output texel. This is used as one part of an implementation that
eventually sums the entire contents of a texture, where
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

void main() {
    float dx = 1.0/float(texDimensions2D[0]);
    float dy = 1.0/float(texDimensions2D[1]);
    vec2 uvTopLeft = vec2(UV.x - 0.25*dx, UV.y + 0.25*dy);
    vec2 uvTopRight = vec2(UV.x + 0.25*dx, UV.y + 0.25*dy);
    vec2 uvBottomLeft = vec2(UV.x - 0.25*dx, UV.y - 0.25*dy);
    vec2 uvBottomRight = vec2(UV.x + 0.25*dx, UV.y - 0.25*dy);
    fragColor = (
        texture2D(tex, uvTopLeft) + texture2D(tex, uvTopRight)
        + texture2D(tex, uvBottomLeft) + texture2D(tex, uvBottomRight));
}
