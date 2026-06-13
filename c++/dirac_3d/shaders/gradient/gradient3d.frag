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

uniform int orderOfAccuracy;

#define USE_TEXTURE_WRAPPING 0
#define DIRICHLET 1
#define DIRICHLET_MASK 2
uniform int boundaryType;

uniform sampler2D boundaryMaskTex;

uniform int staggeredMode;

uniform int index;

uniform ivec3 texelDimensions3D;
uniform ivec2 texelDimensions2D;

uniform vec3 dr; // Spartial step sizes
uniform vec3 dimensions3D; // Dimensions of simulation

#define X_ORIENTATION 0
#define Y_ORIENTATION 1
#define Z_ORIENTATION 2

/* Table of finite difference stencils:

 - Fornberg, B. (1988).
 Generation of Finite Difference Formulas on Arbitrarily Spaced Grids.
 Mathematics of Computation, 51(184), 699-706.
 https://doi.org/10.1090/S0025-5718-1988-0935077-0

*/

vec2 to2DTextureCoordinates(vec3 uvw) {
    int width2D = texelDimensions2D[0];
    int height2D = texelDimensions2D[1];
    int width3D = texelDimensions3D[0];
    int height3D = texelDimensions3D[1];
    int length3D = texelDimensions3D[2];
    float wStack = float(width2D)/float(width3D);
    // float hStack = float(height2D)/float(height3D);
    float xIndex = float(width3D)*mod(uvw[0], 1.0);
    float yIndex = float(height3D)*mod(uvw[1], 1.0);
    float zIndex = mod(floor(float(length3D)*uvw[2]), float(length3D));
    float uIndex = mod(zIndex, wStack)*float(width3D) + xIndex; 
    float vIndex = floor(zIndex / wStack)*float(height3D) + yIndex; 
    return vec2(uIndex/float(width2D), vIndex/float(height2D));
}

vec3 to3DTextureCoordinates(vec2 uv) {
    int width3D = texelDimensions3D[0];
    int height3D = texelDimensions3D[1];
    int length3D = texelDimensions3D[2];
    int width2D = texelDimensions2D[0];
    int height2D = texelDimensions2D[1];
    float wStack = float(width2D)/float(width3D);
    float hStack = float(height2D)/float(height3D);
    float u = mod(uv[0]*wStack, 1.0);
    float v = mod(uv[1]*hStack, 1.0);
    float w = (floor(uv[1]*hStack)*wStack
               + floor(uv[0]*wStack) + 0.5)/float(length3D);
    return vec3(u, v, w);
}
/* Get the boundary value, given the 2D texture coordinate
uv and its 3D equivalent counterpart uvw. */
vec4 boundaryValue(vec2 uv, vec3 uvw) {
    if (boundaryType == USE_TEXTURE_WRAPPING)
        return vec4(1.0);
    else if (boundaryType == DIRICHLET)
        return  (
            uvw[0] < dr[0]/dimensions3D[0] ||
            uvw[1] < dr[1]/dimensions3D[1] ||
            uvw[2] < dr[2]/dimensions3D[2] ||
            uvw[0] > (1.0 - dr[0]/dimensions3D[0]) ||
            uvw[1] > (1.0 - dr[1]/dimensions3D[1]) ||
            uvw[2] > (1.0 - dr[2]/dimensions3D[2]))? vec4(0.0): vec4(1.0);
    else if (boundaryType == DIRICHLET_MASK)
        return texture2D(boundaryMaskTex, uv);
}

/* Sample the texture at an integer number of texel units (i, j, and k)
away from the input 3D coordinate variable centre. */
vec3 offsetTexelCoordinate3D(vec3 centre, int i, int j, int k) {
    return centre + vec3(float(i)*dr[0]/dimensions3D[0],
                         float(j)*dr[1]/dimensions3D[1],
                         float(k)*dr[2]/dimensions3D[2]);
}

/* Sample the texture tex with its boundary value at an integer number of
texel units away from that position given in the varying/in UV variable. 
The integer i denotes the  offset along the 0th direction, 
j along the 1st, and k along the 2nd. */
vec4 valueAt(sampler2D tex, int i, int j, int k) {
    vec3 uvw = to3DTextureCoordinates(UV).xyz;
    vec3 uvwOffset = offsetTexelCoordinate3D(uvw, i, j, k);
    vec2 uvOffset = to2DTextureCoordinates(uvwOffset);
    vec4 b = boundaryValue(uvOffset, uvwOffset);
    return b*texture2D(tex, uvOffset);
}

vec4 valueAt(sampler2D tex, int orientation, int i) {
    if (orientation == X_ORIENTATION)
        return valueAt(tex, i, 0, 0);
    else if (orientation == Y_ORIENTATION)
        return valueAt(tex, 0, i, 0);
    else
        return valueAt(tex, 0, 0, i);
}

vec4 centredDiff(sampler2D tex, int i) {
    vec4 b = boundaryValue(UV, to3DTextureCoordinates(UV));
    if (staggeredMode >= 1) {
        return b*(valueAt(tex, i, 1)
                  - valueAt(tex, i, 0))/dr[i];
    } else if (staggeredMode == 0) {
        if (orderOfAccuracy >= 4)
            return b*((1.0/12.0)*valueAt(tex, i, -2) 
                    - (2.0/3.0)*valueAt(tex, i, -1)
                    + (2.0/3.0)*valueAt(tex, i, 1)
                    - (1.0/12.0)*valueAt(tex, i, 2)
                   )/dr[i];
        else
            return 0.5*b*(valueAt(tex, i, 1)
                          - valueAt(tex, i, -1))/dr[i];
    } else if (staggeredMode <= -1) {
        return b*(valueAt(tex, i, 0)
                  - valueAt(tex, i, -1))/dr[i];
    }
}

void main() {
    vec4 dTexdx = centredDiff(tex, X_ORIENTATION);
    vec4 dTexdy = centredDiff(tex, Y_ORIENTATION);
    vec4 dTexdz = centredDiff(tex, Z_ORIENTATION);
    fragColor = vec4(dTexdx[index], dTexdy[index], dTexdz[index], 1.0); 
}
