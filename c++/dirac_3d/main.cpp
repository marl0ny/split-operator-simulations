
#include "glfw_window.hpp"
#include "interactor.hpp"
#include "simulation.hpp"
#include "spinors.hpp"
#include "matrix.hpp"
#include "parse.hpp"
#include "user_edit_glsl.hpp"
#include <iostream>


#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#include <emscripten/bind.h>

using namespace emscripten;
#endif
#include <functional>

static std::function <void()> s_loop;
#ifdef __EMSCRIPTEN__
static void s_main_loop() {
    s_loop();
}
#endif

static std::function <void(int, Uniform)> s_sim_params_set;
static std::function <void(int, int, std::string)> s_sim_params_set_string;
static std::function <Uniform(int)> s_sim_params_get;
static std::function<void(int, std::string, float)> s_user_edit_set_value;
static std::function<float(int, std::string)> s_user_edit_get_value;
static std::function<std::string(int)>
    s_user_edit_get_comma_separated_variables;


enum {
    NEW_INITIAL_CONDITIONS=0, MOUSE_ROTATE,
};
static int s_input_type = MOUSE_ROTATE;

void dirac_3d(MainGLFWQuad main_render,
             int window_width, int window_height,
             Interactor interactor,
             sim_3d::SimParams &sim_params,
             UserEditGLSLProgram &potential_edit
             ) {
    auto simulation = sim_3d::Simulation(
        sim_params, window_width, window_height);
    Quaternion rotation = Quaternion{.real=1.0, .i=0.0, .j=0.0, .k=0.0}; 
    float scale = 1.0;
    std::vector<Vec2> cursor_positions {};
    // Matrix::test_solve();
    s_loop = [&] {
        int steps_frame = sim_params.stepsPerFrame;
        for (int i = 0; i < steps_frame; i++)
            simulation.time_step(sim_params);
        scale = (1.0/25.0)*Interactor::get_scroll();
        Vec2 mouse_pos = interactor.get_mouse_position();
        main_render.draw(simulation.render_view(
            sim_params, rotation, scale, mouse_pos));
        auto poll_events = [&] {
            glfwPollEvents();
            interactor.click_update(main_render.get_window());
            Vec2 pos = interactor.get_mouse_position();
            if (potential_edit.refresh()) {
                simulation.set_potential_from_program(
                    potential_edit.get_program(),
                    potential_edit.get_active_uniforms(),
                    sim_params);
                #ifdef __EMSCRIPTEN__
                std::string s 
                    = std::string("userSliders(")
                    + std::to_string(sim_params.FOUR_VECTOR_POTENTIAL) 
                    +  ")";
                emscripten_run_script(s.c_str());
                #endif
            }
            if (pos.x > 0.0 && pos.x < 1.0 && 
                pos.y > 0.0 && pos.y < 1.0 && interactor.left_pressed()) {
                Vec2 delta_2d = interactor.get_mouse_delta();
                Vec3 delta {.ind={delta_2d[0], delta_2d[1], 0.0}};
                Vec3 view_vec {.ind={0.0, 0.0, -1.0}};
                Vec3 axis = cross_product(delta, view_vec);
                if (s_input_type == MOUSE_ROTATE) {
                    Quaternion rot = Quaternion::rotator(
                        3.0*axis.length(), axis);
                        rotation = rotation*rot;
                } else if (s_input_type == NEW_INITIAL_CONDITIONS) {
                    if (cursor_positions.empty()) {
                        cursor_positions.push_back(pos);
                        simulation.init_from_cursor_position(
                            sim_params, rotation, scale,
                            sim_params.texelSideLength/2,
                            sim_params.texelSideLength/2,
                            sim_params.texelSideLength/2,
                            pos, 
                            IVec3 {.ind={0, 0, 0}}, 
                            0.05
                        );
                    } else {
                        #ifdef __EMSCRIPTEN__
                        printf("Cursor position 1: %g, %g\n", cursor_positions[0].x, cursor_positions[0].y);
                        printf("Cursor position 2: %g, %g\n", pos.x, pos.y);
                        #endif
                        simulation.init_from_cursor_positions(
                            sim_params, rotation, scale,
                            sim_params.texelSideLength/2,
                            sim_params.texelSideLength/2,
                            sim_params.texelSideLength/2,
                            cursor_positions[0], pos, 
                            0.05
                        );
                    }
                }
            }
            if (interactor.left_released()) {
                if (!cursor_positions.empty())
                    cursor_positions.pop_back();
            }
            #ifndef __EMSCRIPTEN__
            if (glfwGetKey(main_render.get_window(), 
                GLFW_KEY_A) == GLFW_PRESS)
                s_input_type = NEW_INITIAL_CONDITIONS;
            if (glfwGetKey(main_render.get_window(), 
                GLFW_KEY_S) == GLFW_PRESS)
                s_input_type = MOUSE_ROTATE;
            #endif
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
    if (argc >= 3) {
        window_width = std::atoi(argv[1]);
        window_height = std::atoi(argv[2]);
    }
    // int window_width = 1920, window_height = 1080;
    // int which = 0;
    // auto main_quad = MainGLFWQuad(window_width, window_height);
    // Interactor interactor(main_quad.get_window());
    SimParams sim_params {};
    // auto p = Vec3{.ind={0.0F, 0.0F, 0.0F}};
    // auto s = spinors::get_spinor_plane_wave(
    //     sim_params, p, {0.0, 0.0, 1.0, 0.0}, 0);
    // std:: cout << s[0][0] << std::endl;
    // std:: cout << s[0][1] << std::endl;
    // std:: cout << s[1][0] << std::endl;
    // std:: cout << s[1][1] << std::endl;
    // Matrix::test_det();
    // Matrix::test_solve();
    // Matrix::test_inverse();
    // test_get_expression_stack();
    test_shunting_yard();
    auto main_quad = MainGLFWQuad(window_width, window_height);
    Interactor interactor(main_quad.get_window());
    s_sim_params_set = [&sim_params](int c, Uniform u) {
        sim_params.set(c, u);
    };
    UserEditGLSLProgram glsl_potential_edit {};
    s_sim_params_set_string = [&sim_params, &glsl_potential_edit](
        int c, int index, std::string val) {
        sim_params.set(c, index, val);
        glsl_potential_edit.new_texts({
            sim_params.fourVectorPotential[0],
            sim_params.fourVectorPotential[1],
            sim_params.fourVectorPotential[2],
            sim_params.fourVectorPotential[3]});
    };
    s_user_edit_set_value
        = [&glsl_potential_edit](int c, std::string s, float value) {
        glsl_potential_edit.set_value(s, value);      
    };
    s_user_edit_get_value
        = [&glsl_potential_edit](int c, std::string s) -> float {
        auto uniforms = glsl_potential_edit.get_active_uniforms();
        return uniforms.operator[](s).vec2[0];
    };
    s_user_edit_get_comma_separated_variables 
        = [&glsl_potential_edit](int c) -> std::string {
         std::string r = "";
        int count = 0;
        auto uniforms = glsl_potential_edit.get_active_uniforms();
        int size = uniforms.size();
        for (auto &e: uniforms) {
            count++;
            r += e.first + ((count == size)? "": ",");
        }
        return r;
    };
    s_sim_params_get = [&sim_params](int c) -> Uniform {
        return sim_params.get(c);
    };
    // {
    //     auto e = UserEditGLSLProgram();
    //     e.new_texts({"a*x^2 + y", "k*(x^2 + z^2)", "z^2 + y", "d"});
    //     e.refresh();
        
    // }
    dirac_3d(
        main_quad, window_width, window_height, 
        interactor, sim_params, 
        glsl_potential_edit);
    return 1;
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

void set_mouse_mode(int type) {
    s_input_type = type;
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_BINDINGS(my_module) {
    function("set_float_param", set_float_param);
    function("set_int_param", set_int_param);
    function("set_bool_param", set_bool_param);
    function("set_vec_param", set_vec_param);
    function("set_ivec_param", set_ivec_param);
    function("set_mouse_mode", set_mouse_mode);
    function("set_string_param", set_string_param);
    function("user_edit_get_value", user_edit_get_value);
    function("user_edit_set_value", user_edit_set_value);
    function("user_edit_get_comma_separated_variables",
             user_edit_get_comma_separated_variables);
}
#endif