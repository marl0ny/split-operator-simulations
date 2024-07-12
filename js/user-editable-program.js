import { Complex, Quad } from "./gl-wrappers.js";
import { getRPNExprList, getVariablesFromRPNList,
    turnRPNExpressionToString
 } from "./parse.js";


 const ZERO_SHADER = `
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

void main() {
    fragColor = vec4(0.0);
}
`

const COMPLEX_FUNCS_SHADER = `
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

#define complex vec2
const float PI = 3.141592653589793;

uniform complex t;

const complex IMAG_UNIT = complex(0.0, 1.0); 

float absSquared(complex z) {
    return z.x*z.x + z.y*z.y;
}

complex absC(complex z) {
    return complex(sqrt(absSquared(z)), 0.0);
}

complex stepC(complex z) {
    return complex((z.x > 0.0)? 1.0: 0.0, 0.0);
}

complex conj(complex z) {
    return complex(z[0], -z[1]);
}

complex inv(complex z) {
    return conj(z)/absSquared(z);
}

float arg(complex z) {
    return atan(z.y, z.x);
}

complex r2C(float r) {
    return complex(float(r), 0.0);
}

complex mul(complex z, complex w) {
    return complex(z.x*w.x - z.y*w.y, z.x*w.y + z.y*w.x);
}

complex add(complex z, complex w) {
    return z + w;
}

complex sub(complex z, complex w) {
    return z - w;
}

complex div(complex z, complex w) {
    return mul(z, inv(w));
}

complex expC(complex z) {
    return exp(z.x)*complex(cos(z.y), sin(z.y));

}

complex cosC(complex z) {
    return 0.5*(expC(mul(IMAG_UNIT, z)) + expC(mul(-IMAG_UNIT, z)));
}

complex sinC(complex z) {
    return mul(expC(mul(IMAG_UNIT, z)) - expC(mul(-IMAG_UNIT, z)),
               -0.5*IMAG_UNIT);
}

complex tanC(complex z) {
    return sinC(z)/cosC(z); 
}

complex logC(complex z) {
    if (z.y == 0.0)
        return complex(log(z.x), 0.0);
    return complex(log(absC(z)[0]), arg(z));
}

complex coshC(complex z) {
    return 0.5*(expC(z) + expC(-z));
}

complex sinhC(complex z) {
    return 0.5*(expC(z) - expC(-z));
}

complex tanhC(complex z) {
    return div(sinhC(z), coshC(z));
}

complex powC(complex z, complex w) {
    if (z.y == 0.0 && w.y == 0.0)
        return complex(pow(z.x, w.x), 0.0);
    if (w.x == 0.0 && w.y == 0.0)
        return complex(1.0, 0.0);
    return expC(mul(logC(z), w));
}

complex sqrtC(complex z) {
    return powC(z, complex(0.5, 0.0));
}
`;


const MAIN_FUNC_SHADER = `

void main() {

    complex z = function(UV);
    fragColor = vec4(z, z);
}
`;

const USER_DEFINED_FUNCTION_FRAG1 = 
`
uniform complex width;
uniform complex height;

complex function0(vec2 uv) {
    complex i = IMAG_UNIT;
    complex pi = complex(PI, 0.0);
    complex y = mul(height, complex(uv[1], 0.0)) - height/2.0;
    complex x = mul(width, complex(uv[0], 0.0)) - width/2.0;
    return `;

const USER_DEFINED_FUNCTION_FRAG2 = 
`;
}

uniform bool applyClipping;

complex function(vec2 uv) {
    complex value = function0(uv);
    float absValue = length(value);
    return (absValue > 2.0 && applyClipping)?
        2.0*value/absValue: value;
}
`


const USER_DEFINED_KE_FUNCTION_FRAG1 = 
`
uniform vec2 dimensions2D;
uniform ivec2 texelDimensions2D;
uniform complex m;

vec2 get2Momentum(vec2 uv) {
    float u = uv[0], v = uv[1];
    float width = dimensions2D[0];
    float height = dimensions2D[1];
    int texelWidth = texelDimensions2D[0];
    int texelHeight = texelDimensions2D[1];
    float freqU = ((u < 0.5)? u: -1.0 + u)*float(texelWidth) - 0.5;
    float freqV = ((v < 0.5)? v: -1.0 + v)*float(texelHeight) - 0.5;
    return vec2(2.0*PI*freqU/width, 2.0*PI*freqV/height);
}

complex function(vec2 uv) {
    vec2 pVec = get2Momentum(uv);
    complex px = complex(pVec[0], 0.0);
    complex py = complex(pVec[1], 0.0);
    complex i = IMAG_UNIT;
    complex pi = complex(PI, 0.0);
    return `;

const USER_DEFINED_KE_FUNCTION_FRAG2 = 
`;
}`;

const USER_DEFINED_NL_FUNCTION_FRAG1 = 
`
uniform sampler2D psiTex;
uniform float normFactor;

complex function(vec2 uv) {
    complex psi = normFactor*texture2D(psiTex, uv).xy;
    complex i = IMAG_UNIT;
    complex pi = complex(PI, 0.0);
    complex y = complex(uv[1], 0.0);
    complex x = complex(uv[0], 0.0);
    return `;

const USER_DEFINED_NL_FUNCTION_FRAG2 = 
`;
}
`

class UserEditableProgramContainer {
    _rootID;
    _program;
    _textChanged;
    _sliderChanged;
    _variableSet;
    _uniforms;
    _text;
    isTimeDependent;
    constructor(rootID) {
        this.isTimeDependent = false;
        this._rootID = rootID;
        this._text = ``;
        this._textChanged = false;
        this._sliderChanged = false;
        this._uniforms = {};
        this._variableSet = new Set();
        this._program = Quad.makeProgramFromSource(ZERO_SHADER);
    }
    refresh(func) {
        if (this._textChanged) {
            this.generateNewProgram();
            func();
        } else if (this._sliderChanged) {
            func();
        }
        this._textChanged = false;
        this._sliderChanged = false;
    }
    get program() {
        return this._program;
    }
    get uniforms() {
        return this._uniforms;
    }
    newText(text) {
        this._text = text;
        this._textChanged = true;
    }
    makeNewSlider(varName) {
        let userSliders = document.getElementById(this._rootID);
        let sliderDiv = document.createElement("div");
        let slider = document.createElement("input");
        slider.type = "range";
        slider.min = "-100.0";
        slider.max = "100.0";
        slider.name = `variable-${varName}`;
        slider.value = "10.0";
        let label = document.createElement("label");
        let br = document.createElement("br");
        label.for = slider.name;
        label.style = "color:black; font-family:Arial, Helvetica, sans-serif";
        label.textContent = `${varName} = ${(1).toFixed(3)}`;
        if (Object.keys(this._uniforms).includes(varName)) {
            label.textContent = `${varName} = ${this._uniforms[varName].real}`;
            slider.value 
                = `${(10.0*this._uniforms[varName].real).toFixed(3)}`;
        }
        // label.appendChild(slider);
        sliderDiv.appendChild(label);
        sliderDiv.appendChild(br);
        sliderDiv.appendChild(slider);
        userSliders.appendChild(sliderDiv);
        slider.addEventListener("input",
            e => {
                let value = e.target.value/10.0;
                if (Object.keys(this._uniforms).includes(varName)) {
                    this._uniforms[varName] = new Complex(value, 0.0);
                }
                // console.log(value);
                label.textContent = `${varName} = ${value}`;
                this._sliderChanged = true;
            }
        );
    }
    _constructUserShader(userUniformString, userExpressionString) {
        return (userUniformString
            + userExpressionString);
    }
    _removeReservedVariables(variables) {
        for (let v of ['i', 'x', 'y', 't', 'pi', 'width', 'height'])
            variables.delete(v);
        return variables;
    }
    generateNewProgram() {
        console.log(this._text);
        let rpnList = getRPNExprList(this._text);
        let variables = getVariablesFromRPNList(rpnList);
        if (variables.has('t'))
            this.isTimeDependent = true;
        else
            this.isTimeDependent = false;
        variables = this._removeReservedVariables(variables);
        let variablesLst = [];
        variables.forEach(e => variablesLst.push(e));
        let userUniformsStr = variablesLst.reduce(
            (a, e) => a + `uniform complex ${e};\n`, ``
        );
        let exprString = turnRPNExpressionToString(rpnList.map(e => e));
        console.log(exprString);
        let uniforms = {};
        variablesLst.forEach(e => uniforms[e] = new Complex(1.0, 0.0));
        for (let e of Object.keys(uniforms)) {
            if (Object.keys(this._uniforms).includes(e))
                uniforms[e] = this._uniforms[e];
        }
        this._uniforms = {...uniforms, ...this._uniforms};
        let variablesSet = new Set(variablesLst);
        {
            let b1 = [];
            variablesSet.forEach(e => b1.push(this._variableSet.has(e)));
            let b2 = [];
            this._variableSet.forEach(e => b2.push(variablesSet.has(e)));
            if (!(b1.every(e => e) && b2.every(e => e))) {
                if (!(b1.length === b2.length && b1.length === 0)) {
                    let userSliders = document.getElementById(this._rootID);
                    userSliders.innerHTML = ``;
                    for (let e of Object.keys(uniforms))
                        this.makeNewSlider(e);
                    this._variableSet = variablesSet;
                }
            } 
        }
        let computeUserExprShader 
            = this._constructUserShader(userUniformsStr, exprString);
        this._makeProgramFromUserShader(computeUserExprShader);
    }

    _makeProgramFromUserShader(computeUserExprShader) {
        let [program, infoLog] 
            = Quad.makeProgramAndGetInfoLog(computeUserExprShader);
        if ((program !== null || program !== undefined) && 
            infoLog.length === 0)
            this._program = program;

    }
}

export class UserEditablePotentialProgramContainer 
extends UserEditableProgramContainer {
    _constructUserShader(userUniformString, userExpressionString) {
        return (COMPLEX_FUNCS_SHADER
            + userUniformString
            + USER_DEFINED_FUNCTION_FRAG1
            + userExpressionString
            + USER_DEFINED_FUNCTION_FRAG2
            + MAIN_FUNC_SHADER);
    }
}

export class UserEditableKEProgramContainer
extends UserEditableProgramContainer {
    _constructUserShader(userUniformString, userExpressionString) {
        return (COMPLEX_FUNCS_SHADER
            + userUniformString
            + USER_DEFINED_KE_FUNCTION_FRAG1
            + userExpressionString
            + USER_DEFINED_KE_FUNCTION_FRAG2
            + MAIN_FUNC_SHADER);
    }
    _removeReservedVariables(variables) {
        for (let v of ['i', 'px', 'py', 't', 'pi', 'pVec', 'm',
                        'dimensions2D', 'texelDimensions2D'])
            variables.delete(v);
        return variables;
    }
}

export class UserEditableNonlinearProgramContainer 
extends UserEditableProgramContainer {
    _constructUserShader(userUniformString, userExpressionString) {
        return (COMPLEX_FUNCS_SHADER
            + userUniformString
            + USER_DEFINED_NL_FUNCTION_FRAG1
            + userExpressionString
            + USER_DEFINED_NL_FUNCTION_FRAG2
            + MAIN_FUNC_SHADER);
    }
    _removeReservedVariables(variables) {
        for (let v of ['i', 'x', 'y', 't', 'pi', 'psi',
                        'psiTex', 'normFactor'])
            variables.delete(v);
        return variables;
    }
    _makeProgramFromUserShader(computeUserExprShader) {
        let [program, infoLog] 
            = Quad.makeProgramAndGetInfoLog(computeUserExprShader);
        if ((program !== null || program !== undefined) && 
            infoLog.length === 0)
            this._program = program;
        else
            this._program = Quad.makeProgramFromSource(ZERO_SHADER);

    }
}
