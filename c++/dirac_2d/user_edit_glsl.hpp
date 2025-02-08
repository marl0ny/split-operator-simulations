#include <string>
#include <map>
#include <set>
#include <complex>
#include "gl_wrappers.hpp"


class UserEditGLSLProgram {
    uint32_t program;
    bool text_changed;
    bool variables_changed;
    bool uniform_values_changed;
    bool is_time_dependant;
    std::map<std::string, std::complex<double>> uniforms;
    std::set<std::string> variables;
    std::vector<std::string> texts;
    void remove_reserved_variables(std::set<std::string> &variables);
    bool generate_new_program();
    public:
    UserEditGLSLProgram();
    bool refresh();
    std::set<std::string> get_active_variables() const;
    Uniforms get_all_uniforms() const;
    Uniforms get_active_uniforms() const;
    uint32_t get_program() const;
    void new_text(std::string text);
    void new_texts(std::vector<std::string> texts);
    void set_value(std::string var_name, float value);
    // void make_new_slider(std::string var_name);

};