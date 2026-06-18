#include "gl_wrappers.hpp"
#include "glfw_window.hpp"
#include "parameters.hpp"
#include "interactor.hpp"
#include "parse.hpp"
#include "user_edit_glsl.hpp"
#include "simulation.hpp"

#include <GLFW/glfw3.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#include <emscripten/bind.h>
#include "ui_wrappers/wasm.hpp"
#else
#include "ui_wrappers/imgui.hpp"
#endif

#include <functional>
#include <utility>


static std::function <void()> s_loop;
#ifdef __EMSCRIPTEN__
static void s_main_loop() {
    s_loop();
}
#endif

using namespace sim_3d;

void simulation_ui_interface_handler(
    MainGLFWQuad main_render,
    TextureParams default_tex_params,  // Default texture parameters
    SimParams &params  // Parameters of the simulations
) {
    Interactor interactor(main_render.get_window());
    Simulation sim(default_tex_params, params);
    SimParams modified_params {};
    UserProgramsManager potential_text_edit {};

    // For handling mouse or touch interation.
    std::optional<Vec2> hover_position;
    std::optional<Vec2> start_position;
    std::vector<Vec2> cursor_positions {};
    std::optional<std::pair<Vec2, Vec2>> start_double_touches;
    std::vector<std::pair<Vec2, Vec2>> double_touches_positions {};
    Quaternion rotation // = Quaternion::rotator(0.25*PI, Vec3{.x=0.0, 1.0, 0.0});
        = Quaternion::rotator(-1.0, Vec3{.x=1.0, 1.0, 0.0});

    {
        /* Set those parameters of the Parameters struct that are treated
        as uniforms by GLSL shaders.*/
        s_sim_params_set = [&params, &sim, &potential_text_edit]
            (int c, Uniform u) {
            /* if (c == params.DATA_TEXEL_DIMENSIONS3_D) {
                sim.reset_data_dimensions(u.ivec3);
                IVec2 d = get_2d_from_3d_dimensions(u.ivec3);
                printf("Dimensions (%d, %d)\n",
                       d[0], d[1]);
                potential_text_edit.queue_current();
            }*/
            if (c == params.VOLUME_TEXEL_DIMENSIONS3_D) {
                sim.reset_volume_dimensions(u.ivec3);
                IVec2 d = get_2d_from_3d_dimensions(u.ivec3);
                printf("Dimensions (%d, %d)\n",
                       d[0], d[1]);
                // potential_text_edit.queue_current();
            }
            if (c == params.SIMULATION_DIMENSIONS3_D)
                potential_text_edit.queue_current();
            if (c == params.USE_LINEAR) {
                if (u.b32)
                    sim.reset_volume_filtering(GL_LINEAR);
                else
                    sim.reset_volume_filtering(GL_NEAREST);
            }
            params.set(c, u);
            if (c == params.CDTDX) {
                params.dt = params.cdtdx
                * ((params.sideLength/float(params.texelSideLength))/params.c);
                std::string string_val = std::to_string(params.dt);
                std::string text_content
                    = "Time step Δt (a.u.) = ";
                text_content += string_val;
                edit_label_display(params.DT_LABEL, text_content);
            }
            if (c == params.POS_E) {
                float positive_coeff = u.f32;
                float negative_content = std::sqrt(1.0F 
                    - positive_coeff*positive_coeff);
                std::string string_val = std::to_string(negative_content);
                std::string text_content
                    = "Negative energy (-E) content = " + string_val;
                edit_label_display(params.NEG_E, text_content);
            }
        };
        /* Get those parameters of the Parameters struct that can be
        inputed as uniforms to GLSL shaders.*/
        s_sim_params_get = [&params]
            (int c) -> Uniform {
            return params.get(c);
        };
        /* String parametres can't be configured as uniforms, so
        are set using a different function.*/
        s_sim_params_set_string = [&params, &potential_text_edit]
            (int c, int index, std::string val) {
            params.set(c, index, val);
            if (c == params.FOUR_VECTOR_POTENTIAL) {
                int program;
                std::vector<std::string> latex_out {"", "", "", ""};
                // printf("input: %s\n", &params.userTextEntry[0][0]);
                std::set<std::string> variables_set = 
                    initialize_glsl_program_from_strings(
                        program, latex_out, params.fourVectorPotential);
                potential_text_edit.add_new_program(program, variables_set);
                display_parameters_as_sliders(c, variables_set,  {"t"});
                std::string full_latex_text = "";
                if (latex_out[0].size() > 0)
                    full_latex_text += "V(x, y, z, t) = " + latex_out[0];
                if (latex_out[1].size() > 0)
                    full_latex_text += 
                        std::string((full_latex_text.size() == 0)? "": "\\\\\\\\")
                             + "A_x(x, y, z, t) = " + latex_out[1];
                if (latex_out[2].size() > 0)
                    full_latex_text += 
                        std::string((full_latex_text.size() == 0)? "": "\\\\\\\\")
                             + "A_y(x, y, z, t) = " + latex_out[2];
                if (latex_out[3].size() > 0)
                    full_latex_text += 
                        std::string((full_latex_text.size() == 0)? "": "\\\\\\\\")
                            + "A_z(x, y, z, t) = " + latex_out[3];
                edit_katex_label_display(params.LATEX_LABEL1, full_latex_text);
                // edit_katex_label_display(params.LATEX_LABEL1, 
                //     (latex_out[0].size() == 0)? 
                //     "": ("V(x, y, z, t) = " + latex_out[0]));
                // edit_katex_label_display(params.LATEX_LABEL2, 
                //     (latex_out[1].size() == 0)? 
                //     "": ("A_x(x, y, z, t) = " + latex_out[1]));
                // edit_katex_label_display(params.LATEX_LABEL3, 
                //     (latex_out[2].size() == 0)? 
                //     "": ("A_y(x, y, z, t) = " + latex_out[2]));
                // edit_katex_label_display(params.LATEX_LABEL4, 
                //     (latex_out[3].size() == 0)? 
                //     "": ("A_z(x, y, z, t) = " + latex_out[3]));
            }
        };
        /* Perform an action upon the press of a button. */
        s_button_pressed = [&params, &sim]
            (int param_code) {
            if (param_code == params.INITIALIZE_NEW_WAVE_FUNCTION_BUTTON) {
                sim.init(
                    params, params.position,
                    params.wavenumber, params.sigma);
            }
        };
        /* Floating-point value parameters and their associated sliders
        can be created by the user. This notifies and keeps track of any
        newly created user-defined parameter. The user defined paramters are
        not part of the Parameters struct, so are stored separately.*/
        s_sim_params_set_user_float_param = [&potential_text_edit]
            (int c, std::string var_name, float value) {
            potential_text_edit.add_seen_variable(var_name, value);
            potential_text_edit.queue_current();
        };
        /* Upon a change of a dropdown or selection menu, change its
        corresponding selection parameter in the Parameters struct so that
        it matches the dropdown.*/
        s_selection_set = [&params, &potential_text_edit, &sim]
            (int c, int val) {
            if (c == params.MOUSE_SELECTOR) {
                params.mouseSelector.selected = val;
            }
            if (c == params.PRESET_POTENTIALS_DROPDOWN) {
                params.presetPotentialsDropdown.selected = val;
                int program;
                std::vector<std::string> latex_out = std::vector<std::string> {
                    "", "", "", ""};
                std::set<std::string> variables_set = 
                    initialize_glsl_program_from_strings(
                        program, latex_out,
                        {params.presetPotentialsDropdown.options[val]});
                potential_text_edit.add_new_program(program, variables_set);
                display_parameters_as_sliders(
                    params.FOUR_VECTOR_POTENTIAL, variables_set, {"t"});
                std::string full_latex_text = "";
                if (latex_out[0].size() > 0)
                    full_latex_text += "V(x, y, z, t) = " + latex_out[0];
                if (latex_out[1].size() > 0)
                    full_latex_text += 
                        std::string((full_latex_text.size() == 0)? "": "\\\\\\\\")
                             + "A_x(x, y, z, t) = " + latex_out[1];
                if (latex_out[2].size() > 0)
                    full_latex_text += 
                        std::string((full_latex_text.size() == 0)? "": "\\\\\\\\")
                             + "A_y(x, y, z, t) = " + latex_out[2];
                if (latex_out[3].size() > 0)
                    full_latex_text += 
                        std::string((full_latex_text.size() == 0)? "": "\\\\\\\\")
                            + "A_z(x, y, z, t) = " + latex_out[3];
                edit_katex_label_display(params.LATEX_LABEL1, full_latex_text);
                // edit_katex_label_display(params.LATEX_LABEL2, 
                //     (latex_out[1].size() == 0)? 
                //     "": ("A_x(x, y, z, t) = " + latex_out[1]));
                // edit_katex_label_display(params.LATEX_LABEL3, 
                //     (latex_out[2].size() == 0)? 
                //     "": ("A_y(x, y, z, t) = " + latex_out[2]));
                // edit_katex_label_display(params.LATEX_LABEL4, 
                //     (latex_out[3].size() == 0)? 
                //     "": ("A_z(x, y, z, t) = " + latex_out[3]));
            }
            if (c == params.VISUALIZATION_SELECT) {
                params.visualizationSelect.selected = val;
            }
            if (c == params.TEXEL_SIDE_LENGTH_SELECTOR) {
                params.texelSideLengthSelector.selected = val;
                int texel_side_length = 64;
                if (val == 1)
                    texel_side_length = 128;
                else if (val == 2)
                    texel_side_length = 256;
                params.texelSideLength = texel_side_length;
                sim.reset_simulation_dimensions(IVec3{.ind{
                    texel_side_length, texel_side_length, texel_side_length
                }});
                sim.reset_data_reduce_dimensions(IVec3{.ind{
                    texel_side_length, texel_side_length, texel_side_length
                }});
                params.simulationDimensions3D.x = texel_side_length;
                params.simulationDimensions3D.y = texel_side_length;
                params.simulationDimensions3D.z = texel_side_length;
                params.dataTexelDimensions3D.x = texel_side_length;
                params.dataTexelDimensions3D.y = texel_side_length;
                params.dataTexelDimensions3D.z = texel_side_length;
                double e_max = sim.get_max_free_particle_energy(params);
                params.dt = (3.14159/e_max);
                float dx = params.sideLength/params.texelSideLength;
                float cdtdx = params.dt*params.c/dx;
                params.cdtdx = cdtdx;
                #ifdef __EMSCRIPTEN__
                edit_scalar_parameter_slider_display(params.CDTDX, "c|Δt|/Δx", params.cdtdx);
                #endif
                std::string string_val = std::to_string(params.dt);
                std::string text_content
                    = "Time step Δt (a.u.) = ";
                text_content += string_val;
                sim.init(
                    params, params.position, params.wavenumber, params.sigma);
                potential_text_edit.queue_current();
                edit_label_display(params.DT_LABEL, text_content);
            }
        };
        // /* Upon change of a user-defined parameter, change its value. */
        // s_user_edit_set_value = [&potential_text_edit]
        //     (int c, std::string var_name, float value) {
        // };
        // /* Upon change of a user-defined parameter, get its value. */
        // s_user_edit_get_value = [&potential_text_edit]
        //     (int c, std::string var_name) -> float {
        // };
        /* Retrieve the new image that was set by the user. */
        // s_image_set = [&params]
        //     (int c, const std::string &image_data, int w, int h) {
        // };
        s_configure_bmp_recording = [&params](int c, bool is_recording) {
            if (c == params.TAKE_SCREENSHOTS) {
                params.takeScreenshots.is_recording = is_recording;
            }
        };
        s_bmp_image = [&sim] () {
            std::vector<unsigned char> &image_data = sim.get_image_data();
            return (unsigned char *)&image_data[0];
        };
        s_bmp_image_size = [&sim]() {
            std::vector<unsigned char> &image_data = sim.get_image_data();
            return image_data.size();
        };
    }

    { // Initial configuration from the default preset option
        int program;
        int index = params.presetPotentialsDropdown.selected;
        std::vector<std::string> latex_out {"", "", "", ""};
        std::set<std::string> variables_set 
            = initialize_glsl_program_from_strings(
                program, latex_out,
                {params.presetPotentialsDropdown.options[index]});
        potential_text_edit.add_new_program(program, variables_set);
        display_parameters_as_sliders(
                    params.FOUR_VECTOR_POTENTIAL, variables_set, {"t"});
        std::string full_latex_text = "";
        if (latex_out[0].size() > 0)
            full_latex_text += "V(x, y, z, t) = " + latex_out[0];
        if (latex_out[1].size() > 0)
            full_latex_text += 
                std::string((full_latex_text.size() == 0)? "": "\\\\\\\\")
                        + "A_x(x, y, z, t) = " + latex_out[1];
        if (latex_out[2].size() > 0)
            full_latex_text += 
                std::string((full_latex_text.size() == 0)? "": "\\\\\\\\")
                        + "A_y(x, y, z, t) = " + latex_out[2];
        if (latex_out[3].size() > 0)
            full_latex_text += 
                std::string((full_latex_text.size() == 0)? "": "\\\\\\\\")
                    + "A_z(x, y, z, t) = " + latex_out[3];
        edit_katex_label_display(params.LATEX_LABEL1, full_latex_text);
                // edit_katex_label_display(params.LATEX_LABEL1, 
                //     (latex_out[0].size() == 0)? 
                //     "V(x, y, z, t) = 0": ("V(x, y, z, t) = " + latex_out[0]));
                // edit_katex_label_display(params.LATEX_LABEL2, 
                //     (latex_out[1].size() == 0)? 
                //     "A_x(x, y, z, t) = 0": ("A_x(x, y, z, t) = " + latex_out[1]));
                // edit_katex_label_display(params.LATEX_LABEL3, 
                //     (latex_out[2].size() == 0)? 
                //     "A_x(x, y, z, t) = 0": ("A_y(x, y, z, t) = " + latex_out[2]));
                // edit_katex_label_display(params.LATEX_LABEL4, 
                //     (latex_out[3].size() == 0)? 
                //     "A_x(x, y, z, t) = 0": ("A_z(x, y, z, t) = " + latex_out[3]));
        edit_bool_display(params.USE_LINEAR, 
            default_tex_params.min_filter == GL_LINEAR);
        double e_max = sim.get_max_free_particle_energy(params);
        params.dt = (3.14159/e_max);
        float dx = params.sideLength/params.texelSideLength;
        float cdtdx = params.dt*params.c/dx;
        params.cdtdx = cdtdx;
        #ifdef __EMSCRIPTEN__
        edit_scalar_parameter_slider_display(params.CDTDX, "c|Δt|/Δx", params.cdtdx);
        #endif
        std::string string_val = std::to_string(params.dt);
        std::string text_content
            = "Time step Δt (a.u.) = ";
        text_content += string_val;
        edit_label_display(params.DT_LABEL, text_content);
        sim.init(params,
                Vec3{.x=0.5, 0.5, 0.5},
                IVec3{.x=10, 0, 0}, 0.05);
    }

    start_gui(main_render.get_window());
    s_loop = [&] {

        if (start_position.has_value()) {
            if (cursor_positions.size() > 1) {
                Vec2 delta_2d = interactor.get_mouse_delta();
                Vec3 delta {.ind={delta_2d[0], delta_2d[1], 0.0}};
                if (s_is_on_touch_screen() && delta.length() > 0.01)
                    delta = 0.01*delta/delta.length();
                Vec3 view_vec {.ind={0.0, 0.0, -1.0}};
                Vec3 axis = cross_product(delta, view_vec);
                Quaternion rot = Quaternion::rotator(
                    3.0*axis.length(), axis);
                if (!sim.modify_from_mouse_touch_input(
                    params, rotation, 0.01*Interactor::get_scroll(), cursor_positions))
                    rotation = rotation*rot;    
            }
        } else {
        }
        if (!potential_text_edit.program_queued() && potential_text_edit.is_time_dependent()) {
            potential_text_edit.queue_current();
        }
        if (potential_text_edit.program_queued()) {
            UserDefinedProgram user_defined = potential_text_edit.expend_program();
            sim.add_user_defined(
                params, user_defined.program, user_defined.uniforms,
                potential_text_edit.is_time_dependent());

        }
        for (int i = 0; i < params.stepsPerFrame; i++) {
            // if (is_placing_new_wave_function(params, cursor_positions))
            //     break;
            if (cursor_positions.size() > 0 && params.mouseSelector.selected == 1
                && sim.is_inside(params, rotation, 
                        0.01*Interactor::get_scroll(), cursor_positions[0]))
                break;
            sim.time_step(params);
            params.t += params.dt;
        }
        if (cursor_positions.size() > 0 && params.mouseSelector.selected == 1
            && sim.is_inside(params, rotation, 
                        0.01*Interactor::get_scroll(), cursor_positions[0]))
            main_render.draw(
                sim.view(params, cursor_positions[0], 
                    rotation, 0.01*Interactor::get_scroll()));
        else
            main_render.draw(
                sim.view(params, hover_position, 
                    rotation, 0.01*Interactor::get_scroll()));

        if (hover_position.has_value()) {
            Vec3 loc = sim.get_cursor_location();
            Vec3 scaled_loc = sim.get_scaled_cursor_location(params);
            if (loc.x >= -1.0 && loc.x < 1.0 && loc.y >= -1.0 && loc.y < 1.0
                && loc.z >= -1.0 && loc.z < 1.0) {
                // #ifdef __EMSCRIPTEN__
                if (params.showMomentumSpace) {
                    float x = std::round(scaled_loc.x*100)/100.0F;
                    float y = std::round(scaled_loc.y*100)/100.0F;
                    float z = std::round(scaled_loc.z*100)/100.0F;
                    float m = params.m;
                    float c = params.c;
                    float px = 2.0*3.14159*scaled_loc.x/float(params.sideLength);
                    float py = 2.0*3.14159*scaled_loc.y/float(params.sideLength);
                    float pz = 2.0*3.14159*scaled_loc.z/float(params.sideLength);
                    float p2 = px*px + py*py + pz*pz;
                    float energy = sqrt(m*m*c*c*c*c + c*c*p2);
                    edit_hovering_canvas_label_display(
                        SimParams::CANVAS_HOVER_DISPLAY,
                        "|E(𝐩)|: " + std::to_string(int(energy)) + ", "
                        + "px: " + std::to_string(x).substr(0, 5) + "(2π)/L, "
                        + "py: " + std::to_string(y).substr(0, 5) + "(2π)/L, "
                        + "pz: " + std::to_string(z).substr(0, 5) + "(2π)/L"

                    );
                } else {
                    edit_hovering_canvas_label_display(
                        SimParams::CANVAS_HOVER_DISPLAY,
                        "x: " + std::to_string(scaled_loc.x) + ", "
                        + "y: " + std::to_string(scaled_loc.y) + ", "
                        + "z: " + std::to_string(scaled_loc.z)
                    );
                }
                // #endif
                /* edit_hovering_canvas_visibility_top_left_offset(
                    SimParams::CANVAS_HOVER_DISPLAY, true, 50, 50
                );*/
            }
        }

        if (params.takeScreenshots.is_recording)
            download_bmp_image("dirac-3d");

        auto poll_events = [&] {
            // Tell GLFW to poll events
            glfwPollEvents();

            // Get user interaction events
            interactor.click_update(main_render.get_window());

            // Handle mouse or single touch events
            Vec2 pos = interactor.get_mouse_position();
            if (outside_gui() && pos.x > 0.0 && pos.x < 1.0 && 
                pos.y > 0.0 && pos.y < 1.0) { 
                if (interactor.left_pressed()) {
                    if (!start_position.has_value())
                        start_position = pos;
                    cursor_positions.push_back(pos);
                }
                hover_position = pos;
            } else {
                hover_position.reset();
            }
            if (interactor.left_released()) {
                if (start_position.has_value()) {
                    start_position.reset();
                    cursor_positions.clear();
                }
            }

            // Handle double touch events
            Vec2 double_touches[2];
            double_touches[0] = interactor.get_double_touch_position(0);
            double_touches[1] = interactor.get_double_touch_position(1);
            if (interactor.double_touch_active()
                && double_touches[0].x > 0.0 && double_touches[0].x < 1.0
                && double_touches[0].y > 0.0 && double_touches[0].y < 1.0
                && double_touches[1].x > 0.0 && double_touches[1].x < 1.0
                && double_touches[1].y > 0.0 && double_touches[1].y < 1.0) {
                if (!start_double_touches.has_value())
                    start_double_touches = 
                        {double_touches[0], double_touches[1]};
                double_touches_positions.push_back(
                        {double_touches[0], double_touches[1]});
            }
            if (interactor.double_touch_released()) {
                if (start_double_touches.has_value()) {
                    start_double_touches.reset();
                    double_touches_positions.clear();
                }
            }

            #ifndef __EMSCRIPTEN__
            #endif
        };
        display_gui(&params);
        poll_events();

        glfwSwapBuffers(main_render.get_window());
    };

    #ifdef __EMSCRIPTEN__
    emscripten_set_main_loop(s_main_loop, 0, true);
    #else
    while (!glfwWindowShouldClose(main_render.get_window()))
        s_loop();
    #endif
}


int main(int argc, char *argv[]) {
    int window_width = 1440, window_height = 1440;
    if (argc >= 3) {
        window_width = std::atoi(argv[1]);
        window_height = std::atoi(argv[2]);
    }
    int filter_type = GL_LINEAR;
    if (argc >= 4) {
        std::string s(argv[3]);
        if (s == "nearest")
            filter_type = GL_NEAREST;
    }
    if (argc >= 5) {
        std::string s(argv[4]);
        s_is_on_touch_screen = []() {
            return true;
        };
    } else {
        std::string s(argv[4]);
        s_is_on_touch_screen = []() {
            return false;
        };
    }
    SimParams params {};
    TextureParams default_tex_params = {
        .format=GL_RGBA16F,
        .width=(unsigned int)window_width,
        .height=(unsigned int)window_height,
        .generate_mipmap=false,
        // .generate_mipmap=!(filter_type == GL_NEAREST),
        .wrap_s=GL_CLAMP_TO_EDGE,
        .wrap_t=GL_CLAMP_TO_EDGE,
        .mag_filter=(unsigned int)filter_type,
        .min_filter=(unsigned int)filter_type
    };
    MainGLFWQuad 
    main_render (default_tex_params.width, default_tex_params.height);
    simulation_ui_interface_handler(
        main_render, default_tex_params, params);
    return 0;
}
