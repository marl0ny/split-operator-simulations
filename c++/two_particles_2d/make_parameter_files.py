import json


def camel_to_snake(camel: str, scream: bool = False) -> str:
    """It is assumed that the input string variable is valid camel case.
    """
    snake_list = []
    for i, c in enumerate(camel):
        if c.isupper():
            if i == 0:
                snake_list.append(c if scream else c.lower())
            else:
                snake_list.extend(['_', c if scream else c.lower()])
        else:
            snake_list.append(c.upper() if scream else c)
    return ''.join(snake_list)


SLIDER_JS_FUNCTIONS = """
function createScalarParameterSlider(
    controls, enumCode, sliderLabelName, type, spec) {
    let label = document.createElement("label");
    label.for = spec['id']
    label.style = "color:white; font-family:Arial, Helvetica, sans-serif";
    label.textContent = `${sliderLabelName} = ${spec.value}`
    controls.appendChild(label);
    let slider = document.createElement("input");
    slider.type = "range";
    slider.style ="width: 95%;"
    for (let k of Object.keys(spec))
        slider[k] = spec[k];
    slider.value = spec.value;
    controls.appendChild(document.createElement("br"));
    controls.appendChild(slider);
    controls.appendChild(document.createElement("br"));
    slider.style.touchAction = 'none';
    if (isOnMobile())
        controls.appendChild(document.createElement("br"));
    slider.addEventListener("input", e => {
        let valueF = Number.parseFloat(e.target.value);
        let valueI = Number.parseInt(e.target.value);
        if (type === "float") {
            label.textContent = `${sliderLabelName} = ${valueF}`
            Module.set_float_param(enumCode, valueF);
        } else if (type === "int") {
            label.textContent = `${sliderLabelName} = ${valueI}`
            Module.set_int_param(enumCode, valueI);
        }
    });
};

gCheckboxXorLists = {};

function createCheckbox(controls, enumCode, name, value, xorListName='') {
    let label = document.createElement("label");
    // label.for = spec['id']
    label.style = "color:white; font-family:Arial, Helvetica, sans-serif";
    label.innerHTML = `${name}`
    let checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `checkbox-${enumCode}`;
    if (xorListName !== '') {
        if (!(xorListName in gCheckboxXorLists))
            gCheckboxXorLists[xorListName] = [checkbox.id];
        else
            gCheckboxXorLists[xorListName].push(checkbox.id);
    }
    // slider.style ="width: 95%;"
    // checkbox.value = value;
    checkbox.checked = value;
    // controls.appendChild(document.createElement("br"));
    controls.appendChild(checkbox);
    controls.appendChild(label);
    controls.appendChild(document.createElement("br"));
    checkbox.addEventListener("input", e => {
        console.log(e.target.checked);
        Module.set_bool_param(enumCode, e.target.checked);
        if (e.target.checked === true && xorListName !== '') {
            for (let id_ of gCheckboxXorLists[xorListName]) {
                if (id_ !== checkbox.id) {
                    let enumCode2 = parseInt(id_.split('-')[1]);
                    Module.set_bool_param(enumCode2, false);
                    document.getElementById(id_).checked = false;
                }
            }
        }
    }
    );
}

let gVecParams = {};

function createVectorParameterSliders(
    controls, enumCode, sliderLabelName, type, spec) {
    let label = document.createElement("label");
    label.style = "color:white; font-family:Arial, Helvetica, sans-serif";
    label.textContent = `${sliderLabelName} = (${spec.value})`
    gVecParams[sliderLabelName] = spec.value;
    controls.appendChild(label);
    controls.appendChild(document.createElement("br"));
    for (let i = 0; i < spec.value.length; i++) {
        let slider = document.createElement("input");
        slider.type = "range";
        slider.style ="width: 95%;"
        for (let k of Object.keys(spec))
            slider[k] = spec[k][i];
        slider.value = spec.value[i];
        controls.appendChild(slider);
        controls.appendChild(document.createElement("br"));
        slider.style.touchAction = 'none';
        slider.addEventListener("input", e => {
            let valueF = Number.parseFloat(e.target.value);
            let valueI = Number.parseInt(e.target.value);
            if (type === "Vec2" || 
                type === "Vec3" || type === "Vec4") {
                gVecParams[sliderLabelName][i] = valueF;
                label.textContent 
                    = `${sliderLabelName} = (${gVecParams[sliderLabelName]})`
                Module.set_vec_param(
                    enumCode, spec.value.length, i, valueF);
            } else if (type === "IVec2" || 
                        type === "IVec3" || type === "IVec4") {
                gVecParams[sliderLabelName][i] = valueI;
                label.textContent 
                    = `${sliderLabelName} = (${gVecParams[sliderLabelName]})`
                Module.set_ivec_param(
                    enumCode, spec.value.length, i, valueI);
            }
        });
    }
    if (isOnMobile())
        controls.appendChild(document.createElement("br"));
};

function createSelectionList(
    controls, enumCode, defaultVal, selectionBoxName, textOptions
) {
    let label = document.createElement("label");
    label.style = "color:white; font-family:Arial, Helvetica, sans-serif";
    label.textContent = selectionBoxName;
    controls.appendChild(label);
    controls.appendChild(document.createElement("br"));
    let selector = document.createElement("select");
    for (let i = 0; i < textOptions.length; i++) {
        let option = document.createElement("option");
        option.value = i;
        option.textContent = textOptions[i];
        selector.add(option);
    }
    selector.value = defaultVal;
    selector.addEventListener("change", e =>
        Module.selection_set(
            enumCode, Number.parseInt(e.target.value))
    );
    controls.appendChild(selector);
    controls.appendChild(document.createElement("br"));
}

function createUploadImage(
    controls, enumCode, name, w_code, h_code
) {
    let label = document.createElement("label");
    label.style = "color:white; font-family:Arial, Helvetica, sans-serif";
    label.textContent = name;
    controls.appendChild(label);
    controls.appendChild(document.createElement("br"));
    // im.id = `image-${enumCode}`;
    let uploadImage = document.createElement("input");
    uploadImage.type = "file";
    let im = document.createElement("img");
    im.hidden = true;
    let imCanvas = document.createElement("canvas");
    imCanvas.hidden = true;
    controls.appendChild(uploadImage);
    // controls.appendChild(document.createElement("br"));
    controls.appendChild(im);
    // controls.appendChild(document.createElement("br"));
    controls.appendChild(imCanvas);
    // controls.appendChild(document.createElement("br"));
    uploadImage.addEventListener(
        "change", () => {
            console.log("image uploaded");
            const reader = new FileReader();
            reader.onload = e => {
                im.src = e.target.result;
            }
            let loadImageToPotentialFunc = () => {
                let ctx = imCanvas.getContext("2d");
                let width = Module.get_int_param(ENUM_CODES[w_code]);
                let height = Module.get_int_param(ENUM_CODES[h_code]);
                let imW = im.width;
                let imH = im.height;
                imCanvas.setAttribute("width", width);
                imCanvas.setAttribute("height", height);
                let heightOffset = 0;
                let widthOffset = 0;
                if (imW/imH >= width/height) {
                    let ratio = (imW/imH)/(width/height);
                    widthOffset = parseInt(0.5*width*(1.0 - ratio));
                    ctx.drawImage(im, widthOffset, heightOffset,
                                width*(imW/imH)/(width/height), height);
                } else {
                    let ratio = (imH/imW)/(height/width);
                    heightOffset = parseInt(0.5*height*(1.0 - ratio));
                    ctx.drawImage(im, widthOffset, heightOffset,
                                width, (imH/imW)/(height/width)*height);
                }
                let data = ctx.getImageData(0, 0, width, height).data;
                Module.image_set(
                    enumCode, data, width, height);
            }
            let promiseFunc = () => {
                if (im.width === 0 && im.height === 0) {
                    let p = new Promise(() => setTimeout(promiseFunc, 10));
                    return Promise.resolve(p);
                } else {
                    loadImageToPotentialFunc();
                }
            }
            reader.onloadend = () => {
                let p = new Promise(() => setTimeout(promiseFunc, 10));
                Promise.resolve(p);
            }
            reader.readAsDataURL(uploadImage.files[0]);
        }
    );
}

let gUserParams = {};

function modifyUserSliders(enumCode, variableList) {
    if (!(`${enumCode}` in gUserParams))
        gUserParams[`${enumCode}`] = {}; 
    for (let c of variableList) {
        if (!( c in gUserParams[`${enumCode}`]))
            gUserParams[`${enumCode}`][c] = 1.0;
    }
    let userSliders 
        = document.getElementById(`user-sliders-${enumCode}`);
    userSliders.textContent = ``;
    for (let v of variableList) {
        let label = document.createElement("label");
        label.style = "color:white; font-family:Arial, Helvetica, sans-serif";
        label.textContent = `${v} = ${gUserParams[`${enumCode}`][v]}`;
        userSliders.appendChild(label);
        let slider = document.createElement("input");
        slider.type = "range";
        slider.style = "width: 95%;"
        slider.min = "-5";
        slider.max = "5";
        slider.step = "0.01";
        slider.value = gUserParams[`${enumCode}`][v];
        slider.addEventListener("input", e => {
            let value = Number.parseFloat(e.target.value);
            label.textContent = `${v} = ${value}`;
            gUserParams[`${enumCode}`][v] = value;
            Module.set_user_float_param(enumCode, v, value);
        });
        userSliders.appendChild(document.createElement("br"));
        userSliders.appendChild(slider);
        userSliders.appendChild(document.createElement("br"));
    }
}

function createEntryBoxes(
    controls, enumCode, entryBoxName, count, subLabels
) {
    let label = document.createElement("label");
    label.style = "color:white; font-family:Arial, Helvetica, sans-serif";
    label.textContent = entryBoxName;
    controls.appendChild(label);
    controls.appendChild(document.createElement("br"));
    let entryBoxes = [];
    for (let i = 0; i < count; i++) {
        let entryBox = document.createElement('input');
        entryBox.type = "text";
        entryBox.value = "";
        entryBox.id = `entry-box-${enumCode}-${i}`;
        entryBox.style = "width: 95%;";
        let label = document.createElement("label");
        label.style = "color:white; font-family:Arial, Helvetica, sans-serif";
        label.textContent = `${subLabels[i]}`;
        if (count >= 2) {
            controls.appendChild(label);
            controls.appendChild(document.createElement("br"));
        }
        controls.appendChild(entryBox);
        controls.appendChild(document.createElement("br"));
        entryBoxes.push(entryBox);
        entryBox.addEventListener("input", e =>
            Module.set_string_param(enumCode, i, `${e.target.value}`)
        );
    }
    let userSlidersDiv = document.createElement("div");
    userSlidersDiv.id = `user-sliders-${enumCode}`
    controls.appendChild(userSlidersDiv);

}

function createButton(
    controls, enumCode, buttonName, style=''
) {
    let button = document.createElement("button");
    button.innerText = buttonName;
    if (style !== '')
        button.style = style;
    controls.appendChild(button);
    controls.appendChild(document.createElement("br"));
    button.addEventListener("click", e => Module.button_pressed(enumCode));
}

function createLabel(
    controls, enumCode, labelName, style=''
) {
    let label = document.createElement("label");
    if (style === '')
        label.style = "color:white; font-family:Arial, Helvetica, sans-serif";
    else
        label.style = style;
    label.textContent = `${labelName}`;
    label.id = `label-${enumCode}`;
    controls.appendChild(label);
    controls.appendChild(document.createElement("br"));
}

function editLabel(enumCode, textContent) {
    let idVal = `label-${enumCode}`;
    let label = document.getElementById(idVal);
    label.textContent = textContent;
}

function createLineDivider(controls) {
    let hr = document.createElement("hr");
    hr.style = "color:white;"
    controls.appendChild(hr);
}

"""

def write_sliders_js(parameters, dst_file_name):
    parameters = {k: parameters[k] for k in parameters if k[0:2] != '__'}
    file_contents = ""
    enum_codes = "const ENUM_CODES = {\n"
    for i, k in enumerate(parameters.keys()):
        enum_codes += f"    {camel_to_snake(k, scream=True)}: {i},\n"
    enum_codes += "};\n"
    file_contents += enum_codes
    file_contents += SLIDER_JS_FUNCTIONS
    file_contents += "let controls = document.getElementById('controls');\n"
    for i, k in enumerate(parameters.keys()):
        parameter = parameters[k]
        type_ = parameter["type"]
        value = parameter["value"]
        value_str = f'{value}'
        if 'float' in type_:
            value_str += 'F'
        name = parameter["name"] if "name" in parameter.keys() else k
        if parameter['type'] == 'EntryBoxes':
            list_val = value.strip('{').strip('}').split(',')
            print(parameter["subLabels"])
            labels = parameter["subLabels"] if "subLabels" in parameter \
                else [f"{i}" for i in range(len(list_val))]
            file_contents += \
                f'createEntryBoxes('\
                f'controls, {i}, \"{name}\", {len(list_val)}, {str(labels)});\n'
        if parameter['type'] == 'SelectionList':
            val2 = ''.join([c for c in value if (c != '}' and c != '{')])
            list_val = val2.split(',')[1:]
            print(val2)
            file_contents += f'createSelectionList(controls'
            file_contents += f', {i}, {val2[0]}, \"{name}\", '
            file_contents += '['
            for i, val in enumerate(list_val):
                file_contents += f'{val}' \
                    + (', ' if i != len(list_val) - 1 else '')
            file_contents += ']);\n'
        if parameter['type'] == 'UploadImage':
            width, height = parameter["width"], parameter["height"]
            file_contents += 'createUploadImage('\
                + f'controls, {i}, \"{name}\", \"{width}\", \"{height}\");\n'
        if parameter['type'] == 'Button':
            if "style" in parameter:
                file_contents += \
                    f'createButton(controls, {i}, ' + \
                        f' \"{name}\", \"{parameter["style"]}\");\n'
            else:
                file_contents += f'createButton(controls, {i}, \"{name}\");\n'
        if parameter['type'] == 'Label':
            if "style" in parameter:
                file_contents += \
                    f'createLabel(controls, {i}, ' \
                        + f'\"{name}\", \"{parameter["style"]}\");\n'
            else:
                file_contents += f'createLabel(controls, {i}, \"{name}\", \"\");\n'
        if parameter['type'] == 'LineDivider':
            file_contents += f'createLineDivider(controls);\n'
        if 'min' in parameter and 'max' in parameter:
            p = {k: parameter[k] for k in parameter.keys() 
                     if k in {'min', 'max', 'value', 'step'}}
            if parameter['type'] in ['Vec2', 'Vec3', 'Vec4', 
                                     'IVec2', 'IVec3', 'IVec4']:
                file_contents += \
                    'createVectorParameterSliders(controls, '\
                        f'{i}, "{name}", "{type_}", '\
                            + f'{str(p)});\n'
            else:
                file_contents += \
                    'createScalarParameterSlider(controls, '\
                        f'{i}, "{name}", "{type_}", '\
                            + f'{str(p)});\n'
        if parameter['type'] == 'bool':
            p = parameter['value']
            file_contents += f'createCheckbox('\
                  + f'controls, {i}, "{name}", {"true" if p else "false"}'\
                  + (f', "{parameter["xorListName"]}"' if 
                        "xorListName" in parameter else "") \
                  + f');\n'
    file_contents += '\n'
    with open(dst_file_name, "w") as f:
        f.write(file_contents)

HEADER_START = """#include "gl_wrappers.hpp"

namespace {} {}
"""

def write_uniform_parameters_hpp(parameters, name_space, dst_file_name):
    file_contents = HEADER_START.format(name_space, '{')
    file_contents += "\nstruct UniformParams {\n"
    for k in parameters.keys():
        parameter = parameters[k]
        type_ = parameter["type"]
        value = parameter["value"]
        value_str = f'{value}'
        if 'Vec' in type_:
            value_str = \
                f'{type_}' + \
                    ' {.ind={' + ', '.join([f'{e}' for e in value])\
                    + '}}'
        if 'float' in type_:
            value_str += 'F'
        file_contents += f"    Uniform {k} = "\
            + f"Uniform(({type_})({value_str}));\n"
    file_contents += '    enum {\n'
    for i, k in enumerate(parameters.keys()):
        file_contents += \
            f'        {camel_to_snake(k, scream=True)}={i},\n'
    file_contents += '    };\n'
    file_contents += '    void set(int enum_val, Uniform val) {\n'
    file_contents += '        switch(enum_val) {\n'
    for i, k in enumerate(parameters.keys()):
        file_contents += \
            f'            case {camel_to_snake(k, scream=True)}:\n'
        file_contents += \
            f'            {k} = val;\n'
        file_contents += \
            f'            break;\n'
    file_contents += '        }\n'
    file_contents += '    }\n' 
    file_contents += '    Uniform get(int enum_val) const {\n'
    file_contents += '        switch(enum_val) {\n'
    for i, k in enumerate(parameters.keys()):
        file_contents += \
            f'            case {camel_to_snake(k, scream=True)}:\n'
        file_contents += \
            f'            return {k};\n'
        # file_contents += \
        #    f'            break;\n'
    file_contents += '        }\n'
    file_contents += '    return Uniform(0);\n'
    file_contents += '    }\n'   
    file_contents += "};\n\n}\n"

    with open(dst_file_name, "w") as f:
        f.write(file_contents)

def uniform_member_type(type_: str) -> str:
    if type_ == 'float':
        return 'f32'
    if type_ == 'int':
        return 'i32'
    if type_ == 'bool':
        return 'b32'
    if type_ == 'Vec2':
        return 'vec2'
    if type_ == 'Vec3':
        return 'vec3'
    if type_ == 'Vec4':
        return 'vec4'
    if type_ == 'IVec2':
        return 'ivec2'
    if type_ == 'IVec3':
        return 'ivec3'
    if type_ == 'IVec4':
        return 'ivec4'

def write_typed_sim_parameters_hpp(parameters, name_space, dst_file_name):
    file_contents = HEADER_START.format(name_space, '{')
    file_contents += "\n#ifndef _PARAMETERS_\n#define _PARAMETERS_\n"
    file_contents += "\nstruct Button {};\n"
    file_contents += "\nstruct UploadImage {};\n"
    file_contents += "\ntypedef std::string Label;\n"
    file_contents += "\ntypedef bool BoolRecord;\n"
    file_contents += "\ntypedef std::vector<std::string> EntryBoxes;\n"
    file_contents += "\nstruct SelectionList {\n"
    file_contents += "    int selected;\n"
    file_contents += "    std::vector<std::string> options;\n};\n"
    file_contents += "\nstruct LineDivider {};\n"
    file_contents += "\nstruct NotUsed {};\n"
    file_contents += "\nstruct SimParams {\n"
    parameters = {k: parameters[k] for k in parameters if k[0:2] != '__'}
    for k in parameters.keys():
        parameter = parameters[k]
        type_ = parameter["type"]
        value = parameter["value"]
        value_str = f'{value}'
        if 'Vec' in type_:
            value_str = \
                f'{type_}' + \
                    ' {.ind={' + ', '.join([f'{e}' for e in value])\
                    + '}}'
        if 'float' in type_:
            value_str += 'F'
        if 'bool' in type_:
            value_str = value_str[0].lower() + value_str[1:]
        if type_ in ["int", "float", "bool", "Vec2", "Vec3", "Vec4",
                     "IVec2", "IVec3", "IVec4"]:
            file_contents += f"    {type_} {k} = "\
                + f"({type_})({value_str});\n"
        else:
            file_contents += f"    {type_} {k} = "\
                + f"{type_}{value_str};\n"
    file_contents += '    enum {\n'
    for i, k in enumerate(parameters.keys()):
        file_contents += \
            f'        {camel_to_snake(k, scream=True)}={i},\n'
    file_contents += '    };\n'
    file_contents += '    void set(int enum_val, Uniform val) {\n'
    file_contents += '        switch(enum_val) {\n'
    for i, k in enumerate(parameters.keys()):
        type_ = parameters[k]['type']
        if type_ in ["int", "float", "bool", "Vec2", "Vec3", "Vec4",
                     "IVec2", "IVec3", "IVec4"]:
            file_contents += \
                f'            case {camel_to_snake(k, scream=True)}:\n'
            file_contents += \
                f'            {k} = val.{uniform_member_type(type_)};\n'
            file_contents += \
                f'            break;\n'
    file_contents += '        }\n'
    file_contents += '    }\n' 
    file_contents += '    Uniform get(int enum_val) const {\n'
    file_contents += '        switch(enum_val) {\n'
    for i, k in enumerate(parameters.keys()):
        type_ = parameters[k]['type']
        if type_ in ["int", "float", "bool", "Vec2", "Vec3", "Vec4",
                     "IVec2", "IVec3", "IVec4"]:
            file_contents += \
                f'            case {camel_to_snake(k, scream=True)}:\n'
            file_contents += \
                '            return {' + f'({type_}){k}' + '};\n'
            # file_contents += \
            #    f'            break;\n'
    file_contents += '        }\n'
    file_contents += '        return Uniform(0);\n'
    file_contents += '    }\n'

    file_contents += '    void set(int enum_val, '
    file_contents += 'int index, std::string val) {\n'
    file_contents += '        switch(enum_val) {\n'
    for i, k in enumerate(parameters.keys()):
        type_ = parameters[k]['type']
        if type_ in ["EntryBoxes"]:
            file_contents += \
                12*" " + f"case {camel_to_snake(k, scream=True)}:\n"
            file_contents += 12*" " + f"{k}[index] = val;\n"
            file_contents += 12*" " + "break;\n"
        elif type_ in ["Label"]:
            file_contents += \
                12*" " + f"case {camel_to_snake(k, scream=True)}:\n"
            file_contents += 12*" " + f"{k} = val;\n"
            file_contents += 12*" " + "break;\n"
    file_contents += '        }\n'
    file_contents += '    }\n'

    file_contents += "};\n#endif\n}\n"

    with open(dst_file_name, "w") as f:
        f.write(file_contents)
    

IMGUI_CONTROLS_START = """
#include "{}"

#ifndef _IMGUI_CONTROLS_
#define _IMGUI_CONTROLS_
using namespace {};

#include "gl_wrappers.hpp"

#include "imgui/imgui.h"
#include "imgui/backends/imgui_impl_glfw.h"
#include "imgui/backends/imgui_impl_opengl3.h"

#include <functional>
#include <set>

#include "parameters.hpp"

static std::function<void(int, Uniform)> s_sim_params_set;
static std::function<void(int, int, std::string)> s_sim_params_set_string;
static std::function<Uniform(int)> s_sim_params_get;
static std::function<void(int, std::string, float)> s_user_edit_set_value;
static std::function<float(int, std::string)> s_user_edit_get_value;
static std::function<std::string(int)>
    s_user_edit_get_comma_separated_variables;
static std::function<void(int)> s_button_pressed;
static std::function<void(int, int)> s_selection_set;
static std::function<void(int, std::string, float)>
    s_sim_params_set_user_float_param;

static ImGuiIO global_io;
static std::map<int, std::string> global_labels;

void edit_label_display(int c, std::string text_content) {{
    global_labels[c] = text_content;
}}

void display_parameters_as_sliders(
    int c, std::set<std::string> variables) {{
    std::string string_val = "[";
    for (auto &e: variables)
        string_val += "\"" + e + "\", ";
    string_val += "]";
    string_val 
        = "modifyUserSliders(" + std::to_string(c) + ", " + string_val + ");";
    // TODO
}}

void start_gui(void *window) {{
    bool show_controls_window = true;
    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGuiIO& io = ImGui::GetIO();
    ImGui::StyleColorsClassic();
    ImGui_ImplGlfw_InitForOpenGL((GLFWwindow *)window, true);
    ImGui_ImplOpenGL3_Init("#version 330");
}}

void imgui_controls(void *void_params) {{
    SimParams *params = (SimParams *)void_params;
    for (auto &e: global_labels)
        params->set(e.first, 0, e.second);
"""

IMGUI_CONTROLS_END = """
}

bool outside_gui() {{
    return !global_io.WantCaptureMouse;
}}

void display_gui(void *data) {{
    global_io = ImGui::GetIO();
    ImGui_ImplOpenGL3_NewFrame();
    ImGui_ImplGlfw_NewFrame();
    ImGui::NewFrame();
    bool val = true;
    ImGui::Begin("Controls", &val);
    ImGui::Text("WIP AND INCOMPLETE");
    imgui_controls(data);
    ImGui::End();
    ImGui::Render();
    ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());
}}

#endif
"""

IMGUI_SLIDER_FLOAT  = \
"""    if (ImGui::SliderFloat("{}", &params->{}, {}, {}))
           s_sim_params_set({}, {});
"""

IMGUI_SLIDER_INT  = \
"""    if (ImGui::SliderInt("{}", &params->{}, {}, {}))
            s_sim_params_set({}, {});
"""

IMGUI_CHECKBOX  = \
"""    ImGui::Checkbox("{}", &params->{});
"""

IMGUI_TEXT = \
"""    ImGui::Text("{}");
"""

IMGUI_MENU = \
"""    if (ImGui::MenuItem({}))
            s_selection_set({}, {});
"""

def write_imgui_controls(
        parameters, param_namespace, param_header, dst_file_name):
    parameters = {k: parameters[k] for k in parameters if k[0:2] != '__'}
    file_contents = ""
    file_contents \
        += IMGUI_CONTROLS_START.format(param_header, param_namespace)
    names = set()
    for i, k in enumerate(parameters.keys()):
        parameter = parameters[k]
        type_ = parameter["type"]
        value = parameter["value"]
        try:
            name = parameter["name"]
        except:
            pass
        if name in names:
            name += f" ({k})"
        names.add(name)
        if 'Vec2' == type_ or 'Vec3' == type_ or 'Vec4' == type_:
            if "min" in parameter and "max" in parameter:
                min_, max_ = parameter["min"], parameter["max"]
                file_contents += IMGUI_TEXT.format(name)
                n_elem = int(type_[-1])
                for i in range(n_elem):
                    file_contents += IMGUI_SLIDER_FLOAT.format(
                        f"{k}[{i}]", k + f".ind[{i}]", min_[i], max_[i],
                        "params->" + camel_to_snake(k, True),
                        "params->" + k
                    )
        if 'float' in type_:
            if "min" in parameter and "max" in parameter:
                min_, max_ = parameter["min"], parameter["max"]
                file_contents += IMGUI_SLIDER_FLOAT.format(
                    name, k, min_, max_,
                    "params->" + camel_to_snake(k, True),
                    "params->" + k
                    )
        if 'int' in type_:
            if "min" in parameter and "max" in parameter:
                min_, max_ = parameter["min"], parameter["max"]
                file_contents += IMGUI_SLIDER_INT.format(
                    name, k, min_, max_,
                    "params->" + camel_to_snake(k, True),
                    "params->" + k)
        if 'bool' in type_:
            file_contents += IMGUI_CHECKBOX.format(name, k)
        if 'BoolRecord' in type_:
            file_contents += IMGUI_CHECKBOX.format(name, k)
        if 'Label' in type_:
            file_contents += IMGUI_TEXT.format(name)
        if 'LineDivider' in type_:
            file_contents += f"    ImGui::Text(\"{'-'*80}\");\n"
        if 'SelectionList' in type_:
            val2 = ''.join([c for c in value if (c != '}' and c != '{')])
            list_val = val2.split(',')[1:]
            # file_contents \
            #     += f"    std::vector<bool> sel_{k} ({len(list_val)});\n"
            # file_contents \
            #     += f"    for (int i = 0; i < {len(list_val)}; i++)\n"
            # file_contents \
            #     += f"        sel_{k}[i] = (i == params->{k}.selected);\n"
            file_contents += "    if (ImGui::BeginMenu(\"{}\")) {{\n".format(name)
            for i, e in enumerate(list_val):
                file_contents += "    " + IMGUI_MENU.format(
                    e, f"params->{camel_to_snake(k, True)}", i
                )
            file_contents += "        ImGui::EndMenu();\n"
            file_contents += "    }\n"
            # file_contents \
            #     += f"    for (int i = 0; i < {len(list_val)}; i++)\n"
            # file_contents \
            #     += f"        if (sel_{k}[i]) params->{k}.selected = i;\n"
            # file_contents \
            #     += (f"    s_selection_set(params->{camel_to_snake(k, True)},"
            #          + f" params->{k}.selected);\n")
    file_contents += IMGUI_CONTROLS_END
    with open(dst_file_name, "w") as f:
        f.write(file_contents)

with open('parameters.json', 'r') as f:
    parameters = json.loads(''.join([line for line in f]))

write_sliders_js(parameters, "sliders.js")
write_imgui_controls(
    parameters, "sim_2d", "parameters.hpp", "imgui_wrappers.hpp")
write_typed_sim_parameters_hpp(parameters, "sim_2d", "parameters.hpp")
