#include <string>
#include <vector>
#include <iostream>
#include <map>
#include <cmath>
#include <set>

using std::string;
using std::vector;
using std::map;
using std::set;

static const string LETTERS 
    = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM";
static const string OPS = "^/*+-";
static const string NUMERICAL_CHARS = "0123456789e-+.";
static vector<string> FUNCTIONS_LIST = {
    "abs", "exp", "sin", 
    "cos", "tan", "sinh", "cosh",
    "tanh", "log", "sqrt", "step"
};

static double call_function(string name, double value) {
    if (name == "abs") {
        return abs(value);
    } else if (name == "exp") {
        return exp(value);
    } else if (name == "sin") {
        return sin(value);
    } else if (name == "cos") {
        return cos(value);
    } else if (name == "tan") {
        return tan(value);
    } else if (name == "sinh") {
        return sinh(value);
    } else if (name == "cosh") {
        return cosh(value);
    } else if (name == "tanh") {
        return tanh(value);
    } else if (name == "log") {
        return log(value);
    } else if (name == "sqrt") {
        return sqrt(value);
    } else if (name == "step") {
        return (value >= 0.0)? 1.0: 0.0;
    }
    return NAN;
}


// static const std::map<std::string, size_t> PRECEDENCE_RANK {
//     {""}
//     {"^", 2},
//     {"/", 1}, {"*", 1},
//     {"+", 0}, {"-", 0}
// };

static bool in_functions_list(const string &f) {
    for (auto &f2: FUNCTIONS_LIST) {
        if (f == f2)
            return true;
    }
    return false;
}

static int precedence_of(const string &c) {
    if (in_functions_list(c))
        return 3;
    else if (c == "^")
        return 2;
    else if (c == "/" || c == "*")
        return 1;
    else if (c == "+" || c == "-")
        return 0;
    else
        return -1;
}

static bool is_single_character_number(char c) {
    for (auto &c2: "12345670") {
        if (c == c2)
            return true;
    }
    return false;
}

static bool is_single_character_op(char c) {
    for (auto &c2: OPS) {
        if (c == c2)
            return true;
    }
    return false;
}

static bool is_a_letter(char c) {
    for (auto &c2: LETTERS) {
        if (c == c2)
            return true;
    }
    return false;
}

static bool is_parenthesis(char c) {
    return c == '(' || c == ')';
}

static bool is_left_parenthesis(char c) {
    return c == '(';
}

static bool is_right_parenthesis(char c) {
    return c == ')';
}

static bool is_decimal_point(char c) {
    return c == '.';
}

struct Parsed {
    string value;
    int end_index;
    bool success;
};

static Parsed parse_variable(const string &input, size_t offset) {
    std::string variable {};
    int j = offset;
    for (; (is_single_character_number(input[j]) 
            || is_a_letter(input[j])) && j < input.length(); j++)
        variable += input[j];
    return {.value=variable, .end_index=j, .success=true};
}

static Parsed parse_integer(const string &input, size_t offset) {
    std::string integer {};
    int j = offset;
    for (; is_single_character_number(input[j]) && j < input.length(); j++) {
        integer += input[j];
    }
    return {.value=integer, .end_index=j, .success=true};
}

static Parsed parse_after_exponent(const string &input,
                                   const string &value_before_exp,
                                   size_t index_after_exp) {
    string value = value_before_exp + 'e';
    int j = index_after_exp;
    if (j == input.length())
        return {.success=false};
    if (is_single_character_number(input[j])) {
        Parsed parsed_int = parse_integer(input, j);
        return {
            .value = value + parsed_int.value,
            .end_index = parsed_int.end_index,
            .success=true
        };
    } else if (input[j] == '+' || input[j] == '-') {
        value += input[j++];
        if (j == input.length())
            return {.success=false};
    }
    if (is_single_character_number(input[j])) {
        Parsed parsed_int = parse_integer(input, j);
        if (parsed_int.end_index != input.length() && 
            input[parsed_int.end_index] == '.')
            return {.success=false};
        return {
            .value = value + parsed_int.value, 
            .end_index=parsed_int.end_index,
            .success=true,
        };
    }
    return {.success=false};
}

static Parsed parse_after_decimal(
    const string &input, const string &value_before_decimal,
    size_t index_after_decimal) {
    int j = index_after_decimal;
    string value = value_before_decimal + '.';
    if (is_single_character_number(input[j])) {
        Parsed parsed_int = parse_integer(input, j);
        j = parsed_int.end_index;
        value += parsed_int.value;
    }
    // If it's the end of the input string, early return.
    if (j == input.length())
        return {.value=value, .end_index=j, .success=true};
    if (is_single_character_op(input[j]) || is_right_parenthesis(input[j])
        || input[j] == ' ') {
        return {.value=value, .end_index=j, .success=true};
    } else if (input[j] == 'e') {
        return parse_after_exponent(input, value, j+1);
    }
    return {.success=false};
}

static Parsed parse_number(const string &input, size_t offset) {
    // Parse an integer
    Parsed parsed_integer = parse_integer(input, offset);
    string value = parsed_integer.value;
    int j = parsed_integer.end_index;
    // If it's the end of the input string, early return.
    if (j == input.length())
        return {.value=value, .end_index=j, .success=true};
    // If a space, ')', or operator directly follows the string of numbers,
    // then it is an integer value as well, so return it. Else if there is
    // a '.' or an 'e' directly after the string of numbers, then we're dealing
    // with a floating point value.
    if (is_single_character_op(input[j]) || is_right_parenthesis(input[j])
        || input[j] == ' ')
        return {.value=value, .end_index=j, .success=true};
    else if (is_decimal_point(input[j]))
        return parse_after_decimal(input, value, j+1);
    else if (input[j] == 'e')
        return parse_after_exponent(input, value, j+1);
    // Any other character returns a failure.
    return {.success=false};
}

static string handle_unary_operators(string expr) {
    if (expr[0] == '-' || expr[0] == '+')
        expr = '0' + expr;
    for (int i = 0; i < expr.length() - 1; i++) {
        if (is_left_parenthesis(expr[i]) 
            && (expr[i+1] == '-' || expr[i+1] == '+')) {
            string new_expr {};
            for (int j = 0; j <= i; j++)
                new_expr += expr[j];
            new_expr += '0';
            for (int j = i+1; j < expr.length(); j++)
                new_expr += expr[j];
            expr = new_expr;
        }
    }
    return expr;
}

static bool check_if_parenthesis_are_balanced(const string &input) {
    vector<char> left_parenthesis_stack {};
    for (int i = 0; i < input.length(); i++) {
        if (is_left_parenthesis(input[i])) {
            left_parenthesis_stack.push_back(input[i]);
        } else if (is_right_parenthesis(input[i])) {
            if (left_parenthesis_stack.empty())
                return false;
            left_parenthesis_stack.pop_back();
        }
    }
    return left_parenthesis_stack.empty();
}

vector<string> get_expression_stack(const string &raw_input) {
    // std::string input = "";
    // for (auto &c: input_)
    //     if (c != ' ')
    //         input += c;
    if (!check_if_parenthesis_are_balanced(raw_input)) {
        std::cerr << "Unbalanced parentheses.\n";
        return {};
    }
    std::string input = handle_unary_operators(raw_input);
    vector<string> reversed_expr {};
    int i = 0;
    while(i < input.length()) {
        char c = input[i];
        if (is_single_character_number(c)) {
            Parsed parsed_number = parse_number(input, i);
            if (!parsed_number.success) {
                std::cerr << "Invalid numerical value.\n";
                return {};
            }
            i = parsed_number.end_index;
            reversed_expr.push_back(parsed_number.value);
        } else if (is_a_letter(c)) {
            Parsed parsed_variable = parse_variable(input, i);
            i = parsed_variable.end_index;
            reversed_expr.push_back(parsed_variable.value);
        } else if (is_single_character_op(c) || is_parenthesis(c)) {
            reversed_expr.push_back(string {c});
            i++;
        } else if (c == ' ') {
            i++;
        } else {
            std::cerr << "Invalid expression: " << input << ".\n";
            return {};
        }
    }
    vector<string> expr {};
    for (int i = reversed_expr.size() - 1; i >= 0; i--)
        expr.push_back(reversed_expr[i]);
    return expr;
}

static void print(vector<string> v) {
    std::cout << "{";
    for (int i = 0; i < v.size(); i++) {
        string e = v[i];
        std::cout << "\"" << e  << "\"";
        if (i != v.size() - 1)
            std::cout << ", ";
    }
    std::cout << "}";
    std::cout << std::endl;
}

void test_get_expression_stack() {
    string s = "12.0 + 11 - cos(x*12e10) + sin(k*(k2*x - 12.0))";
    // std::cout << parse_number("324e-123 + 45343", 0).value << std::endl;
    vector<string> expr = get_expression_stack(s);
    print(expr);
}

static void handle_operators(const string &op_new, 
    vector<string> &operator_stack, vector<string> &rpn_list) {
    if (operator_stack.size() > 0) {
        while (operator_stack.size() > 0) {
            string op_prev = operator_stack.back();
            if (is_left_parenthesis(op_prev[0]) ||
                precedence_of(op_new) > precedence_of(op_prev)) {
                operator_stack.push_back(op_new);
                break;
            } else {
                rpn_list.push_back(op_prev);
                operator_stack.pop_back();
                if (operator_stack.size() == 0) {
                    operator_stack.push_back(op_new);
                    break;
                }
            }
        }
    } else { // Operator stack is empty.
        operator_stack.push_back(op_new);
    }
}

vector<string> shunting_yard(vector<string> expr_stack) {
    vector<string> rpn_list {};
    vector<string> operator_stack {};
    while (expr_stack.size() > 0) {
        string e = expr_stack.back();
        expr_stack.pop_back();
        if (is_single_character_number(e[0]) || is_decimal_point(e[0])) {
            rpn_list.push_back(e);
        } else if (is_left_parenthesis(e[0])) {
            operator_stack.push_back(e);
        } else if (is_right_parenthesis(e[0])) {
            e = operator_stack.back();
            operator_stack.pop_back();
            while (!is_left_parenthesis(e[0])) {
                rpn_list.push_back(e);
                e = operator_stack.back();
                operator_stack.pop_back();
            }
        } else if (is_single_character_op(e[0])) {
            handle_operators(e, operator_stack, rpn_list);
        } else if (is_a_letter(e[0])) {
            if (in_functions_list(e))
                handle_operators(e, operator_stack, rpn_list);
            else
                rpn_list.push_back(e);
        }
    }
    while (operator_stack.size()) {
        rpn_list.push_back(operator_stack.back());
        operator_stack.pop_back();
    }
    return rpn_list;
}

template <typename T>
static T deque(vector<T> &v) {
    T val = v.front();
    for (int i = 1; i < v.size(); i++) {
        v[i - 1] = v[i];
    }
    v.pop_back();
    return val;
}

double compute_rpn_expression(
    vector<string> rpn_list, map<string, double> variables) {
    vector<string> rpn_stack {};
    while (rpn_list.size() > 0) {
        string e = deque(rpn_list);
        if (is_single_character_number(e[0]) || is_decimal_point(e[0])) {
            rpn_stack.push_back(e);
        } else if (is_single_character_op(e[0])) {
            double r_val = std::stod(rpn_stack.back().c_str());
            rpn_stack.pop_back();
            double l_val = std::stod(rpn_stack.back().c_str());
            rpn_stack.pop_back();
            double val = 0.0;
            switch(e[0]) {
                case '+':
                val = l_val + r_val;
                break;
                case '-':
                val = l_val - r_val;
                break;
                case '*':
                val = l_val * r_val;
                break;
                case '/':
                val = l_val / r_val;
                case '^':
                val = pow(l_val, r_val);
                break;
                default:
                break;
            }
            rpn_stack.push_back(std::to_string(val));
        } else if (is_a_letter(e[0])) {
            if (in_functions_list(e)) {
                double in_val = std::stod(rpn_stack.back().c_str());
                rpn_stack.pop_back();
                double out_val = call_function(e, in_val);
                rpn_stack.push_back(std::to_string(out_val));
            } else {
                double val = variables[e];
                rpn_stack.push_back(std::to_string(val));
            }
        }
    }
    return std::atof(rpn_stack.back().c_str());
}

string turn_rpn_expression_to_glsl_expression_string(
    vector<string> rpn_list) {
    if (rpn_list.size() == 0)
        return "";
    vector<string> rpn_stack {};
    while (rpn_list.size() > 0) {
        string e = deque(rpn_list);
        if (is_single_character_number(e[0]) || is_decimal_point(e[0])) {
            Parsed p = parse_integer(e, 0);
            if (p.end_index == e.length())
                rpn_stack.push_back("r2C(" + e + ".0)");
            else
                rpn_stack.push_back("r2C(" + e + ")");
        } else if (is_single_character_op(e[0])) {
            string r_val = rpn_stack.back();
            rpn_stack.pop_back();
            if (rpn_stack.empty()) {
                fprintf(stderr, "Invalid expression.");
                return "";
            }
            string l_val = rpn_stack.back();
            rpn_stack.pop_back();
            string val {};
            switch(e[0]) {
                case '+':
                val += "add(" + l_val + ", " + r_val + ")";
                break;
                case '-':
                val = "sub(" + l_val + ", " + r_val + ")";
                break;
                case '*':
                val = "mul(" + l_val + ", " + r_val + ")";
                break;
                case '/':
                val = "div(" + l_val + ", " + r_val + ")";
                break;
                case '^':
                val = "powC(" + l_val + ", " + r_val + ")";
                break;
                default:
                break;
            }
            rpn_stack.push_back(val);
        } else if (is_a_letter(e[0])) {
            if (in_functions_list(e)) {
                string in_val = rpn_stack.back();
                rpn_stack.pop_back();
                string out_val = e + "C(" + in_val + ")";
                rpn_stack.push_back(out_val);
            } else {
                rpn_stack.push_back(e);
            }
        }
    }
    return rpn_stack.back();
}

string turn_rpn_expression_to_latex_string(
    vector<string> rpn_list) {
    vector<string> rpn_stack {};
    while (rpn_list.size() > 0) {
        string e = deque(rpn_list);
        if (is_single_character_number(e[0]) || is_decimal_point(e[0])) {
            rpn_stack.push_back("${" + e + "}");
        } else if (is_single_character_op(e[0])) {
            string r_val = rpn_stack.back();
            rpn_stack.pop_back();
            string l_val = rpn_stack.back();
            rpn_stack.pop_back();
            string val {};
            switch(e[0]) {
                case '+':
                val += "${" + l_val + "}+${" + r_val + "}";
                break;
                case '-':
                val = "${" + l_val + "}-${" + r_val + "}";
                break;
                case '*':
                val = "${" + l_val + "}${" + r_val + "}";
                break;
                case '/':
                val = "\\frac{${" + l_val + "}}{${" + r_val + "}}";
                case '^':
                val = "\\{${" + l_val + "}}^{${" + r_val + "}}";
                break;
                default:
                break;
            }
            rpn_stack.push_back(val);
        } else if (is_a_letter(e[0])) {
            if (in_functions_list(e)) {
                string in_val = rpn_stack.back();
                rpn_stack.pop_back();
                string out_val = "\\${" + e + "}(${" + in_val + "})";
                rpn_stack.push_back(out_val);
            } else {
                rpn_stack.push_back(e);
            }
        }
    }
    return rpn_stack.back();
}

set<string> get_variables_from_rpn_list(vector<string> rpn_list) {
    auto variables = set<string> {};
    for (auto &e: rpn_list) {
        if (is_a_letter(e[0]) && !in_functions_list(e))
            variables.insert(e);

    }
    return variables;
}

void test_shunting_yard() {
    std::cout << std::to_string(double(1)) << std::endl;
    auto test_case = [&](
        string s, std::map<string, double> variables, double actual_value) {
        auto rpn_list = shunting_yard(get_expression_stack(s));
        double computed_value = compute_rpn_expression(rpn_list, variables);
        std::cout << "Input string: " << s << std::endl;
        std::cout << "GLSL expression: ";
        std::cout << turn_rpn_expression_to_glsl_expression_string(rpn_list) << std::endl;
        std::cout << "LATEX: ";
        std::cout << turn_rpn_expression_to_latex_string(rpn_list) << std::endl;
        if (abs(computed_value - actual_value) > abs(1e-8*actual_value)) {
            std::cerr << "Shunting yard test case failed:" << std::endl;
            std::cerr << "Input string: " << s << std::endl;
            std::cerr << "Variables: " << std::endl;
            for (auto &name_var: variables) {
                std::cerr << "\t" << name_var.first << " = " 
                    << name_var.second << std::endl;
            }
            std::cerr << "Actual value: " << actual_value << std::endl;
            std::cerr << "Computed value: " << computed_value << std::endl;
        }
    };
    {
        string s = "12.0 + 11 - cos(x*11.75) + sin(k*(k2*x - 12.0))";
        double actual_value = 21.712239269078502;
        // double actual_value = 21.7;
        std::map<string, double> variables = {
            {"x", 3.14159}, {"k", 10.0}, {"k2", 3.0}
        };
        test_case(s, variables, actual_value);
    }
    {
        string s = "k*(x*y*z + sqrt(z^3)) - a";
        double actual_value = 17194.603176456832;
        std::map<string, double> variables = {
            {"a", 10.0}, {"k", 5.5}, {"x", 12.0}, {"y", 13.0}, {"z", 19.5}
        };
        test_case(s, variables, actual_value);
    }
    {
        string s = "a*x -";
        auto rpn_list = shunting_yard(get_expression_stack(s));
        for (auto &e: rpn_list)
            std::cout << e << ", ";
        std::cout << std::endl;
    }
}