#version 330 core

precision highp float;
varying vec2 fragTextCoord;
uniform float width;
uniform float height;
uniform sampler2D tex;
uniform sampler2D lookupTex;


void main() {
    vec2 xy = fragTextCoord;
    vec4 col = vec4(0.0, 0.0, 0.0, 1.0);
    vec2 lookupPos = texture2D(lookupTex, xy).xy;
    #if __VERSION__ >= 130
    ivec2 intLookupPos = ivec2(int(width*lookupPos.x), 
                               int(height*lookupPos.y));
    col += texelFetch(tex, intLookupPos, 0);
    gl_FragColor = col;
    #else
    col += texture2D(tex, lookupPos);
    gl_FragColor = col;
    #endif
}
