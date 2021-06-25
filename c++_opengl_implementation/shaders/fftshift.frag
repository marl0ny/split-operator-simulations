#version 330 core

precision highp float;
varying highp vec2 fragTextCoord;
uniform sampler2D tex;
uniform int isVertical;


void main() {
    float x = fragTextCoord.x;
    float y = fragTextCoord.y;
    if (isVertical == 0) {
        if (x < 0.5) {
            gl_FragColor = texture2D(tex, vec2(x+0.5, y));
        } else {
            gl_FragColor = texture2D(tex, vec2(x-0.5, y));
        }
    } else if (isVertical == 1) {
        if (y < 0.5) {
            gl_FragColor = texture2D(tex, vec2(x, y+0.5));
        } else {
            gl_FragColor = texture2D(tex, vec2(x, y-0.5));
        }
    }
}