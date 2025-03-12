#include <string>
#include <map>
#include <set>
#include <complex>
#include "gl_wrappers.hpp"


std::set<std::string>
initialize_glsl_program_from_strings(
    int &dst_program, std::vector<std::string> texts);