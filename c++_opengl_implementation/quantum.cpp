#include "gl_wrappers.hpp"
#include <GLFW/glfw3.h>
#include <cmath>
#include "fft.hpp"
#include "fft_gl.hpp"
#include "complex_float_rgba.hpp"

const double PI = 3.141592653589793;
const double HBAR = 1.0;
const double LX = 1.0;
const double LY = 1.0;
const double DT = 0.00003;
const double MASS = 1.0;


struct {
    double x, y;
    double dx, dy;
    bool pressed = false;
    bool released = false;
    int w, h;
    void update(GLFWwindow *window) {
        double x_prev = x;
        double y_prev = y;
        glfwGetFramebufferSize(window, &w, &h);
        glfwGetCursorPos(window, &x, &y);
        x = x/(double)w;
        y = 1.0 - y/(double)h;
        this->dx = x - x_prev;
        this->dy = y - y_prev;
        if (glfwGetMouseButton(window, GLFW_MOUSE_BUTTON_1) == GLFW_PRESS) {
            pressed = true;
        } else {
            if (released) released = false;
            if (pressed) released = true;
            pressed = false;
        }
    }
} left_click;



void make_2d_reverse_bit_sort2_table(ComplexFloatRGBA *arr, int w, int h) {
    for (int i = 0; i < w; i++) {
        for (int j = 0; j < h; j++) {
            arr[j*w + i].r = (float)i/(float)w;
            arr[j*w + i].g = (float)j/(float)h;
            arr[j*w + i].b = 0.0;
            arr[j*w + i].a = 1.0;
        } 
    }
    if (w == h) {
        square_bitreverse2<ComplexFloatRGBA>(arr, w);
    } else {
        // TODO!
        // bitreverse2<ComplexFloatRGBA>(arr, w, h);
    }
}


struct Specs {
    int w, h;
    double lx, ly, dt, m;
};

template <typename T>
void make_exp_kinetic(T *exp_kinetic, const Specs &specs) {
    int w = specs.w;
    int h = specs.h;
    double lx = specs.lx;
    double ly = specs.ly;
    double dt = specs.dt;
    double m = specs.m;
    double *freq_h = new double[w*h];
    double *freq_v = new double[w*h];
    fftfreq2(freq_h, freq_v, w, h);
    for (int i = 0; i < h; i++) {
        for (int j = 0; j < w; j++) {
            double px = 2.0*PI*HBAR*freq_h[i*h + j]/lx;
            double py = 2.0*PI*HBAR*freq_v[i*h + j]/ly;
            double p2 = px*px + py*py;
            double phi = -0.5*dt*p2/(2.0*m*HBAR);
            exp_kinetic[i*h + j].real(cos(phi));
            exp_kinetic[i*h + j].imag(sin(phi));
        }
    }
    delete[] freq_h;
    delete[] freq_v;
}


template <typename T>
void make_exp_sho_potential(T *exp_potential, 
                            T *potential, double s, 
                            const Specs &specs) {
    int w = specs.w;
    int h = specs.h;
    double dt = specs.dt;
    for (int i = 0; i < h; i++) {
        for (int j = 0; j < w; j++) {
            double y = (float)(i - h/2)/(float)h;
            double x = (float)(j - w/2)/(float)w;
            double pot = s*(x*x + y*y);
            potential[i*h + j].real(pot);
            double phi = -0.25*dt*pot/HBAR;
            exp_potential[i*h + j].real(cos(phi));
            exp_potential[i*h + j].imag(sin(phi));
        }
    }
}


template <typename T>
void make_exp_double_slit_potential(T *exp_potential, T *potential,
                                    const Specs &specs) {
    int w = specs.w;
    int h = specs.h;
    double dt = specs.dt;
    for (int j = 0; j < w; j++) {
        for (int i = 0; i < h; i++) {
            if (i > h/2 - 5 && i < h/2 + 4 && 
                (j < 16*w/40 || j > 17*w/40) &&
                (j < 23*w/40 || j > 24*w/40)) {
                double pot = 40000; //*exp(-0.5*(i - h/2)*(i - h/2)/
                                    //    (0.01*0.01*h*h));
                double phi = -0.25*dt*pot/HBAR;
                potential[i*h + j].real(pot);
                exp_potential[i*h + j].real(cos(phi));
                exp_potential[i*h + j].imag(sin(phi));
            } else {
                exp_potential[i*h + j].real(1.0);
                exp_potential[i*h + j].imag(0.0);
            }
        }
    }
}


int main(void) {

    const int w = 256, h = 256;
    int aspect = 2;
    GLFWwindow *window = init_window(aspect*w, aspect*h);
    glViewport(0, 0, w, h);
    init_glew();

    GLuint vertex_shader = get_shader("./shaders/quad.vert", 
                                      GL_VERTEX_SHADER);
    GLuint frag_shader = get_shader("./shaders/quad.frag", 
                                    GL_FRAGMENT_SHADER);
    GLuint view_shader = get_shader("./shaders/view.frag",
                                    GL_FRAGMENT_SHADER);
    GLuint fft_iter_shader = get_shader("./shaders/fft-iter.frag", 
                                        GL_FRAGMENT_SHADER);
    GLuint fftshift_shader = get_shader("./shaders/fftshift.frag",
                                        GL_FRAGMENT_SHADER);
    GLuint rearrange_shader = get_shader("./shaders/rearrange.frag",
                                         GL_FRAGMENT_SHADER);
    GLuint multiply_shader = get_shader("./shaders/multiply.frag", 
                                        GL_FRAGMENT_SHADER);
    GLuint wavepacket_shader = get_shader("./shaders/wavepacket.frag",
                                          GL_FRAGMENT_SHADER);

    GLuint view_program = make_program(vertex_shader, view_shader);
    GLuint copy_program = make_program(vertex_shader, frag_shader);
    GLuint fft_iter_program = make_program(vertex_shader, fft_iter_shader);
    GLuint fftshift_program = make_program(vertex_shader, fftshift_shader);
    GLuint rearrange_program = make_program(vertex_shader, rearrange_shader);
    GLuint init_wave_program = make_program(vertex_shader, wavepacket_shader);

    GLuint multiply_program = make_program(vertex_shader, multiply_shader);
    auto mult = [&](Quad *q, Quad *s, Quad *t) {
        q->set_program(multiply_program);
        q->bind();
        q->set_int_uniforms({
            {"tex1", s->get_value()}, {"tex2", t->get_value()}
        });
        q->draw();
        unbind();
    };

    Quad q0 = Quad::make_frame(aspect*w, aspect*h);

    Quad q1 = Quad::make_float_frame(w, h);
    Quad q2 = Quad::make_float_frame(w, h);


    Quad rev_bitsort2_tex = Quad::make_float_frame(w, h);
    ComplexFloatRGBA rev_bit_sort2_table[w*h];
    make_2d_reverse_bit_sort2_table(rev_bit_sort2_table, w, h);
    rev_bitsort2_tex.substitute_array(w, h, GL_FLOAT,
                                      rev_bit_sort2_table);
    unbind();
    auto rev_bit_sort = [&](Quad *dest, Quad *src) {
        dest->set_program(rearrange_program);
        dest->bind();
        dest->set_float_uniforms({{"width", w}, {"height", h}});
        dest->set_int_uniforms({
            {"tex", src->get_value()},
            {"lookupTex", rev_bitsort2_tex.get_value()},
        });
        dest->draw();
        unbind();
    };

    Specs specs{.w = w, .h = h, 
                .lx = LX, .ly = LY, 
                .dt = DT, .m = MASS};

    Quad exp_kinetic_tex = Quad::make_float_frame(w, h);
    ComplexFloatRGBA *exp_kinetic = (ComplexFloatRGBA *)
                                     calloc(w*h, sizeof(ComplexFloatRGBA));
    make_exp_kinetic<ComplexFloatRGBA>(exp_kinetic, specs);
    exp_kinetic_tex.substitute_array(w, h, GL_FLOAT, exp_kinetic);
    unbind();

    Quad potential_tex = Quad::make_float_frame(w, h);
    Quad exp_potential_tex = Quad::make_float_frame(w, h);
    ComplexFloatRGBA *exp_potential = (ComplexFloatRGBA *)
                                       calloc(w*h, sizeof(ComplexFloatRGBA));
    ComplexFloatRGBA *potential = (ComplexFloatRGBA *)
                                   calloc(w*h, sizeof(ComplexFloatRGBA));
    // make_exp_sho_potential<ComplexFloatRGBA>(exp_potential, potential,
    //                                          62500.0, specs);
    make_exp_double_slit_potential<ComplexFloatRGBA>(exp_potential, potential,
                                                     specs);
    potential_tex.substitute_array(w, h, GL_FLOAT, potential);
    exp_potential_tex.substitute_array(w, h, GL_FLOAT, exp_potential);
    unbind();

    Quad init_wavefunc_tex = Quad::make_float_frame(w, h);
    auto init_wavefunc = [&](Quad *q, double bx, double by, 
                              double px, double py,
                              double sx, double sy) {
        double dx = specs.w/specs.lx;
        double dy = specs.h/specs.ly;
        double amp = 5.0;
        init_wavefunc_tex.set_program(init_wave_program);
        init_wavefunc_tex.bind();
        init_wavefunc_tex.set_float_uniforms({
            {"dx", dx}, {"dy", dy}, 
            {"bx", bx}, {"by", by}, 
            {"px", px}, {"py", py},
            {"sx", sx}, {"sy", sy},
            {"amp", amp}    
        });
        init_wavefunc_tex.draw();
        unbind();
        q->set_program(copy_program);
        q->bind();
        q->set_int_uniform("tex", init_wavefunc_tex.get_value());
        q->draw();
        unbind();
    };

    auto step_gl = [&](Quad *q1, Quad *q2) -> Quad * {
        mult(q2, &exp_potential_tex, q1);
        rev_bit_sort(q1, q2);
        Quad *quads[2];
        quads[0] = q1;
        quads[1] = q2;
        horizontal_fft(fft_iter_program, quads, w);
        Quad *qa = vertical_fft(fft_iter_program, quads, h);
        Quad *qb = (qa == q1)? q2: q1;
        mult(qb, &exp_kinetic_tex, qa);
        rev_bit_sort(qa, qb);
        quads[0] = qa;
        quads[1] = qb;
        horizontal_ifft(fft_iter_program, quads, w);
        qa = vertical_ifft(fft_iter_program, quads, h);
        qb = (qa == q1)? q2: q1;
        mult(qb, &exp_potential_tex, qa);
        return qb;
    };

    Quad *q_a = &q1;
    Quad *q_b = &q2;
    init_wavefunc(q_a, 0.5, 0.25, 0.0, 25.0, 0.05, 0.05);
    init_wavefunc(q_b, 0.5, 0.25, 0.0, 25.0, 0.05, 0.05);
    // init_wavefunc(q_a, 0.5, 0.5, 0.0, 15.0, 0.05, 0.05);
    // init_wavefunc(q_b, 0.5, 0.5, 0.0, 15.0, 0.05, 0.05);
    for (int i = 0; !glfwWindowShouldClose(window); i++) {
        if (left_click.released) {
            double bx = left_click.x;
            double by = left_click.y;
            double px = 700.0*left_click.dx;
            double py = 700.0*left_click.dy;
            double sx = 0.05, sy = 0.05;
            init_wavefunc(q_a, bx, by, px, py, sx, sy);
        }
        Quad *q = step_gl(q_a, q_b);
        if (q == q_b) {
            Quad *tmp = q_b;
            q_b = q_a;
            q_a = tmp;
        }
        glViewport(0, 0, aspect*w, aspect*h);
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
        q0.set_program(view_program);
        q0.bind();
        q0.set_int_uniforms({{"wavefunc_tex", q_a->get_value()},
                             {"pot_tex", potential_tex.get_value()}});
        q0.draw();
        unbind();
        glfwPollEvents();
        left_click.update(window);
        glfwSwapBuffers(window);
        glViewport(0, 0, w, h);
    }
    free(exp_kinetic);
    free(exp_potential);
    glfwDestroyWindow(window);
    glfwTerminate();
    return 0;

}