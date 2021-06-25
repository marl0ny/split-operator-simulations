#version 330 core

varying highp vec2 fragTextCoord;
precision highp float;
uniform float width;
uniform float height;
uniform sampler2D tex;
uniform sampler2D lookupTex;


void main() {
    vec2 xy = fragTextCoord;
    vec4 col = vec4(0.0, 0.0, 0.0, 1.0);
    vec2 lookupPos = texture2D(lookupTex, xy).xy;
    ivec2 intLookupPos = ivec2(int(width*lookupPos.x), 
                               int(height*lookupPos.y));
    col += texelFetch(tex, intLookupPos, 0);
    gl_FragColor =  col;
}
