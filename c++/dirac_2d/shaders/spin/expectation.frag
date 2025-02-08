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

/* The vec4 type alias hermitian2x2 corresponds to a two by two
Hermitian matrix. The first two components are the diagonals.
The last two components store the complex off-diagonal element
that's in the first row.*/
#define hermitian2x2 vec4

#define complex vec2
#define complex2 vec4

uniform sampler2D psiTex;

const hermitian2x2 SIGMA_X = hermitian2x2(0.0, 0.0, complex(1.0, 0.0));
const hermitian2x2 SIGMA_Y = hermitian2x2(0.0, 0.0, complex(0.0, -1.0));
const hermitian2x2 SIGMA_Z = hermitian2x2(1.0, -1.0, complex(0.0));


float real(complex z) {
    return z[0];
}

float imag(complex z) {
    return z[1];
}

complex expI(float angle) {
    return complex(cos(angle), sin(angle));
}

complex conj(complex z) {
    return complex(z[0], -z[1]);
}

complex mul(complex w, complex z) {
    return complex(w[0]*z[0] - w[1]*z[1], w[0]*z[1] + w[1]*z[0]);
}

complex innerProd(complex2 w, complex2 z) {
    return mul(conj(w.rg), z.rg) + mul(conj(w.ba), z.ba);
}

complex2 matrixMul(hermitian2x2 m, complex2 v) {
    complex m00 = complex(m[0], 0.0);
    complex m11 = complex(m[1], 0.0);
    complex m01 = complex(m[2], m[3]);
    complex m10 = conj(m01);
    complex v0 = v.rg;
    complex v1 = v.ba;
    return complex2(mul(m00, v0) + mul(m01, v1),
                    mul(m10, v0) + mul(m11, v1));
}

complex2 unitaryTransform(complex2 psi, vec3 axis) {
    float angle = length(axis);
    vec3 n = normalize(axis);
    complex sigmaX00 = complex(SIGMA_X[0], 0.0);
    complex sigmaY00 = complex(SIGMA_Y[0], 0.0);
    complex sigmaZ00 = complex(SIGMA_Z[0], 0.0);
    complex sigmaX11 = complex(SIGMA_X[1], 0.0);
    complex sigmaY11 = complex(SIGMA_Y[1], 0.0);
    complex sigmaZ11 = complex(SIGMA_Z[1], 0.0);
    complex sigmaX01 = SIGMA_X.ba;
    complex sigmaY01 = SIGMA_Y.ba;
    complex sigmaZ01 = SIGMA_Z.ba;
    complex sigmaX10 = conj(SIGMA_X.ba);
    complex sigmaY10 = conj(SIGMA_Y.ba);
    complex sigmaZ10 = conj(SIGMA_Z.ba);
    complex c = complex(cos(angle/2.0), 0.0);
    float s = sin(angle/2.0);
    complex i = complex(0.0, 1.0);
    complex u00 = c - s*mul(i, n.x*sigmaX00 + n.y*sigmaY00 + n.z*sigmaZ00);
    complex u01 = c - s*mul(i, n.x*sigmaX01 + n.y*sigmaY01 + n.z*sigmaZ01);
    complex u10 = c - s*mul(i, n.x*sigmaX10 + n.y*sigmaY10 + n.z*sigmaZ10);
    complex u11 = c - s*mul(i, n.x*sigmaX11 + n.y*sigmaY11 + n.z*sigmaZ11);
    return complex2(
        mul(u00, psi.xy) + mul(u01, psi.zw),
        mul(u10, psi.xy) + mul(u11, psi.zw)
    );
}

float expectationValue(hermitian2x2 operator, complex2 state) {
    return real(innerProd(state, matrixMul(operator, state)));
}

void main() {
    complex2 psi = texture2D(psiTex, UV);
    vec3 spin = vec3(
        innerProd(psi, matrixMul(SIGMA_X, psi))[0],
        innerProd(psi, matrixMul(SIGMA_Y, psi))[0],
        innerProd(psi, matrixMul(SIGMA_Z, psi))[0]);
    vec3 axis = cross(normalize(spin), vec3(0.0, 0.0, 1.0));
    complex phase = unitaryTransform(psi, axis).xy;
    float angle = 2.0*atan(phase.y, phase.x);
    fragColor = vec4(spin, angle);
}
