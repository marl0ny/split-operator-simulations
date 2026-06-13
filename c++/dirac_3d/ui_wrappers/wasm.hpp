#include "gl_wrappers.hpp"

#include <functional>
#include <set>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#include <emscripten/bind.h>
using namespace emscripten;
#endif

static std::function<void(int, Uniform)> s_sim_params_set;
static std::function<void(int, int, std::string)> s_sim_params_set_string;
static std::function<Uniform(int)> s_sim_params_get;
static std::function<void(int, std::string, float)> s_user_edit_set_value;
static std::function<float(int, std::string)> s_user_edit_get_value;
static std::function<std::string(int)>
    s_user_edit_get_comma_separated_variables;
static std::function<void(int)> s_button_pressed;
static std::function<void(int, int)> s_selection_set;
static std::function<void(
    int, const std::string &image_data, int, int)> s_image_set;
static std::function<void(int, std::string, float)>
    s_sim_params_set_user_float_param;
static std::function<bool()> s_is_on_touch_screen;
static std::function<unsigned char *()> s_bmp_image;
static std::function<unsigned int ()> s_bmp_image_size;
static std::function<void (int, bool)> s_configure_bmp_recording;


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

void edit_hovering_canvas_label_display(
    int c, std::string text_content) {
    std::string string_val = "";
    string_val += "editHoveringCanvasLabelTextContent(";
    string_val += std::to_string(c);
    string_val += ", ";
    string_val += "\"" + text_content + "\", ";
    string_val += "\"\"";
    string_val += ");";
    #ifdef __EMSCRIPTEN__
    emscripten_run_script(&string_val[0]);
    #endif
}

std::string ww_place_in_quotes(std::string val) {
    return "\"" + val + "\"";
}

void edit_hovering_canvas_visibility_top_left_offset(
    int c, bool is_visible, int x_perc, int y_perc) {
    std::string string_val = "";
    string_val += "editHoveringCanvasVisibilityTopLeftOffset(";
    string_val += std::to_string(c);
    string_val += ", ";
    string_val += (is_visible)? "true": "false";
    string_val += ", ";
    string_val += 
        ww_place_in_quotes(std::to_string(x_perc));
    string_val += ", ";
    string_val += 
        ww_place_in_quotes(std::to_string(y_perc));
    string_val += ");";
    #ifdef __EMSCRIPTEN__
    emscripten_run_script(&string_val[0]);
    #endif
}

void edit_bool_display(int c, bool value) {
    std::string string_val = "";
    string_val += "editBoolDisplay(";
    string_val += std::to_string(c);
    string_val += ", ";
    string_val += (value)? "true": "false";
    string_val += ");";
    #ifdef __EMSCRIPTEN__
    emscripten_run_script(&string_val[0]);
    #endif
}

void edit_katex_label_display(
    int c, std::string text_content
) {
    std::string string_val = "";
    string_val += "editKaTeXLabel(";
    string_val += std::to_string(c);
    string_val += ", ";
    string_val += "\"" + text_content + "\"";
    string_val += ");";
    #ifdef __EMSCRIPTEN__
    emscripten_run_script(&string_val[0]);
    #endif
}

#include <iostream>

void edit_scalar_parameter_slider_display(
    int c, std::string name, float value) {
    std::string string_val = "";
    string_val += "editScalarParameterSliderDisplay(";
    string_val += std::to_string(c);
    string_val += ", ";
    string_val += "\"" + name + "\"";
    string_val += ", ";
    string_val += std::to_string(value);
    string_val += ");";
    std::cout << string_val << std::endl;;
    #ifdef __EMSCRIPTEN__
    emscripten_run_script(&string_val[0]);
    #endif
}

void edit_vector_parameter_slider_display(
    int c, std::string name, int index, float value
) {
    std::string string_val = "";
    string_val += "editVectorParameterSliderDisplay(";
    string_val += std::to_string(c);
    string_val += ", ";
    string_val += "\"" + name + "\"";
    string_val += ", ";
    string_val += std::to_string(index);
    string_val += ", ";
    string_val += std::to_string(value);
    string_val += ");";
    std::cout << string_val << std::endl;;
    #ifdef __EMSCRIPTEN__
    emscripten_run_script(&string_val[0]);
    #endif  
}

void display_parameters_as_sliders(
    int c, std::set<std::string> variables, std::set<std::string> do_not_show={}) {
    for (auto &e: do_not_show)
        variables.erase(e);
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

int get_int_param(int param_code) {
    Uniform u = s_sim_params_get(param_code);
    return u.i32;
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

void image_set(
    int param_code, const std::string &image_data,
    int width, int height) {
    s_image_set(param_code, image_data, width, height);
}

void download_bmp_image(std::string postfix_name) {
    /*
    std::string js_code1 = R"(
    let imageData = Module.bmp_image();
    let blob = new Blob([imageData], {type: "octet/stream"});
    let aTag = document.createElement('a');
    let url = URL.createObjectURL(blob);
    aTag.hidden = true;
    aTag.href = url;
    let time = Date.now();
    aTag.download = `${time}-)";
    std::string js_code2 = R"(.bmp`;
    new Promise(() => aTag.click()).then(
        () => aTag.href=``).then(() => aTag.remove())
        .then(() => aTag = null);
    )";
    std::string js_code = js_code1 + postfix_name + js_code2;
    #ifdef __EMSCRIPTEN__
    emscripten_run_script(&js_code[0]);
    #endif
    */
}

// void set_mouse_mode(int type) {
//     s_input_type = type;
// }

void start_gui(void *window) {
}

void display_gui(void *data) {

}

bool outside_gui() {
    return true;
}

#ifdef __EMSCRIPTEN__

EMSCRIPTEN_BINDINGS(my_module) {
    emscripten::function("set_float_param", set_float_param);
    emscripten::function("set_int_param", set_int_param);
    emscripten::function("get_int_param", get_int_param);
    emscripten::function("set_bool_param", set_bool_param);
    emscripten::function("set_vec_param", set_vec_param);
    emscripten::function("set_ivec_param", set_ivec_param);
    emscripten::function("set_string_param", set_string_param);
    emscripten::function("user_edit_get_value", user_edit_get_value);
    emscripten::function("user_edit_set_value", user_edit_set_value);
    emscripten::function("user_edit_get_comma_separated_variables",
             user_edit_get_comma_separated_variables);
    emscripten::function("button_pressed", button_pressed);
    emscripten::function("selection_set", selection_set);
    emscripten::function("image_set", image_set, allow_raw_pointers());
    emscripten::function("set_user_float_param", set_user_float_param);
}
#endif
