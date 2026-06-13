#include "interactor.hpp"
#include <cmath>

double Interactor::scroll = 50.0;

Interactor::Interactor(GLFWwindow *window) {
    Interactor::attach_scroll_callback(window);
}

float s_coordinates[2] = {0.0, 0.0};
int s_type = 0;
float s_double_touch_coordinates[4] = {0.0, 0.0, 0.0, 0.0};
int s_double_touch_type = 0;

#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>

using namespace emscripten;

static const int LEFT_PRESSED = 1;

void set_left_xy_type(float x, float y, int type) {
    s_coordinates[0] = x;
    s_coordinates[1] = y;
    s_type = type;
}

void set_left_xy(float x, float y) {
    s_coordinates[0] = x;
    s_coordinates[1] = y;
}

void set_double_touch_position_type(
    float x1, float y1, float x2, float y2, int type) {
    s_double_touch_coordinates[0] = x1;
    s_double_touch_coordinates[1] = y1;
    s_double_touch_coordinates[2] = x2;
    s_double_touch_coordinates[3] = y2;
    s_double_touch_type = type;
    return;
}

void set_double_touch_position(
    float x1, float y1, float x2, float y2) {
    s_double_touch_coordinates[0] = x1;
    s_double_touch_coordinates[1] = y1;
    s_double_touch_coordinates[2] = x2;
    s_double_touch_coordinates[3] = y2;
    return;
}

void multiply_scroll_value(float value) {
    Interactor::multiply_scroll_value(value);
}

EMSCRIPTEN_BINDINGS(my_module) {
    function("set_left_xy_type", &set_left_xy_type);
    function("set_left_xy", &set_left_xy);
    function("set_double_touch_position_type",
             &set_double_touch_position_type);
    function("set_double_touch_position",
             &set_double_touch_position);
    function("multiply_scroll_value", &multiply_scroll_value);
}
#endif

void Interactor::click_update(GLFWwindow *window) {
    double prev_x = this->left_click.x;
    double prev_y = this->left_click.y;
    Vec2 prev_double_touch0 = this->double_touch.positions[0];
    Vec2 prev_double_touch1 = this->double_touch.positions[1];
    int width, height;
    glfwGetFramebufferSize(window, &width, &height);

    #ifdef __EMSCRIPTEN__
    this->left_click.x = s_coordinates[0];
    this->left_click.y = s_coordinates[1];
    this->double_touch.positions[0].x = s_double_touch_coordinates[0];
    this->double_touch.positions[0].y = s_double_touch_coordinates[1];
    this->double_touch.positions[1].x = s_double_touch_coordinates[2];
    this->double_touch.positions[1].y = s_double_touch_coordinates[3];
    #else
    glfwGetCursorPos(window, &this->left_click.x, &this->left_click.y);
    #ifdef __APPLE__
    this->left_click.x = 2.0*this->left_click.x/(double)width;
    this->left_click.y = 1.0 - 2.0*this->left_click.y/(double)height;
    #else
    this->left_click.x = this->left_click.x/(double)width;
    this->left_click.y = 1.0 - this->left_click.y/(double)height;
    #endif // __APPLE__
    #endif // __EMSCRIPTEN__

    this->left_click.dx = this->left_click.x - prev_x;
    this->left_click.dy = this->left_click.y - prev_y;
    this->double_touch.deltas[0]
        = this->double_touch.positions[0] - prev_double_touch0;
    this->double_touch.deltas[1]
        = this->double_touch.positions[1] - prev_double_touch1;

    #ifdef __EMSCRIPTEN__
    if (s_type == LEFT_PRESSED) {
        this->left_click.pressed = 1;
    } else {
        if (this->left_click.released) this->left_click.released = 0;
        if (this->left_click.pressed) this->left_click.released = 1;
        this->left_click.pressed = 0;
    }
    if (s_double_touch_type == 1) {
        this->double_touch.active = 1;
    }  else if (s_double_touch_type == 0) {
        if (this->double_touch.released)
            this->double_touch.released = 0;
        if (this->double_touch.active)
            this->double_touch.released = 1;
        this->double_touch.active = 0;
    }
    #else
    if (glfwGetMouseButton(window, GLFW_MOUSE_BUTTON_1) == GLFW_PRESS) {
        this->left_click.pressed = 1;
    } else {
        if (this->left_click.released) this->left_click.released = 0;
        if (this->left_click.pressed) this->left_click.released = 1;
        this->left_click.pressed = 0;
    }
    #endif
}


void Interactor::scroll_callback(GLFWwindow *window, double x, double y) {
    // std::cout << "Value of y: " << y << std::endl;
    Interactor::scroll += y;
    if (Interactor::scroll < 0)
        Interactor::scroll = 0.0;
}

void Interactor::attach_scroll_callback(GLFWwindow *window) {
    glfwSetScrollCallback(window, Interactor::scroll_callback);
}


Vec2 Interactor::get_mouse_position() {
    return {.x=(float)this->left_click.x, .y=(float)this->left_click.y};
}

Vec2 Interactor::get_double_touch_position(int i) {
    if (i == 0 || i == 1)
        return this->double_touch.positions[i];
    return Vec2{.ind{0.0, 0.0}};
}

Vec2 Interactor::get_double_touch_delta(int i) {
    if (i == 0 || i == 1)
        return this->double_touch.deltas[i];
    return Vec2{.ind{0.0, 0.0}};
}

Vec2 Interactor::get_mouse_delta() {
    return {.x=(float)this->left_click.dx, .y=(float)this->left_click.dy};
}

double Interactor::get_mouse_abs_delta() {
    return sqrt(this->left_click.dx*this->left_click.dx 
                + this->left_click.dy*this->left_click.dy);
}


double Interactor::get_scroll() {
    return Interactor::scroll;
}

void Interactor::multiply_scroll_value(double value) {
    Interactor::scroll *= value;
}

bool Interactor::left_pressed() {
    return left_click.pressed;
}

void Interactor::release_left() {
    left_click.released = true;
}

bool Interactor::left_released() {
    return left_click.released;
}

bool Interactor::middle_pressed() {
    return middle_click.pressed;
}

bool Interactor::right_pressed() {
    return right_click.pressed;
}

bool Interactor::double_touch_active() {
    return bool(double_touch.active);
}

bool Interactor::double_touch_released() {
    return bool(double_touch.released);
}