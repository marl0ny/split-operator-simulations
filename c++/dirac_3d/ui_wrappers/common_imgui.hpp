
#include "parameters.hpp"

#ifndef _IMGUI_WRAPPER_CONTROLS_
#define _IMGUI_WRAPPER_CONTROLS_
using namespace sim_3d;

#include "gl_wrappers.hpp"

#include "imgui/imgui.h"
#include "imgui/backends/imgui_impl_glfw.h"
#include "imgui/backends/imgui_impl_opengl3.h"

#include <functional>
#include <set>

#include "parameters.hpp"

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
static std::function<unsigned char *()> s_bmp_image;
static std::function<unsigned int ()> s_bmp_image_size;
static std::function<void (int, bool)> s_configure_bmp_recording;
static std::function<void(int, std::string, float)>
    s_sim_params_set_user_float_param;
static std::function<bool()> s_is_on_touch_screen;

static ImGuiIO global_io;
static std::map<int, std::string> global_labels;
static std::map<int, std::vector<std::string>>
    global_user_text_entries;
static std::map<int, std::map<std::string, float>> 
    global_user_defined_variables;
static std::map<int, std::set<std::string>>
    global_user_defined_variables_in_use;

void edit_label_display(int c, std::string text_content) {
    global_labels[c] = text_content;
}

void display_parameters_as_sliders(
    int c, std::set<std::string> variables, 
    std::set<std::string> do_not_show={}) {
    // fprintf(stdout, "is reached.\n");
    if (global_user_defined_variables.count(c) == 0)
        global_user_defined_variables.insert({c, {}});
    if (global_user_defined_variables_in_use.count(c) == 0)
        global_user_defined_variables_in_use.insert({c, variables});
    else
        global_user_defined_variables_in_use.at(c) = variables;
    for (const std::string &e: variables) {
        printf("%s\n", e.c_str());
        std::map<std::string, float> &variables_to_mod
            = global_user_defined_variables.at(c);
        if (variables_to_mod.count(e) == 0) {
            variables_to_mod.insert(
                {e, 1.0F}
            );
        }
    }
}


void edit_katex_label_display(int c, std::string val) {
    // TODO
}

void edit_bool_display(int c, bool value) {
    // TODO
}

void download_bmp_image(std::string postfix_name) {
    unsigned char *image_data = s_bmp_image();
    int image_size = s_bmp_image_size();
    std::string time = std::to_string(
        std::chrono::system_clock().now().time_since_epoch().count());
    std::string fname = time + postfix_name + ".bmp";
    FILE *f = fopen(&fname[0], "wb");
    // TODO: check file!
    fwrite(image_data, 1, image_size, f);
    // TOO: check file writing!

}

bool outside_gui() {
    return !global_io.WantCaptureMouse;
}

void start_gui(void *window) {
    bool show_controls_window = true;
    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGuiIO& io = ImGui::GetIO();
    ImGui::StyleColorsClassic();
    ImGui_ImplGlfw_InitForOpenGL((GLFWwindow *)window, true);
    ImGui_ImplOpenGL3_Init("#version 330");
}

#endif