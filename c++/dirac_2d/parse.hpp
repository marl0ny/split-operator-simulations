#include <string>
#include <vector>
#include <set>

#ifndef _PARSE_
#define _PARSE_

std::vector<std::string> get_expression_stack(const std::string &input);

std::vector<std::string> shunting_yard(std::vector<std::string> expr_stack);

std::string
turn_rpn_expression_to_glsl_expression_string(
    std::vector<std::string> rpn_list);

std::string 
turn_rpn_expression_to_latex_string(
    std::vector<std::string> rpn_list);

void test_get_expression_stack();

void test_shunting_yard();

std::set<std::string> get_variables_from_rpn_list(
    std::vector<std::string> rpn_list
);

#endif