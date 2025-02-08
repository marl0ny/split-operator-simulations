#include "user_edit_glsl.hpp"
#include "parse.hpp"
#include <complex>
#include <regex>


static const std::string ZERO_SHADER 
= R"(#if (__VERSION__ >= 330) || (defined(GL_ES) && __VERSION__ >= 300)
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
})";

static const std::string COMPLEX_FUNCS_SHADER
= R"(#if (__VERSION__ >= 330) || (defined(GL_ES) && __VERSION__ >= 300)
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
)";

static const std::string TEX_2D_TO_3D_FRAG
= R"(
uniform complex width;
uniform complex height;
uniform complex depth;
uniform ivec2 texelDimensions2D;
uniform ivec3 texelDimensions3D;

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
)";

static const std::string PLACEHOLDER_DEFS
= R"(
#define _REPLACEMENT_EXPRESSION_0 complex(0.0)
#define _REPLACEMENT_EXPRESSION_1 complex(0.0)
#define _REPLACEMENT_EXPRESSION_2 complex(0.0)
#define _REPLACEMENT_EXPRESSION_3 complex(0.0)

)";

static const std::string USER_DEFINED_FUNCTION_FRAG
= R"(
uniform bool useRealPartOfExpression;

vec4 function(vec2 uv) {
    complex i = IMAG_UNIT;
    complex pi = complex(PI, 0.0);
    vec3 texUVW = to3DTextureCoordinates(uv) - vec3(0.5);
    complex x = width*texUVW[0];
    complex y = height*texUVW[1];
    complex z = depth*texUVW[2];
    if (useRealPartOfExpression)
        return vec4(
            (_REPLACEMENT_EXPRESSION_0)[0],
            (_REPLACEMENT_EXPRESSION_1)[0],
            (_REPLACEMENT_EXPRESSION_2)[0],
            (_REPLACEMENT_EXPRESSION_3)[0]
        );
    else
        return vec4(
            (_REPLACEMENT_EXPRESSION_0)[1],
            (_REPLACEMENT_EXPRESSION_1)[1],
            (_REPLACEMENT_EXPRESSION_2)[1],
            (_REPLACEMENT_EXPRESSION_3)[1]
        );
}
)";

static const std::string MAIN_FRAG
= R"(

void main() {
    fragColor = function(UV);
}
)";


UserEditGLSLProgram::UserEditGLSLProgram() {
    this->texts = std::vector<std::string>{};
    this->text_changed = false;
    this->uniforms = {};
    this->variables = {};
    this->program = Quad::make_program_from_source(ZERO_SHADER);
}

bool UserEditGLSLProgram::refresh() {
    bool ret = false;
    if (this->text_changed) {
        this->generate_new_program();
        this->text_changed = false;
        ret = true;
    }
    if (this->uniform_values_changed) {
        this->generate_new_program();
        this->uniform_values_changed = false;
        ret = true;
    }
    return ret;

}

uint32_t UserEditGLSLProgram::get_program() const {
    return this->program;
}

void UserEditGLSLProgram::new_text(std::string text) {
    this->texts.push_back(text);
    this->text_changed = true;
}

void UserEditGLSLProgram::new_texts(std::vector<std::string> texts) {
    this->texts = texts;
    this->text_changed = true;
}

void UserEditGLSLProgram::remove_reserved_variables(
    std::set<std::string> &variables
) {
    for (auto &v: {"i", "x", "y", "z", "t", "width", "height", "depth"})
        variables.erase(v);
}

#include <iostream>


bool UserEditGLSLProgram::generate_new_program() {
    std::vector<std::string> expression_strings = {};
    std::set<std::string> expression_variables {};
    for (int i = 0; i < this->texts.size(); i++) {
        std::string text = this->texts[i];
        std::vector<std::string> rpn_list 
                = shunting_yard(get_expression_stack(text));
        std::set<std::string> line_variables
            = get_variables_from_rpn_list(rpn_list);
        this->remove_reserved_variables(line_variables);
        std::string expression_string
            = turn_rpn_expression_to_glsl_expression_string(rpn_list);
        expression_strings.push_back(expression_string);
        for (auto &e: line_variables) {
            if (this->uniforms.count(e) == 0)
                this->uniforms[e] = 1.0;
        }
        for (auto &e: line_variables)
            expression_variables.insert(e);
        
        // Print stuff 
        {
            std::cout << "Original text: " << text << std::endl;
            std::cout << "RPN: ";
            for (auto &e: rpn_list)
                std::cout << e << ", ";
            std::cout << std::endl;
            std::cout << expression_string << std::endl;
        }

    }
    bool variables_changed = this->variables != expression_variables;
    this->variables = expression_variables;
    is_time_dependant = this->variables.count("t");
    std::string user_uniforms_string {};
    for (auto &e: expression_variables)
        user_uniforms_string += "uniform complex " + e + ";\n";
    std::string user_defined_function_frag (USER_DEFINED_FUNCTION_FRAG);
    for (uint8_t i = 0; i < 4; i++) {
        if (expression_strings[i] != "") {
            std::regex r {"_REPLACEMENT_EXPRESSION_" + std::to_string(i)};
            user_defined_function_frag = std::regex_replace(
                user_defined_function_frag, r, expression_strings[i]);
        }
    }
    std::string final = COMPLEX_FUNCS_SHADER + TEX_2D_TO_3D_FRAG
        + PLACEHOLDER_DEFS + user_uniforms_string + user_defined_function_frag
        + MAIN_FRAG;
    // std::cout << final << std::endl;
    int status;
    uint32_t program;
    Quad::make_program_from_source(program, status, final);
    if (status == GL_TRUE)
        this->program = program;
    return variables_changed;
}

std::set<std::string> UserEditGLSLProgram::get_active_variables() const {
    return {this->variables};
}

Uniforms UserEditGLSLProgram::get_all_uniforms() const {
    Uniforms ret_val {};
    for (auto &uniform: this->uniforms) {
        Vec2 val = Vec2{.ind={
                (float)uniform.second.real(),
                (float)uniform.second.imag()}};
        ret_val.insert({uniform.first,Uniform(val)});
    }
    return ret_val;
}

Uniforms UserEditGLSLProgram::get_active_uniforms() const {
    Uniforms ret_val {};
    for (auto &uniform: this->uniforms) {
        if (this->variables.count(uniform.first)) {
            Vec2 val = Vec2{.ind={
                (float)uniform.second.real(),
                (float)uniform.second.imag()}};
            ret_val.insert({uniform.first, Uniform(val)});
        }
    }
    return ret_val;
}

void UserEditGLSLProgram::set_value(std::string var_name, float value) {
    this->uniforms[var_name] = value;
    this->uniform_values_changed = true;
}


