#include "user_edit_glsl.hpp"
#include "parse.hpp"
#include <regex>
#include <iostream>

/* The shader is used for the program at the start, or if inputs are invalid. */
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

/* The starting point for constructing the GLSL shader that utilizes
 user input. This defines the various functions that are called upon
 by the user's parsed input. */
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
    if (z.y == 0.0 && w.y == 0.0) {
        #if (!defined(GL_ES) && __VERSION__ >= 120) || (defined(GL_ES) && __VERSION__ > 300)
        float eps = 1e-30;
        float val = 1.0;
        if (w.x > 0.0 && abs(mod(w.x, 1.0)) < eps) {
            for (float n = 0.0; n < w.x; n += 1.0)
                val *= z.x;
            return complex(val, 0.0);
        }
        if (w.x < 0.0 && abs(mod(-w.x, 1.0)) < eps) {
            for (float n = 0.0; n < -w.x; n += 1.0)
                val *= (1.0/z.x);
            return complex(val, 0.0);
        }
        #endif
        return complex(pow(z.x, w.x), 0.0);
    }
    if (w.x == 0.0 && w.y == 0.0)
        return complex(1.0, 0.0);
    return expC(mul(logC(z), w));
}

complex sqrtC(complex z) {
    return powC(z, complex(0.5, 0.0));
}
)";

/*Shader piece that gets 3D array coordinates from the underlying
2D texture coordinates, if using a 3D context.*/
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

/*Piece for holding placeholder definitions of macros intended
to be replaced by user input.*/
static const std::string PLACEHOLDER_DEFS
= R"(
#define _REPLACEMENT_EXPRESSION_0 complex(0.0)
#define _REPLACEMENT_EXPRESSION_1 complex(0.0)
#define _REPLACEMENT_EXPRESSION_2 complex(0.0)
#define _REPLACEMENT_EXPRESSION_3 complex(0.0)

)";

/*Piece that actually contains the user-defined mathematical
expressions. Macros are substituted with the user's parsed input.*/
static const std::string USER_DEFINED_FUNCTION_FRAG
= R"(
// The mode uniform dictates how the output is organized.
uniform int outputModeSelect;

// The default output mode. Each of the four output components
// represent the elements of a four-vector. The bool
// uniform useRealPartOfExpression toggles whether to output
// the real or imaginary part. This requires four and only
// four entry boxes,
// one for each element of this four vector.
const int MODE_4VECTOR_REAL_OR_COMPLEX = 0;
uniform bool useRealPartOfExpression;

// In this mode, the first two output components
// represent the real and imaginary parts of the first
// complex number.
// The last two output components can be used
// to represent a second complex number's real and imaginary parts.
// This means that up to two text entry boxes can be
// used for this mode.
const int MODE_COMPLEX4 = 4;

vec4 function(vec2 uv) {
    complex i = IMAG_UNIT;
    complex pi = complex(PI, 0.0);
    vec3 texUVW = to3DTextureCoordinates(uv) - vec3(0.5);
    // vec2 texUV = UV - vec2(0.5);
    complex x = width*texUVW[0];
    complex y = height*texUVW[1];
    complex z = depth*texUVW[2];
    if (outputModeSelect == MODE_COMPLEX4)
        return vec4(
            (_REPLACEMENT_EXPRESSION_0)[0],
            (_REPLACEMENT_EXPRESSION_0)[1],
            (_REPLACEMENT_EXPRESSION_1)[0],
            (_REPLACEMENT_EXPRESSION_1)[1]
        );
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

/*Holds the main function.*/
static const std::string MAIN_FRAG
= R"(

void main() {
    fragColor = function(UV);
}
)";


static void remove_reserved_variables(
    std::set<std::string> &variables
) {
    for (auto &v: {
        "i", "x", "y", "z", "width", "height", "depth", "pi"})
        variables.erase(v);
}

std::set<std::string>
initialize_glsl_program_from_strings(
    int &dst_program, std::vector<std::string> texts) {
    std::vector<std::string> tmp{};
    return initialize_glsl_program_from_strings(dst_program, tmp, texts);
}

std::set<std::string>
initialize_glsl_program_from_strings(
    int &dst_program, std::vector<std::string> &latex_output,
    std::vector<std::string> texts) {
    std::vector<std::string> expression_strings = {};
    std::set<std::string> expression_variables {};
    if (latex_output.size() != texts.size())
        latex_output.resize(texts.size());
    for (int i = 0; i < texts.size(); i++) {
        std::string text = texts[i];
        std::vector<std::string> rpn_list 
                = shunting_yard(get_expression_stack(text));
        // TODO: if rpn_list is empty, signal a failure and don't create
        // a new program.
        #ifndef __EMSCRIPTEN__
        if (rpn_list.size() == 0) {
            rpn_list = {""};
        }
        #endif
        std::set<std::string> line_variables
            = get_variables_from_rpn_list(rpn_list);
        remove_reserved_variables(line_variables);
        std::string expression_string
            = turn_rpn_expression_to_glsl_expression_string(rpn_list);
        std::string latex_string
            = turn_rpn_expression_to_latex_string(rpn_list);
        latex_output[i] = latex_string;
        expression_strings.push_back(expression_string);
        for (auto &e: line_variables) {
            expression_variables.insert(e);
        }
        // Print stuff 
        {
            std::cout << latex_string << std::endl;
            /* std::cout << "Original text: " << text << std::endl;
            std::cout << "RPN: ";
            for (auto &e: rpn_list)
                std::cout << e << ", ";
            std::cout << std::endl;
            std::cout << expression_string << std::endl;*/
        }
    }
    std::string user_defined_function_frag (USER_DEFINED_FUNCTION_FRAG);
    for (uint8_t i = 0; i < 4 && i < expression_strings.size(); i++) {
        if (expression_strings[i] != "") {
            std::regex r {"_REPLACEMENT_EXPRESSION_" + std::to_string(i)};
            user_defined_function_frag = std::regex_replace(
                user_defined_function_frag, r, expression_strings[i]);
        }
    }
    std::string user_uniforms_string {};
    for (auto &e: expression_variables)
        user_uniforms_string += "uniform complex " + e + ";\n";
    std::string final = COMPLEX_FUNCS_SHADER + TEX_2D_TO_3D_FRAG
        + PLACEHOLDER_DEFS + user_uniforms_string + user_defined_function_frag
        + MAIN_FRAG;
    // int line_num = 0;
    // for (auto &e: final) {
    //     std::cout << e;
    //     if (e == '\n') {
    //         line_num++;
    //         std::cout << line_num << " ";
    //     }
    // }
    int status;
    uint32_t program;
    Quad::make_program_from_source(program, status, final);
    if (status == GL_TRUE)
        dst_program = program;
    return expression_variables;
}

void UserProgramsManager::add_new_program(
    int program, std::set<std::string> variables_set) {
    std::map<std::string, float> variables {};
    for (std::string variable: variables_set) {
        // printf("Variable: %s\n", variable.c_str());
        if (this->all_seen_variables.count(variable))
            variables.insert({variable, all_seen_variables.at(variable)});
        else
            variables.insert({variable, 1.0F});
    }
    this->program = {
        .is_time_dependent=(glGetUniformLocation(program, "t") != -1),
        .program=program,
        .uniforms=variables,
    };
    this->programs_queue.clear();
    this->programs_queue.push_back(this->program.program);
}

void UserProgramsManager::add_seen_variable(
    std::string variable, float value) {
    // while (this->all_seen_variables.at(variable) != value) {
    this->all_seen_variables[variable] = value;
    this->program.uniforms[variable] = value;
    // this->all_seen_variables.insert({variable, value});
    // this->program.uniforms.insert({variable, value});

}

void UserProgramsManager::queue_current() {
    this->programs_queue.push_back(this->program.program);
}

bool UserProgramsManager::program_queued() {
    return this->programs_queue.size() != 0;
}

bool UserProgramsManager::is_time_dependent() {
    return this->program.is_time_dependent;
}

UserDefinedProgram UserProgramsManager::expend_program() {
    this->programs_queue.pop_back();
    return this->program;
}


