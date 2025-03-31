#ifdef __EMSCRIPTEN__

using namespace emscripten;

#endif
#include <functional>
#include "gl_wrappers.hpp"
#include <set>

static std::function<void(int, Uniform)> s_sim_params_set;
static std::function<void(int, int, std::string)> s_sim_params_set_string;
static std::function<Uniform(int)> s_sim_params_get;
static std::function<void(int, std::string, float)> s_user_edit_set_value;
static std::function<float(int, std::string)> s_user_edit_get_value;
static std::function<std::string(int)>
    s_user_edit_get_comma_separated_variables;
static std::function<void(int)> s_button_pressed;
static std::function<void(int, int)> s_selection_set;
static std::function<void(int, std::string, float)>
    s_sim_params_set_user_float_param;


void edit_label_display(int c, std::string text_content) {
    std::string string_val = "";
    string_val += "editLabel(";
    string_val += std::to_string(c);
    string_val += ", ";
    string_val += "\"" + text_content + "\"";
    string_val += ");";
    #ifdef __EMSCRIPTEN__
    emscripten_run_script(&string_val[0]);
    #endif
}

void display_parameters_as_sliders(
    int c, std::set<std::string> variables) {
    std::string string_val = "[";
    for (auto &e: variables)
        string_val += "\"" + e + "\", ";
    string_val += "]";
    string_val 
        = "modifyUserSliders(" + std::to_string(c) + ", " + string_val + ");";
    printf("%s\n", &string_val[0]);
    #ifdef __EMSCRIPTEN__
    emscripten_run_script(&string_val[0]);
    #endif
}


/* Setters for the simulation parameters struct, where they act
as the exposed entry point for JavaScript code in the WASM build.
There are multiple functions, one for each type. They all take as the first
argument a param_code representing each field of the parameter struct,
where these codes must be written and enumerated separately in JavaScript.
For the function setters of scalar quantities, the next and final argument is
just the quantity itself. For those that set a vector quantity,
these next arguments in order must be passed into the function: 
the number of elements the vector contains, the index of the vector to change
the value, and lastly the value itself. The actual vector structs
themselves are not passed as argument: this is to avoid the complexity of 
getting non-primitive objects to be passed between JS/C++.
*/

void set_int_param(int param_code, int i) {
    s_sim_params_set(param_code, Uniform((int)i));
}

void set_float_param(int param_code, float f) {
    s_sim_params_set(param_code, Uniform((float)f));
}

void set_bool_param(int param_code, bool b) {
    s_sim_params_set(param_code, Uniform((bool)b));
}

void set_string_param(int param_code, int index, std::string s) {
    s_sim_params_set_string(param_code, index, s);
}

void set_user_float_param(int param_code, std::string s, float value) {
    s_sim_params_set_user_float_param(param_code, s, value);
}

// std::string send_json_string() {
//     return {"This", "is", "some", "text\n";
// }

float user_edit_get_value(int div_code, std::string variable_name) {
    return s_user_edit_get_value(div_code, variable_name);
}

void user_edit_set_value(int div_code, std::string variable_name, float value) {
    s_user_edit_set_value(div_code, variable_name, value);
}

std::string user_edit_get_comma_separated_variables(int div_code) {
    return s_user_edit_get_comma_separated_variables(div_code);
}

void set_vec_param(int param_code, int elem_count, int index, float val) {
    auto u = s_sim_params_get(param_code);
    if (elem_count == 2) {
        u.vec2[index] = val;
    } else if (elem_count == 3) {
        u.vec3[index] = val;
    } else {
        u.vec4[index] = val;
    }
    s_sim_params_set(param_code, u);
}

void set_ivec_param(int param_code, int elem_count, int index, float val) {
    auto u = s_sim_params_get(param_code);
    if (elem_count == 2) {
        u.ivec2[index] = val;
    } else if (elem_count == 3) {
        u.ivec3[index] = val;
    } else {
        u.ivec4[index] = val;
    }
    s_sim_params_set(param_code, u);
}

void button_pressed(int param_code) {
    s_button_pressed(param_code);
}

void selection_set(int param_code, int value) {
    s_selection_set(param_code, value);
}

// void set_mouse_mode(int type) {
//     s_input_type = type;
// }

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_BINDINGS(my_module) {
    function("set_float_param", set_float_param);
    function("set_int_param", set_int_param);
    function("set_bool_param", set_bool_param);
    function("set_vec_param", set_vec_param);
    function("set_ivec_param", set_ivec_param);
    function("set_string_param", set_string_param);
    function("user_edit_get_value", user_edit_get_value);
    function("user_edit_set_value", user_edit_set_value);
    function("user_edit_get_comma_separated_variables",
             user_edit_get_comma_separated_variables);
    function("button_pressed", button_pressed);
    function("selection_set", selection_set);
    function("set_user_float_param", set_user_float_param);
}
#endif
