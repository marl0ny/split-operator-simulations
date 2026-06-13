#include <string>
#include <map>
#include <set>
#include "gl_wrappers.hpp"


std::set<std::string>
initialize_glsl_program_from_strings(
    int &dst_program, std::vector<std::string> texts);

std::set<std::string>
initialize_glsl_program_from_strings(
    int &dst_program, std::vector<std::string> &latex_output,
    std::vector<std::string> texts);


struct UserDefinedProgram {
    bool is_time_dependent;
    int program;
    std::map<std::string, float> uniforms;
};

/* This struct helps keep track of any user-defined parameters
as generated from text that was inputed by the user
in text entry boxes. This is not responsible for
how these variables are actually used in the actual simulation or similar
code, or for the creation or deletion of sliders whenever text
entry is modified.

How to use:
 - Whenever text entry is modified, first call the external function
   initialize_glsl_program_from_strings to initialize the GLSL program
   reference, and to get set of strings of the uniforms that were parsed
   from the inputed text. Next call the add_new_program method.
   This generates a completely new GLSL program based on the entered
   text.Lastly call the separate display_parameters_as_sliders 
   using the output of initialize_glsl_rogram_from_strings
   to update the sliders that correspond to any new parameters.
 - If a user slider is modified, call add_seen_variable,
   and then call queue_current. This notifies that the variables are
   modified and that the currently bound program needs to be used
   again to update to these most recent of changes.
 - Within the main loop itself, call the function expend_program, which
   returns an instance of UserDefinedProgram that was queued 
   from the queue_current method. From here the program and other
   data from the UserDefinedProgram instance can be used to update
   the simulation itself.
*/
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
