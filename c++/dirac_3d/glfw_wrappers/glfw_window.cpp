#include "glfw_window.hpp"
#include <cstdio>
#include <cstdlib>

static GLFWwindow *init_window(int width, int height) {
    if (glfwInit() != GL_TRUE) {
        #ifndef __EMSCRIPTEN__
	fprintf(stderr, "GLFW error %d\n", glfwGetError(NULL));
        fprintf(stderr, "Unable to create glfw window.\n");
        exit(1);
        #endif 
    }
    #ifdef __EMSCRIPTEN__
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 0);
    // glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
    // glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
    #else
    #ifdef OLD_OPENGL_VERSION
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 2);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 1);
    #else
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
    #endif
    glfwWindowHint(GLFW_RESIZABLE, GL_TRUE);
    #endif
    #ifndef __APPLE__
    GLFWwindow *window = glfwCreateWindow(width, height, "Window",
                                          NULL, NULL);
    #else
    // TODO: This assumes that all Apple devices use Retina display,
    // and that all Retina displays have the same pixel densities.
    // Find a better way to implement this.
    GLFWwindow *window = glfwCreateWindow(width/2, height/2, "Window",
                                          NULL, NULL);
    #endif
    if (!window) {
        #ifndef __EMSCRIPTEN__
	fprintf(stderr, "%x\n", glfwGetError(NULL));
        fprintf(stderr, "Unable to create glfw window.\n");
        exit(1);
        #endif
    }
    glfwMakeContextCurrent(window);
    return window;
}

GLFWwindow *MainGLFWQuad::window = NULL;

size_t MainGLFWQuad::count = 0;

MainGLFWQuad::MainGLFWQuad(int width, int height): MainQuad(width, height) {
    count++;
    if (window == NULL)
        window = init_window(width, height);
}

GLFWwindow *MainGLFWQuad::get_window() {
    return window;
}