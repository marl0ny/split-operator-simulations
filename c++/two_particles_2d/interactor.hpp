#include "gl_wrappers.hpp"
#include "glfw_window.hpp"

#ifndef _INTERACTOR_
#define _INTERACTOR_

class Interactor {
    struct {
        double x, y;
        double dx, dy;
        int pressed = 0;
        int released = 0;
    } left_click, middle_click, right_click;
    struct {
        double x, y;
        double dx, dy;
        double scroll;
        int which;
    } user;
    static double scroll;
    static void scroll_callback(GLFWwindow *window, double x, double y);
    public:
    Interactor(GLFWwindow *window);
    void attach_scroll_callback(GLFWwindow *window);
    void click_update(GLFWwindow *window);
    Vec2 get_mouse_position();
    Vec2 get_mouse_delta();
    bool left_pressed();
    bool middle_pressed();
    bool right_pressed();
    void release_left();
    bool left_released();
    bool middle_released();
    bool right_released();
    double get_mouse_abs_delta();
    static double get_scroll();
};

#endif