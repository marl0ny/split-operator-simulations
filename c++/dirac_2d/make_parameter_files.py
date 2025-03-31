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


SLIDER_JS_START = """
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
    label.textContent = `${name}`
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
    file_contents = ""
    file_contents += SLIDER_JS_START
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
    file_contents += "\ntypedef std::string Label;\n"
    file_contents += "\ntypedef std::vector<std::string> EntryBoxes;\n"
    file_contents += "\nstruct SelectionList {\n"
    file_contents += "    int selected;\n"
    file_contents += "    std::vector<std::string> options;\n};\n"
    file_contents += "\nstruct SimParams {\n"
    file_contents += "\nstruct LineDivider {};\n"
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
    file_contents += '        }\n'
    file_contents += '    }\n'

    file_contents += "};\n#endif\n}\n"

    with open(dst_file_name, "w") as f:
        f.write(file_contents)


with open('parameters.json', 'r') as f:
    parameters = json.loads(''.join([line for line in f]))

write_sliders_js(parameters, "sliders.js")
write_typed_sim_parameters_hpp(parameters, "sim_2d", "parameters.hpp")
