#version 330 core

precision highp float;
varying vec2 fragTextCoord;
uniform sampler2D tex1;
uniform sampler2D tex2;

void main() {
    vec4 col1 = texture2D(tex1, fragTextCoord);
    vec4 col2 = texture2D(tex2, fragTextCoord);
    float re = col1[0]*col2[0] - col1[1]*col2[1];
    float im = col1[0]*col2[1] + col1[1]*col2[0];
    gl_FragColor = vec4(re, im, 0.0, 1.0);
}