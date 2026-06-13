#include "gl_wrappers.hpp"
#include "glfw_window.hpp"

#ifndef _INTERACTOR_
#define _INTERACTOR_

class Interactor {
    public:
    Interactor(GLFWwindow *window);
    void attach_scroll_callback(GLFWwindow *window);
    void click_update(GLFWwindow *window);
    Vec2 get_mouse_position();
    Vec2 get_mouse_delta();
    double get_mouse_abs_delta();
    Vec2 get_double_touch_position(int i);
    Vec2 get_double_touch_delta(int i);
    bool left_pressed();
    bool left_released();
    void release_left();
    bool middle_pressed();
    bool middle_released();
    bool right_pressed();
    bool right_released();
    bool double_touch_active();
    bool double_touch_released();
    static double get_scroll();
    static void multiply_scroll_value(double value);
    private:
    struct {
        double x, y;
        double dx, dy;
        int pressed = 0;
        int released = 0;
    } left_click, middle_click, right_click;
    struct {
        Vec2 positions[2];
        Vec2 deltas[2];
        int active = 0;
        int released = 0;
    } double_touch;
    static double scroll;
    static void scroll_callback(GLFWwindow *window, double x, double y);
};

#endif