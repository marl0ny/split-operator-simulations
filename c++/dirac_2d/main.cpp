#include "glfw_window.hpp"
#include "interactor.hpp"
#include "spinors.hpp"
#include "user_edit_glsl.hpp"
#include "arrows2d.hpp"
#include "visualization2d.hpp"
#include "parameters.hpp"
#include "simulation.hpp"
#include "matrix.hpp"

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#include <emscripten/bind.h>
#endif
#include <functional>

#include "wasm_wrappers.hpp"

static std::function <void()> s_loop;
#ifdef __EMSCRIPTEN__
static void s_main_loop() {
    s_loop();
}
#endif

static Vec3 get_line_plane_intersection(
    const Vec3 &line_start, const Vec3 &line_end,
    const Vec3 &plane_vector0, const Vec3 &plane_vector1, const Vec3 &offset) {
    Vec3 line_direction = (line_end - line_start).normalized();
    Vec3 b = line_start - offset;
    Matrix m ({
        {plane_vector0.x, plane_vector1.x, -line_direction.x},
        {plane_vector0.y, plane_vector1.y, -line_direction.y},
        {plane_vector0.z, plane_vector1.z, -line_direction.z}});
    auto b_vec = std::vector<double>{b[0], b[1], b[2]};
    std::vector<double> solution = m.solve(b_vec);
    return offset 
        + plane_vector0*float(solution[0]) + plane_vector1*float(solution[1]);
}

static std::vector<Vec3> line_from_screen_cursor(
    Quaternion rot, float scale, Vec2 screen_cursor_pos) {
    screen_cursor_pos = 2.0*(screen_cursor_pos - Vec2{.ind{0.5, 0.5}});
    Quaternion cursor_pos0_3d {
        .real=1.0,
        .i=screen_cursor_pos.x, .j=screen_cursor_pos.y, .k=-1.0
    };
    Quaternion cursor_pos1_3d {
        .real=1.0,
        .i=screen_cursor_pos.x, .j=screen_cursor_pos.y, .k=1.0
    };
    cursor_pos0_3d = rotate(cursor_pos0_3d, rot.conj())/scale;
    cursor_pos1_3d = rotate(cursor_pos1_3d, rot.conj())/scale;
    Vec3 cursor_pos0_3d_v {.ind={
        cursor_pos0_3d.i, cursor_pos0_3d.j, cursor_pos0_3d.k
    }};
    Vec3 cursor_pos1_3d_v {.ind={
        cursor_pos1_3d.i, cursor_pos1_3d.j, cursor_pos1_3d.k
    }};
    return {cursor_pos0_3d_v, cursor_pos1_3d_v};
}

static Vec2 get_intersection_from_user_input(
    Quaternion rotation, float scale, Vec2 user_input_loc) {
    Vec3 plane_vector1 {.x=1.0, .y=0.0, .z=0.0};
    Vec3 plane_vector2 {.x=0.0, .y=1.0, .z=0.0};
    auto lines = line_from_screen_cursor(
        rotation, scale, user_input_loc);
    Vec3 intersection = get_line_plane_intersection(
        lines[0], lines[1],
        plane_vector1, plane_vector2,
        Vec3{.x=0.0, .y=0.0, .z=0.0});
    Vec2 location2d = Vec2{.x=intersection.x + 0.5F, .y=intersection.y + 0.5F};
    return location2d;
}

static int convert_side_length_selector_value(int val) {
    return std::pow(2, (val + 7));
}

inline static void set_preset_potential(
    int val, 
    sim_2d::SimParams &params,
    UserProgramsManager &programs_manager) {
    std::vector<std::string> four_vector_potential;
    params.presetPotentialSelector.selected = val;
    printf("Preset selection: %d\n", val);
    enum {
        FREE=0, QUADRATIC=1, STEP=2, CIRCLE=3, DOUBLE_SLIT=4
    };
    if (val == FREE) {
        four_vector_potential = {"0", "0", "0", "0", };
    } else if (val == QUADRATIC) {
        four_vector_potential = {
            "k*(x^2 + y^2)", 
            "0", "0", "0"};
    } else if (val == STEP) {
        four_vector_potential = {
            "10*amp*0.5*(tanh(75.0*(y/height)) + 1.0)",
            "0", "0", "0"};
    } else if (val == CIRCLE) {
        four_vector_potential = {
            "10*amp*0.5*(tanh(75.0*(((x/width)^2 + (y/height)^2)^0.5 - 0.45)) + 1.0)",
            "0", "0", "0"};
    } else if (val == DOUBLE_SLIT) {
        std::string double_slit_string = "";
        double_slit_string 
            += "40*step(thickness*0.02 - abs((y/height+0.5) - 0.5))";
        double_slit_string 
            += "- 40*step(thickness*0.02 - abs((y/height+0.5) - 0.5)) * (";
        double_slit_string
            += "step(thickness*0.02 - abs((x/width+0.5) - 0.45))";
        double_slit_string
            += " + step(thickness*0.02 - abs((x/width+0.5) - 0.55)) )";
        four_vector_potential = {
            double_slit_string,
            "0", "0", "0"
        };
    } else {
        four_vector_potential = {
            "0", 
            "0", "0", "0", };
    }
    int program;
    std::set<std::string> variables_set = 
        initialize_glsl_program_from_strings(
            program, four_vector_potential);
    programs_manager.add_new_program(
        program, variables_set
    );
    display_parameters_as_sliders(
        params.FOUR_VECTOR_POTENTIAL, variables_set);
}

template <typename T> T static max(T a, T b) {
    return (a > b)? a: b;
}

static double get_scaled_scroll() {
    return 0.1*Interactor::get_scroll();
}

void dirac_2d(MainGLFWQuad main_render,
             int window_width, int window_height,
             sim_2d::SimParams &params,
             Interactor interactor) {
    
    sim_2d::Simulation sim(params, window_width, window_height);
    UserProgramsManager programs_manager {};

    {
        s_sim_params_set_user_float_param = [&programs_manager](
            int c, std::string var_name, float value) {
            programs_manager.add_seen_variable(var_name, value);
            programs_manager.queue_current();
        };
        s_sim_params_set_string = [&params, &programs_manager](
            int c, int i, std::string s) {
            params.set(c, i, s);
            int program;
            std::set<std::string> variables_set = 
                initialize_glsl_program_from_strings(
                    program, params.fourVectorPotential);
            programs_manager.add_new_program(
                program, variables_set
            );
            display_parameters_as_sliders(c, variables_set);
        };
        s_selection_set = [&params, &sim, &programs_manager](
            int c, int val) {
            if (c == params.TEXEL_SIDE_LENGTH_SELECTOR) {
                printf("Selected %d\n", val);
                params.texelSideLengthSelector.selected = val;
                sim.change_simulation_dimensions(params);
                {
                    std::string text_content
                        = "Time step Δt (a.u.) = ";
                    int texel_side_length 
                        = convert_side_length_selector_value(
                            params.texelSideLengthSelector.selected);
                    float dt = params.cdtdx
                    * ((params.sideLength/float(texel_side_length))/params.c);
                    std::string string_val = std::to_string(dt);
                    text_content += string_val;
                    edit_label_display(params.DT_LABEL, text_content);
                }
            }
            if (c == params.MOUSE_SELECTOR) {
                params.mouseSelector.selected = val;
            }
            if (c == params.PRESET_POTENTIAL_SELECTOR) {
                set_preset_potential(val, params, programs_manager);
            }
        };
        s_sim_params_set = [&params](int c, Uniform u) {
            params.set(c, u);
            if (c == params.POS_E) {
                std::string text_content
                    = "Proportion of -E solutions = ";
                int i_val = int(100.0*(1.0 - u.f32));
                std::string string_val;
                if (i_val == 100)
                    string_val = "1";
                else if (i_val < 10)
                    string_val = "0.0" + std::to_string(i_val);
                else
                    string_val = "0." + std::to_string(i_val);;
                text_content += string_val;
                edit_label_display(params.NEG_E, text_content);
            }
            if (c == params.CDTDX) {
                std::string text_content
                    = "Time step Δt (a.u.) = ";
                int texel_side_length 
                    = convert_side_length_selector_value(
                        params.texelSideLengthSelector.selected);
                float dt = params.cdtdx
                * ((params.sideLength/float(texel_side_length))/params.c);
                std::string string_val = std::to_string(dt);
                text_content += string_val;
                edit_label_display(params.DT_LABEL, text_content);
            }
        };
        s_sim_params_get = [&params](int c) -> Uniform {
            return params.get(c);
        };
    }

    Quaternion rotation = Quaternion{.i=0.0, .j=0.0, .k=0.0, .real=1.0};
    auto increment_rotation = [](
        Quaternion rotation, Interactor &interactor) -> Quaternion {
        Vec2 delta_2d = interactor.get_mouse_delta();
        Vec3 delta {.ind={delta_2d[0], delta_2d[1], 0.0}};
        Vec3 view_vec {.ind={0.0, 0.0, -1.0}};
        Vec3 axis = cross_product(delta, view_vec);
        Quaternion rot = Quaternion::rotator(
            3.0*axis.length(), axis);
        return rotation*rot;
    };
    std::vector<Vec2> start_position {};
    std::vector<Vec2> curr_position {};
    std::vector<Vec2> start_intersection {};
    enum MouseSelection {
        NEW_WAVE_FUNC=0, SCALAR_SKETCH=1, SCALAR_ERASE=2, VEC_SKETCH=3, VEC_ERASE=4,
        ROTATE_ZOOM=5
    };

    auto init_wave_function = [&]() -> bool {
        Vec2 location = start_position[0], dist;
        if (params.show3D) {
            dist = Vec2{.ind{0.0, 0.0}};
            if (start_intersection.empty()) 
                start_intersection.push_back(get_intersection_from_user_input(
                        rotation, get_scaled_scroll(), 
                        location));
            Vec2 location2 = get_intersection_from_user_input(
                rotation, get_scaled_scroll(), 
                curr_position[curr_position.size() - 1]);
            dist = 64.0*(location2 - start_intersection[0]);
            float dist_length = dist.length();
            int texel_side_length 
                = convert_side_length_selector_value(
                    params.texelSideLengthSelector.selected);
            if (dist_length > float(texel_side_length)/2.0)
                dist = (float(texel_side_length)/2.0)*dist.normalized();
            if (start_intersection[0].x > 1.0 
                || start_intersection[0].x < 0.0 
                || start_intersection[0].y > 1.0 
                || start_intersection[0].y < 0.0) {
                rotation = increment_rotation(rotation, interactor);
                return false;
            } else {
                sim.new_wave_function(
                    params, start_intersection[0], dist);
                return true;
            }
            // printf("intersection: %g, %g\n", location.x, location.y);
        } else {
            dist = 64.0*(curr_position[curr_position.size() - 1] 
                - start_position[0]);
            // float dist_length = dist.length();
            // int texel_side_length 
            //     = convert_side_length_selector_value(
            //         params.texelSideLengthSelector.selected);
            // if (dist_length > float(texel_side_length)/2.0)
            //     dist = (float(texel_side_length)/2.0)*dist.normalized();
            sim.new_wave_function(params, location, dist);
        }
        return true;
    };

    s_loop = [&] {
        if (programs_manager.program_queued()) {
            UserDefinedProgram program = programs_manager.expend_program();
            sim.modify_potential_with_user_program(
                params, program.program, program.uniforms);
        }
        // if (start_position.size() > 0 && params.show3D) {
        //     rotation = increment_rotation(rotation, interactor);
        // }
        if (start_position.size() > 0  && params.show3D &&
            params.mouseSelector.selected == MouseSelection::ROTATE_ZOOM)
            rotation = increment_rotation(rotation, interactor);
        if (params.mouseSelector.selected == MouseSelection::NEW_WAVE_FUNC
            && start_position.size() > 0 && init_wave_function()) {
        } else {
            sim.time_steps(params);
            sim.increment_time(params);
        }
        if (start_position.size() > 0) {
            Vec2 pos = curr_position[curr_position.size() - 1];
            if (params.mouseSelector.selected == MouseSelection::SCALAR_SKETCH
                || params.mouseSelector.selected 
                == MouseSelection::SCALAR_ERASE) {
                if (params.show3D) {
                    pos = get_intersection_from_user_input(
                        rotation, get_scaled_scroll(), pos);
                    if (pos.x > 1.0 || pos.x < 0.0 
                        || pos.y > 1.0 || pos.y < 0.0) {
                        rotation = increment_rotation(rotation, interactor);
                    } else {
                        if (params.mouseSelector.selected == SCALAR_SKETCH)
                            sim.sketch_modify_scalar_potential(params, pos);
                        else
                            sim.erase_modify_scalar_potential(params, pos);
                    }
                } else {
                    if (params.mouseSelector.selected == SCALAR_SKETCH)
                        sim.sketch_modify_scalar_potential(params, pos);
                    else
                        sim.erase_modify_scalar_potential(params, pos);
                }
            } else if (
                params.mouseSelector.selected == MouseSelection::VEC_SKETCH ||
                params.mouseSelector.selected == MouseSelection::VEC_ERASE) {
                if (params.show3D) {
                    Vec2 pos1 = curr_position[curr_position.size() - 1];
                    Vec2 pos2 
                        = curr_position[
                            max<int>(curr_position.size() - 2, 0)];
                    Vec2 pos2d = get_intersection_from_user_input(
                        rotation, get_scaled_scroll(), pos1);
                    Vec2 pos2d2 = get_intersection_from_user_input(
                        rotation, get_scaled_scroll(), pos2);
                    if (pos2d.x > 1.0 || pos2d.x < 0.0 
                        || pos2d.y > 1.0 || pos2d.y < 0.0) {
                        rotation = increment_rotation(rotation, interactor);
                        } else {
                        Vec2 dir = 1000.0*(pos2d2 - pos2d);
                        printf("Vector potential: %g, %g\n", dir.x, dir.y);
                        if (params.mouseSelector.selected == MouseSelection::VEC_SKETCH)
                            sim.sketch_modify_vector_potential(
                                params, pos2d, dir);
                        else
                            sim.erase_modify_vector_potential(
                            params, pos2d, dir);
                    }
                } else {
                    Vec2 dir = 1000.0*(
                        curr_position[curr_position.size() - 1] 
                        - curr_position[
                            max<int>(curr_position.size() - 2, 0)]);
                    printf("Vector potential: %g, %g\n", dir.x, dir.y);
                    if (params.mouseSelector.selected == MouseSelection::VEC_SKETCH)
                        sim.sketch_modify_vector_potential(params, pos, dir);
                    else
                        sim.erase_modify_vector_potential(params, pos, dir);
                }
            }
        }

        Vec2 mouse_pos = interactor.get_mouse_position();
        main_render.draw(sim.render_view(
            params, mouse_pos, rotation, get_scaled_scroll()));
        
        auto poll_events = [&] {
            glfwPollEvents();
            interactor.click_update(main_render.get_window());
            Vec2 pos = interactor.get_mouse_position();

            if (pos.x > 0.0 && pos.x < 1.0 && 
                pos.y > 0.0 && pos.y < 1.0 && interactor.left_pressed()) {
                if (start_position.empty())
                    start_position.push_back(pos);
                curr_position.push_back(pos);
            }
            if (interactor.left_released()) {
                if (!start_position.empty()) {
                    start_position.pop_back();
                    curr_position.clear();
                }
                if (!start_intersection.empty())
                    start_intersection.clear();
            }
        };
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

/*
 Can pass command line arguments to main. This is primarily
 introduced so that the dimensions of the window can be
 chosen before launch, which is particularly useful for 
 the WASM build where the html file page can vary in size.

*/
int main(int argc, char *argv[]) {
    int window_width = 1500, window_height = 1500;

    // Construct the main window quad
    if (argc >= 3) {
        window_width = std::atoi(argv[1]);
        window_height = std::atoi(argv[2]);
    }
    auto main_quad = MainGLFWQuad(window_width, window_height);

    // Initialize Interactor instance
    Interactor interactor(main_quad.get_window());
    sim_2d::SimParams sim_params;

    dirac_2d(
        main_quad, window_width, window_height, 
        sim_params, interactor);
    return 1;
}
