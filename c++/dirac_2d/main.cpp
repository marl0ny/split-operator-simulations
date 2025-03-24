#include "glfw_window.hpp"
#include "interactor.hpp"
#include "spinors.hpp"
#include "user_edit_glsl.hpp"
#include "arrows2d.hpp"
#include "visualization2d.hpp"
#include "parameters.hpp"
#include "simulation.hpp"
// #include <iostream>


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

struct UserDefinedProgram {
    bool is_time_dependent;
    int program;
    std::map<std::string, float> uniforms;
};

struct UserProgramsManager {
    std::map<std::string, float> all_seen_variables;
    UserDefinedProgram program;
    std::vector<int> programs_queue;
    void add_new_program(int program, std::set<std::string> variables_set) {
        std::map<std::string, float> variables {};
        for (std::string variable: variables_set) {
            if (all_seen_variables.count(variable))
                variables.insert({variable, all_seen_variables.at(variable)});
            else
                variables.insert({variable, 1.0F});
        }
        this->program = {
            .is_time_dependent=(bool)variables.count("t"),
            .program=program,
            .uniforms=variables,
        };
        this->programs_queue.clear();
        this->programs_queue.push_back(this->program.program);
    }
    void add_seen_variable(std::string variable, float value) {
        // while (this->all_seen_variables.at(variable) != value) {
        this->all_seen_variables[variable] = value;
        this->program.uniforms[variable] = value;
        // this->all_seen_variables.insert({variable, value});
        // this->program.uniforms.insert({variable, value});

    }
    void queue_current() {
        this->programs_queue.push_back(this->program.program);
    }
    bool program_queued() {
        return this->programs_queue.size() != 0;
    }
    UserDefinedProgram expend_program() {
        this->programs_queue.pop_back();
        return this->program;
    }
};

static void display_parameters_as_sliders(
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

void dirac_2d(MainGLFWQuad main_render,
             int window_width, int window_height,
             sim_2d::SimParams &params,
             Interactor interactor) {
    std::vector<Vec2> start_position {};
    std::vector<Vec2> curr_position {};
    // potential.draw(
    //     programs.harmonic,
    //     {
    //         {"dimensions2D", {params.dimensions2d}},
    //     }
    // );
    sim_2d::Simulation sim(params, window_width, window_height);

    auto max = [](int a, int b) -> int {
        return (a > b)? a: b;
    };
    UserProgramsManager programs_manager {};
    s_sim_params_set_user_float_param = [&programs_manager](
        int c, std::string var_name, float value) {
        programs_manager.add_seen_variable(var_name, value);
        programs_manager.queue_current();
    };
    s_sim_params_set_string = [
        &params, &programs_manager](int c, int i, std::string s) {
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
    s_selection_set = [&params, &sim](int c, int val) {
        if (c == params.TEXEL_SIDE_LENGTH_SELECTOR) {
            printf("Selected %d\n", val);
            params.texelSideLengthSelector.selected = val;
            sim.change_simulation_dimensions(params);
        }
        if (c == params.MOUSE_SELECTOR) {
            params.mouseSelector.selected = val;
        }
    };
    Quaternion rotation = Quaternion{.i=0.0, .j=0.0, .k=0.0, .real=1.0};

    s_loop = [&] {
        if (programs_manager.program_queued()) {
            UserDefinedProgram program = programs_manager.expend_program();
            sim.modify_potential_with_user_program(
                params, program.program, program.uniforms);
        }
        if (start_position.size() > 0 && params.show3D) {
            Vec2 delta_2d = interactor.get_mouse_delta();
            Vec3 delta {.ind={delta_2d[0], delta_2d[1], 0.0}};
            Vec3 view_vec {.ind={0.0, 0.0, -1.0}};
            Vec3 axis = cross_product(delta, view_vec);
            Quaternion rot = Quaternion::rotator(
                3.0*axis.length(), axis);
            rotation = rotation*rot;
        }
        if (!params.show3D 
            && params.mouseSelector.selected == 0
            && start_position.size() > 0) {
            printf("Mouse selector: %d", params.mouseSelector.selected);
            Vec2 dist = 64.0*(curr_position[curr_position.size() - 1] - start_position[0]);
            sim.new_wave_function(params, start_position[0], dist);
        } else {
            sim.time_steps(params);
            params.t += params.dt*params.stepsPerFrame;
        }
        if (!params.show3D && start_position.size() > 0) {
            Vec2 pos = curr_position[curr_position.size() - 1];
            if (params.mouseSelector.selected == 1) {
                sim.sketch_modify_scalar_potential(params, pos);
            } else if (params.mouseSelector.selected == 2) {
                Vec2 dir = 1000.0*(
                    curr_position[curr_position.size() - 1] 
                    - curr_position[max(curr_position.size() - 2, 0)]);
                printf("Vector potential: %g, %g\n", dir.x, dir.y);
                sim.sketch_modify_vector_potential(params, pos, dir);
            }
        }
        Vec2 mouse_pos = interactor.get_mouse_position();
        main_render.draw(sim.render_view(
            params, mouse_pos, rotation, 0.25*Interactor::get_scroll()));
        auto poll_events = [&] {
            glfwPollEvents();
            interactor.click_update(main_render.get_window());
            Vec2 pos = interactor.get_mouse_position();

            if (pos.x > 0.0 && pos.x < 1.0 && 
                pos.y > 0.0 && pos.y < 1.0 && interactor.left_pressed()) {
                // Vec2 delta_2d = interactor.get_mouse_delta();
                if (start_position.empty()) {
                    start_position.push_back(pos);
                } else {
                    #ifdef __EMSCRIPTEN__
                    // TODO
                    #endif
                    // TODO
                }
                curr_position.push_back(pos);
            }
            if (interactor.left_released()) {
                if (!start_position.empty()) {
                    start_position.pop_back();
                    curr_position.clear();
                }
            }

            // #ifndef __EMSCRIPTEN__
            // if (glfwGetKey(main_render.get_window(), 
            //     GLFW_KEY_A) == GLFW_PRESS)
            //     s_input_type = NEW_WAVE_FUNCTION;
            // #endif
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

    // Initialize interactor
    Interactor interactor(main_quad.get_window());
    sim_2d::SimParams sim_params;
    {
        s_sim_params_set = [&sim_params](int c, Uniform u) {
            sim_params.set(c, u);
        };
        s_sim_params_get = [&sim_params](int c) -> Uniform {
            return sim_params.get(c);
        };
    }

    dirac_2d(
        main_quad, window_width, window_height, 
        sim_params, interactor);
    return 1;
}
