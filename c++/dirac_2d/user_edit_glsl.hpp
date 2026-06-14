#include <string>
#include <map>
#include <set>
#include <complex>
#include "gl_wrappers.hpp"


std::set<std::string>
initialize_glsl_program_from_strings(
    int &dst_program, std::vector<std::string> texts);


struct UserDefinedProgram {
    bool is_time_dependent;
    int program;
    std::map<std::string, float> uniforms;
};

struct UserProgramsManager {
    std::map<std::string, float> all_seen_variables;
    UserDefinedProgram program;
    std::vector<int> programs_queue;
    void add_new_program(int program, std::set<std::string> variables_set);
    void add_seen_variable(std::string variable, float value);
    void queue_current();
    bool program_queued();
    bool is_time_dependent();
    UserDefinedProgram expend_program();
};
