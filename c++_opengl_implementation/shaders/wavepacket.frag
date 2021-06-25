#version 330 core

precision highp float;
varying highp vec2 fragTextCoord;
uniform float dx;
uniform float dy;
uniform float bx;
uniform float by;
uniform float px;
uniform float py;
uniform float sx;
uniform float sy;
uniform float amp;

const float sqrt2 = 1.4142135623730951;
const float sqrtpi = 1.7724538509055159;
const float pi = 3.141592653589793;

void main() {
    float x = fragTextCoord.x;
    float y = fragTextCoord.y;
    float u = ((x - bx)/(sx*sqrt2));
    float v = ((y - by)/(sy*sqrt2));
    float re = amp*exp(-u*u - v*v)*cos(2.0*pi*(px*x + py*y));
    float im = amp*exp(-u*u - v*v)*sin(2.0*pi*(px*x + py*y));
    gl_FragColor = vec4(re, im, 0.0, 1.0);
}
