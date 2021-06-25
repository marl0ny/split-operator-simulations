#version 330 core

varying vec2 fragTextCoord;
uniform sampler2D tex;

void main() {
    highp vec4 col = texture2D(tex, fragTextCoord);
    gl_FragColor = col;
}