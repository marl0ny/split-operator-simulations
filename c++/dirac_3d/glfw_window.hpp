#include <GLFW/glfw3.h>
#include "gl_wrappers.hpp"

#ifndef _GLFW_WINDOW
#define _GLFW_WINDOW


class MainGLFWQuad: MainQuad {
    static GLFWwindow *window;
    static size_t count;
    public:
    void draw(const Quad &q) { MainQuad::draw(q); };
    void draw(const RenderTarget &t) { MainQuad::draw(t); };
    void draw(const MultidimensionalDataQuad &m) { MainQuad::draw(m); };
    MainGLFWQuad(int width, int height);
    GLFWwindow *get_window();
    ~MainGLFWQuad() {
        count--;
        if (count == 0) {
            glfwDestroyWindow(window);
            glfwTerminate();
        }
    }
};


#endif