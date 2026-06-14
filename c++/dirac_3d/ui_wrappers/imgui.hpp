
// #include "parameters.hpp"

#ifndef _IMGUI_CONTROLS_
#define _IMGUI_CONTROLS_
// using namespace sim_3d;

#include "gl_wrappers.hpp"

#include "imgui/imgui.h"
#include "imgui/backends/imgui_impl_glfw.h"
#include "imgui/backends/imgui_impl_opengl3.h"
#include "common_imgui.hpp"

/* #include <functional>
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

static ImGuiIO global_io;
static std::map<int, std::string> global_labels;

void edit_label_display(int c, std::string text_content) {
    global_labels[c] = text_content;
}

void display_parameters_as_sliders(
    int c, std::set<std::string> variables, 
    std::set<std::string> do_not_show={ 
    }
    ) {
    std::string string_val = "[";
    for (auto &e: variables)
        string_val += """ + e + "", ";
    string_val += "]";
    string_val 
        = "modifyUserSliders(" + std::to_string(c) + ", " + string_val + ");";
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

void start_gui(void *window) {
    bool show_controls_window = true;
    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGuiIO& io = ImGui::GetIO();
    ImGui::StyleColorsClassic();
    ImGui_ImplGlfw_InitForOpenGL((GLFWwindow *)window, true);
    ImGui_ImplOpenGL3_Init("#version 330");
}*/

void imgui_controls(void *void_params) {
    SimParams *params = (SimParams *)void_params;
    for (auto &e: global_labels)
        params->set(e.first, 0, e.second);
    if (ImGui::SliderInt("Steps/frame", &params->stepsPerFrame, 0, 5))
            s_sim_params_set(params->STEPS_PER_FRAME, params->stepsPerFrame);
    if (ImGui::BeginMenu("Mouse usage")) {
        if (ImGui::MenuItem("Rotate only"))
            s_selection_set(params->MOUSE_SELECTOR, 0);
        if (ImGui::MenuItem("New wave function"))
            s_selection_set(params->MOUSE_SELECTOR, 1);
        if (ImGui::MenuItem("Sketch modify scalar potential"))
            s_selection_set(params->MOUSE_SELECTOR, 2);
        if (ImGui::MenuItem("Erase modify scalar potential"))
            s_selection_set(params->MOUSE_SELECTOR, 3);
        if (ImGui::MenuItem("Sketch modify vector potential"))
            s_selection_set(params->MOUSE_SELECTOR, 4);
        if (ImGui::MenuItem("Erase modify vector potential"))
            s_selection_set(params->MOUSE_SELECTOR, 5);
        ImGui::EndMenu();
    }
    if (ImGui::BeginMenu("Grid discretization size")) {
        if (ImGui::MenuItem("64x64x64"))
            s_selection_set(params->TEXEL_SIDE_LENGTH_SELECTOR, 0);
        if (ImGui::MenuItem("128x128x128"))
            s_selection_set(params->TEXEL_SIDE_LENGTH_SELECTOR, 1);
        if (ImGui::MenuItem("256x256x256"))
            s_selection_set(params->TEXEL_SIDE_LENGTH_SELECTOR, 2);
        ImGui::EndMenu();
    }
    ImGui::Text("Time step Δt (a.u.) = 0.000028");
    if (ImGui::SliderFloat("c|Δt|/Δx", &params->cdtdx, 0.0, 1.0))
           s_sim_params_set(params->CDTDX, params->cdtdx);
    if (ImGui::SliderFloat("mass (a.u.)", &params->m, 0.0, 10.0))
           s_sim_params_set(params->M, params->m);
    if (ImGui::TreeNode("Visualization Controls")) {
    if (ImGui::BeginMenu("Visualization select")) {
        if (ImGui::MenuItem("Volume render"))
            s_selection_set(params->VISUALIZATION_SELECT, 0);
        if (ImGui::MenuItem("Three orthogonal planar slices"))
            s_selection_set(params->VISUALIZATION_SELECT, 1);
        if (ImGui::MenuItem("Vector field"))
            s_selection_set(params->VISUALIZATION_SELECT, 2);
        if (ImGui::MenuItem("Three orthogonal planar slices, vector field"))
            s_selection_set(params->VISUALIZATION_SELECT, 3);
        if (ImGui::MenuItem("Volume render, vector field"))
            s_selection_set(params->VISUALIZATION_SELECT, 4);
        ImGui::EndMenu();
    }
    if (ImGui::Checkbox("Use perspective projection", &params->usePerspectiveProjection))
            s_sim_params_set(params->USE_PERSPECTIVE_PROJECTION, params->usePerspectiveProjection);
    if (ImGui::SliderFloat("Overall scaling", &params->brightness, 0.0, 20.0))
           s_sim_params_set(params->BRIGHTNESS, params->brightness);
    if (ImGui::TreeNode("Wave Function Visualization Options")) {
    ImGui::Text("(Please note: bar(𝜓) = 𝜓†γ⁰)");
    if (ImGui::Checkbox("Current 0th component (𝜓(r)†𝜓(r))", &params->showCurrent0))
            s_sim_params_set(params->SHOW_CURRENT0, params->showCurrent0);
    if (ImGui::Checkbox("Pseudocurrent 0th component (𝜓(r)†γ⁵𝜓(r))", &params->showPsuedocurrent0))
            s_sim_params_set(params->SHOW_PSUEDOCURRENT0, params->showPsuedocurrent0);
    if (ImGui::Checkbox("Scalar (bar(𝜓(r))𝜓(r))", &params->showScalar))
            s_sim_params_set(params->SHOW_SCALAR, params->showScalar);
    if (ImGui::Checkbox("Pseudoscalar (bar(𝜓(r))γ⁵𝜓(r))", &params->showPseudoscalar))
            s_sim_params_set(params->SHOW_PSEUDOSCALAR, params->showPseudoscalar);
    if (ImGui::Checkbox("|𝜓₁(r)|² component with phase", &params->showPsi0WPhase))
            s_sim_params_set(params->SHOW_PSI0_W_PHASE, params->showPsi0WPhase);
    if (ImGui::Checkbox("|𝜓₂(r)|² component with phase", &params->showPsi1WPhase))
            s_sim_params_set(params->SHOW_PSI1_W_PHASE, params->showPsi1WPhase);
    if (ImGui::Checkbox("|𝜓₃(r)|² component with phase", &params->showPsi2WPhase))
            s_sim_params_set(params->SHOW_PSI2_W_PHASE, params->showPsi2WPhase);
    if (ImGui::Checkbox("|𝜓₄(r)|² component with phase", &params->showPsi3WPhase))
            s_sim_params_set(params->SHOW_PSI3_W_PHASE, params->showPsi3WPhase);
    if (ImGui::Checkbox("Spatial current (bar(𝜓(r))γⁱ𝜓(r), i=1,2,3)", &params->showSpatialCurrent))
            s_sim_params_set(params->SHOW_SPATIAL_CURRENT, params->showSpatialCurrent);
    if (ImGui::Checkbox("Spatial pseudocurrent (bar(𝜓(r))γⁱγ⁵𝜓(r))", &params->showPseudospatialCurrent))
            s_sim_params_set(params->SHOW_PSEUDOSPATIAL_CURRENT, params->showPseudospatialCurrent);
    if (ImGui::Checkbox("Spin axis where (𝜓₁(r), 𝜓₂(r)) is spin up", &params->showPsi01Spin))
            s_sim_params_set(params->SHOW_PSI01_SPIN, params->showPsi01Spin);
    if (ImGui::Checkbox("Spin axis where (𝜓₃(r), 𝜓₄(r)) is spin up", &params->showPsi23Spin))
            s_sim_params_set(params->SHOW_PSI23_SPIN, params->showPsi23Spin);
    ImGui::TreePop();
    }
 
    if (ImGui::TreeNode("Volume Render Controls")) {
    if (ImGui::Checkbox("Linear interpolation", &params->useLinear))
            s_sim_params_set(params->USE_LINEAR, params->useLinear);
    if (ImGui::SliderFloat("Alpha brightness", &params->alphaBrightness, 0.0, 10.0))
           s_sim_params_set(params->ALPHA_BRIGHTNESS, params->alphaBrightness);
    if (ImGui::SliderFloat("Color brightness", &params->colorBrightness, 0.0, 10.0))
           s_sim_params_set(params->COLOR_BRIGHTNESS, params->colorBrightness);
    ImGui::Text("Volume dimensions (volumeTexelDimensions3D)");
    if (ImGui::SliderInt("volumeTexelDimensions3D[0]", &params->volumeTexelDimensions3D.ind[0], 16, 512))
            s_sim_params_set(params->VOLUME_TEXEL_DIMENSIONS3_D, params->volumeTexelDimensions3D);
    if (ImGui::SliderInt("volumeTexelDimensions3D[1]", &params->volumeTexelDimensions3D.ind[1], 16, 512))
            s_sim_params_set(params->VOLUME_TEXEL_DIMENSIONS3_D, params->volumeTexelDimensions3D);
    if (ImGui::SliderInt("volumeTexelDimensions3D[2]", &params->volumeTexelDimensions3D.ind[2], 16, 512))
            s_sim_params_set(params->VOLUME_TEXEL_DIMENSIONS3_D, params->volumeTexelDimensions3D);
    if (ImGui::Checkbox("Enable bloom", &params->applyBlur))
            s_sim_params_set(params->APPLY_BLUR, params->applyBlur);
    if (ImGui::SliderInt("Bloominess", &params->blurSize, 0, 10))
            s_sim_params_set(params->BLUR_SIZE, params->blurSize);
    ImGui::TreePop();
    }
 
    if (ImGui::TreeNode("Three Orthogonal Planar Slices Controls")) {
    ImGui::Text("Planar slices offsets (in normalized coordinates) for xy, yz, xz");
    if (ImGui::SliderFloat("planarNormCoordOffsets[0]", &params->planarNormCoordOffsets.ind[0], 0.0, 1.0))
           s_sim_params_set(params->PLANAR_NORM_COORD_OFFSETS, params->planarNormCoordOffsets);
    if (ImGui::SliderFloat("planarNormCoordOffsets[1]", &params->planarNormCoordOffsets.ind[1], 0.0, 1.0))
           s_sim_params_set(params->PLANAR_NORM_COORD_OFFSETS, params->planarNormCoordOffsets);
    if (ImGui::SliderFloat("planarNormCoordOffsets[2]", &params->planarNormCoordOffsets.ind[2], 0.0, 1.0))
           s_sim_params_set(params->PLANAR_NORM_COORD_OFFSETS, params->planarNormCoordOffsets);
    ImGui::TreePop();
    }
 
    if (ImGui::TreeNode("Arrows Plot")) {
    ImGui::Text("Arrows dimensions");
    if (ImGui::SliderInt("arrowDimensions[0]", &params->arrowDimensions.ind[0], 8, 128))
            s_sim_params_set(params->ARROW_DIMENSIONS, params->arrowDimensions);
    if (ImGui::SliderInt("arrowDimensions[1]", &params->arrowDimensions.ind[1], 8, 128))
            s_sim_params_set(params->ARROW_DIMENSIONS, params->arrowDimensions);
    if (ImGui::SliderInt("arrowDimensions[2]", &params->arrowDimensions.ind[2], 8, 128))
            s_sim_params_set(params->ARROW_DIMENSIONS, params->arrowDimensions);
    if (ImGui::Checkbox("Use conical arrows", &params->useCones))
            s_sim_params_set(params->USE_CONES, params->useCones);
    ImGui::TreePop();
    }
 
    ImGui::TreePop();
    }
 
    if (ImGui::TreeNode("Initialize New Wave Function Controls")) {
    if (ImGui::SliderFloat("Size", &params->sigma, 0.03, 0.3))
           s_sim_params_set(params->SIGMA, params->sigma);
    if (ImGui::SliderFloat("Positive energy (+E) content", &params->posE, 0.0, 1.0))
           s_sim_params_set(params->POS_E, params->posE);
    ImGui::Text("Negative energy (-E) content = 0");
    ImGui::Text("Spin up orientation for +E solutions (sx, sy, sz)");
    if (ImGui::SliderFloat("posSpinDir[0]", &params->posSpinDir.ind[0], -1.0, 1.0))
           s_sim_params_set(params->POS_SPIN_DIR, params->posSpinDir);
    if (ImGui::SliderFloat("posSpinDir[1]", &params->posSpinDir.ind[1], -1.0, 1.0))
           s_sim_params_set(params->POS_SPIN_DIR, params->posSpinDir);
    if (ImGui::SliderFloat("posSpinDir[2]", &params->posSpinDir.ind[2], -1.0, 1.0))
           s_sim_params_set(params->POS_SPIN_DIR, params->posSpinDir);
    ImGui::Text("(Orientations get normalized. (0, 0, 0) changed to (0, 0, 1).)");
    ImGui::Text("Spin up orientation for -E solutions");
    if (ImGui::SliderFloat("negSpinDir[0]", &params->negSpinDir.ind[0], -1.0, 1.0))
           s_sim_params_set(params->NEG_SPIN_DIR, params->negSpinDir);
    if (ImGui::SliderFloat("negSpinDir[1]", &params->negSpinDir.ind[1], -1.0, 1.0))
           s_sim_params_set(params->NEG_SPIN_DIR, params->negSpinDir);
    if (ImGui::SliderFloat("negSpinDir[2]", &params->negSpinDir.ind[2], -1.0, 1.0))
           s_sim_params_set(params->NEG_SPIN_DIR, params->negSpinDir);
    if (ImGui::Checkbox("Apply spinor and +E/-E configuration to each momentum plane wave individually. Plane waves then summed up to form wave packet.", &params->momentumSpaceInit))
            s_sim_params_set(params->MOMENTUM_SPACE_INIT, params->momentumSpaceInit);
    ImGui::Text("Wave number, w.r.t. simulation domain");
    if (ImGui::SliderInt("wavenumber[0]", &params->wavenumber.ind[0], -16, 16))
            s_sim_params_set(params->WAVENUMBER, params->wavenumber);
    if (ImGui::SliderInt("wavenumber[1]", &params->wavenumber.ind[1], -16, 16))
            s_sim_params_set(params->WAVENUMBER, params->wavenumber);
    if (ImGui::SliderInt("wavenumber[2]", &params->wavenumber.ind[2], -16, 16))
            s_sim_params_set(params->WAVENUMBER, params->wavenumber);
    ImGui::Text("Position (norm. coord.)");
    if (ImGui::SliderFloat("position[0]", &params->position.ind[0], 0.0, 1.0))
           s_sim_params_set(params->POSITION, params->position);
    if (ImGui::SliderFloat("position[1]", &params->position.ind[1], 0.0, 1.0))
           s_sim_params_set(params->POSITION, params->position);
    if (ImGui::SliderFloat("position[2]", &params->position.ind[2], 0.0, 1.0))
           s_sim_params_set(params->POSITION, params->position);
    if (ImGui::SliderFloat("Absorbtion", &params->absCoeff, 0.0, 10.0))
           s_sim_params_set(params->ABS_COEFF, params->absCoeff);
    if (ImGui::Button("Initialize new wave function"))
           s_button_pressed(params->INITIALIZE_NEW_WAVE_FUNCTION_BUTTON);
    ImGui::TreePop();
    }
 
    if (ImGui::TreeNode("Initialize Potential Controls")) {
    if (ImGui::BeginMenu("Presets")) {
        if (ImGui::MenuItem("0"))
            s_selection_set(params->PRESET_POTENTIALS_DROPDOWN, 0);
        if (ImGui::MenuItem("abs(a/2)*(x^2 + y^2 + z^2)"))
            s_selection_set(params->PRESET_POTENTIALS_DROPDOWN, 1);
        if (ImGui::MenuItem("a/sqrt(x^2 + y^2 + z^2)"))
            s_selection_set(params->PRESET_POTENTIALS_DROPDOWN, 2);
        if (ImGui::MenuItem("10.0*(step(-y^2+(height*0.04*s1)^2)+step(y^2-(height*0.06*s2)^2))*step(-x^2+(width*0.04*w)^2)"))
            s_selection_set(params->PRESET_POTENTIALS_DROPDOWN, 3);
        ImGui::EndMenu();
    }
 ImGui::Text("4-Vector Potential");  // name
    {
        std::string string_val = std::string(240, '\0');
        /* if (global_user_text_entries.count(66) > 0) { // i
            std::string prev = global_user_text_entries.at(66); // i
            string_val = prev;
        } else {
            string_val = std::string(240, '\0');
        } */
        if (ImGui::InputText(
            "[0]", (char *)string_val.c_str(), 240   // k
            , ImGuiInputTextFlags_EnterReturnsTrue
            )) {
            std::string string_val2 = "";
            for (const char &c: string_val) {
                if (c != '\0')
                    string_val2 += c;
                else
                    break;
            }
            if (string_val2[0] == '\0')
                string_val2 = "0";
            if (global_user_text_entries.count(66) == 0) { // i
                global_user_text_entries.insert({66, {string_val2} }); // i
            } else {
                if (global_user_text_entries.at(66).size() <= 0) // i, k
                    global_user_text_entries.at(66).push_back(string_val2); // i 
                global_user_text_entries.at(66)[0] = string_val2; // i, k
            }
            s_sim_params_set_string(66, 0, string_val2); // i, k
        }
    }
    if (global_user_text_entries.count(66) > 0) // i
        ImGui::Text(
            (char *)global_user_text_entries.at(66)[0].c_str()); // i, k
    // name, i, i, k, i, i, i, k, i, i, k, i, k, i, i, k
  
    if (global_user_defined_variables_in_use.count(66) > 0
        ) { // i
        std::set<std::string> variables 
            = global_user_defined_variables_in_use.at(66);  // i
        if (variables.size() > 0) {
            for (std::string e: variables) {
                float value = global_user_defined_variables.at(66).at(e); // i
                if (ImGui::SliderFloat(e.c_str(), &value, -5.0, 5.0)) {
                    s_sim_params_set_user_float_param(66, e, value); // i
                    global_user_defined_variables.at(66).at(e) = value;  // i
                }
            }  
        }
    }
 ImGui::Text("4-Vector Potential");  // name
    {
        std::string string_val = std::string(240, '\0');
        /* if (global_user_text_entries.count(66) > 0) { // i
            std::string prev = global_user_text_entries.at(66); // i
            string_val = prev;
        } else {
            string_val = std::string(240, '\0');
        } */
        if (ImGui::InputText(
            "[1]", (char *)string_val.c_str(), 240   // k
            , ImGuiInputTextFlags_EnterReturnsTrue
            )) {
            std::string string_val2 = "";
            for (const char &c: string_val) {
                if (c != '\0')
                    string_val2 += c;
                else
                    break;
            }
            if (string_val2[0] == '\0')
                string_val2 = "0";
            if (global_user_text_entries.count(66) == 0) { // i
                global_user_text_entries.insert({66, {string_val2} }); // i
            } else {
                if (global_user_text_entries.at(66).size() <= 1) // i, k
                    global_user_text_entries.at(66).push_back(string_val2); // i 
                global_user_text_entries.at(66)[1] = string_val2; // i, k
            }
            s_sim_params_set_string(66, 1, string_val2); // i, k
        }
    }
    if (global_user_text_entries.count(66) > 0) // i
        ImGui::Text(
            (char *)global_user_text_entries.at(66)[1].c_str()); // i, k
    // name, i, i, k, i, i, i, k, i, i, k, i, k, i, i, k
  
    if (global_user_defined_variables_in_use.count(66) > 0
        ) { // i
        std::set<std::string> variables 
            = global_user_defined_variables_in_use.at(66);  // i
        if (variables.size() > 0) {
            for (std::string e: variables) {
                float value = global_user_defined_variables.at(66).at(e); // i
                if (ImGui::SliderFloat(e.c_str(), &value, -5.0, 5.0)) {
                    s_sim_params_set_user_float_param(66, e, value); // i
                    global_user_defined_variables.at(66).at(e) = value;  // i
                }
            }  
        }
    }
 ImGui::Text("4-Vector Potential");  // name
    {
        std::string string_val = std::string(240, '\0');
        /* if (global_user_text_entries.count(66) > 0) { // i
            std::string prev = global_user_text_entries.at(66); // i
            string_val = prev;
        } else {
            string_val = std::string(240, '\0');
        } */
        if (ImGui::InputText(
            "[2]", (char *)string_val.c_str(), 240   // k
            , ImGuiInputTextFlags_EnterReturnsTrue
            )) {
            std::string string_val2 = "";
            for (const char &c: string_val) {
                if (c != '\0')
                    string_val2 += c;
                else
                    break;
            }
            if (string_val2[0] == '\0')
                string_val2 = "0";
            if (global_user_text_entries.count(66) == 0) { // i
                global_user_text_entries.insert({66, {string_val2} }); // i
            } else {
                if (global_user_text_entries.at(66).size() <= 2) // i, k
                    global_user_text_entries.at(66).push_back(string_val2); // i 
                global_user_text_entries.at(66)[2] = string_val2; // i, k
            }
            s_sim_params_set_string(66, 2, string_val2); // i, k
        }
    }
    if (global_user_text_entries.count(66) > 0) // i
        ImGui::Text(
            (char *)global_user_text_entries.at(66)[2].c_str()); // i, k
    // name, i, i, k, i, i, i, k, i, i, k, i, k, i, i, k
  
    if (global_user_defined_variables_in_use.count(66) > 0
        ) { // i
        std::set<std::string> variables 
            = global_user_defined_variables_in_use.at(66);  // i
        if (variables.size() > 0) {
            for (std::string e: variables) {
                float value = global_user_defined_variables.at(66).at(e); // i
                if (ImGui::SliderFloat(e.c_str(), &value, -5.0, 5.0)) {
                    s_sim_params_set_user_float_param(66, e, value); // i
                    global_user_defined_variables.at(66).at(e) = value;  // i
                }
            }  
        }
    }
 ImGui::Text("4-Vector Potential");  // name
    {
        std::string string_val = std::string(240, '\0');
        /* if (global_user_text_entries.count(66) > 0) { // i
            std::string prev = global_user_text_entries.at(66); // i
            string_val = prev;
        } else {
            string_val = std::string(240, '\0');
        } */
        if (ImGui::InputText(
            "[3]", (char *)string_val.c_str(), 240   // k
            , ImGuiInputTextFlags_EnterReturnsTrue
            )) {
            std::string string_val2 = "";
            for (const char &c: string_val) {
                if (c != '\0')
                    string_val2 += c;
                else
                    break;
            }
            if (string_val2[0] == '\0')
                string_val2 = "0";
            if (global_user_text_entries.count(66) == 0) { // i
                global_user_text_entries.insert({66, {string_val2} }); // i
            } else {
                if (global_user_text_entries.at(66).size() <= 3) // i, k
                    global_user_text_entries.at(66).push_back(string_val2); // i 
                global_user_text_entries.at(66)[3] = string_val2; // i, k
            }
            s_sim_params_set_string(66, 3, string_val2); // i, k
        }
    }
    if (global_user_text_entries.count(66) > 0) // i
        ImGui::Text(
            (char *)global_user_text_entries.at(66)[3].c_str()); // i, k
    // name, i, i, k, i, i, i, k, i, i, k, i, k, i, i, k
  
    if (global_user_defined_variables_in_use.count(66) > 0
        ) { // i
        std::set<std::string> variables 
            = global_user_defined_variables_in_use.at(66);  // i
        if (variables.size() > 0) {
            for (std::string e: variables) {
                float value = global_user_defined_variables.at(66).at(e); // i
                if (ImGui::SliderFloat(e.c_str(), &value, -5.0, 5.0)) {
                    s_sim_params_set_user_float_param(66, e, value); // i
                    global_user_defined_variables.at(66).at(e) = value;  // i
                }
            }  
        }
    }
    ImGui::TreePop();
    }
 
    if (ImGui::Checkbox("Take screenshots at every frame (uncompressed bitmap)", &params->takeScreenshots.is_recording))
            s_configure_bmp_recording(params->TAKE_SCREENSHOTS, params->takeScreenshots.is_recording);

}

// bool outside_gui() {
//     return !global_io.WantCaptureMouse;
// }

void display_gui(void *data) {
    global_io = ImGui::GetIO();
    ImGui_ImplOpenGL3_NewFrame();
    ImGui_ImplGlfw_NewFrame();
    ImGui::NewFrame();
    bool val = true;
    ImGui::Begin("Controls", &val);
    ImGui::Text("WIP AND INCOMPLETE");
    imgui_controls(data);
    ImGui::End();
    ImGui::Render();
    ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());
}

#endif
