/* Complex multiplication of two textures, where each four component 
floating point texel unit of each texture is intepreted as a a two-component 
complex value. */
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

uniform sampler2D tex1;
uniform sampler2D tex2;

#define complex vec2
#define complex2 vec4

complex mul(complex z1, complex z2) {
    return complex(z1.x*z2.x - z1.y*z2.y, 
                   z1.x*z2.y + z1.y*z2.x);
}

complex2 mul(complex2 z1, complex2 z2) {
    return complex2(mul(z1.xy, z2.xy), mul(z1.zw, z2.zw));
}

void main() {
    fragColor = mul(texture2D(tex1, UV), texture2D(tex2, UV));
}
