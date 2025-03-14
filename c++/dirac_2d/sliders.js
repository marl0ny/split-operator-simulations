
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
    controls, enumCode, entryBoxName, count
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
        label.textContent = `${i}`;
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
    controls, labelName, style=''
) {
    let label = document.createElement("label");
    if (style === '')
        label.style = "color:white; font-family:Arial, Helvetica, sans-serif";
    else
        label.style = style;
    label.textContent = `${labelName}`;
    controls.appendChild(label);
    controls.appendChild(document.createElement("br"));
}

function createLineDivider(controls) {
    let hr = document.createElement("hr");
    hr.style = "color:white;"
    controls.appendChild(hr);
}

let controls = document.getElementById('controls');
createScalarParameterSlider(controls, 0, "Steps/frame", "int", {'value': 4, 'min': 0, 'max': 20});
createScalarParameterSlider(controls, 3, "Mass in atomic units (a.u.)", "float", {'value': 1.0, 'min': 0.0, 'max': 10.0, 'step': 0.1});
createScalarParameterSlider(controls, 4, "Time step (a.u.)", "float", {'value': 2.8e-05, 'min': -3e-05, 'max': 3e-05, 'step': 1e-06});
createScalarParameterSlider(controls, 7, "Wave function brightness", "float", {'value': 1.0, 'min': 0.0, 'max': 20.0, 'step': 0.01});
createScalarParameterSlider(controls, 8, "Potential brightness", "float", {'value': 0.1, 'min': 0.0, 'max': 1.0, 'step': 0.001});
createSelectionList(controls, 9, 2, "Grid discretization size", [ "128x128",  "256x256",  "512x512",  "1024x1024",  "2048x2048"]);
createLineDivider(controls);
createLabel(controls, "Wave function initialization options", "color:white; font-family:Arial, Helvetica, sans-serif; font-weight: bold;");
createScalarParameterSlider(controls, 12, "Gaussian wave packet standard deviation", "float", {'value': 0.05, 'min': 0.005, 'max': 0.15, 'step': 0.001});
createScalarParameterSlider(controls, 13, "Positive energy solutions (+E) proportion", "float", {'value': 1.0, 'min': 0.0, 'max': 1.0, 'step': 0.01});
createLabel(controls, "Negative energy (-E) proportion: 0", "");
createScalarParameterSlider(controls, 15, "+x spin direction", "float", {'value': 0.0, 'min': -1.0, 'max': 1.0, 'step': 0.01});
createScalarParameterSlider(controls, 16, "+y spin direction", "float", {'value': 1.0, 'min': -1.0, 'max': 1.0, 'step': 0.01});
createScalarParameterSlider(controls, 17, "+z spin direction", "float", {'value': 0.0, 'min': -1.0, 'max': 1.0, 'step': 0.01});
createScalarParameterSlider(controls, 18, "-x spin direction", "float", {'value': 0.0, 'min': -1.0, 'max': 1.0, 'step': 0.01});
createScalarParameterSlider(controls, 19, "-y spin direction", "float", {'value': 1.0, 'min': -1.0, 'max': 1.0, 'step': 0.01});
createScalarParameterSlider(controls, 20, "-z spin direction", "float", {'value': 0.0, 'min': -1.0, 'max': 1.0, 'step': 0.01});
createLineDivider(controls);
createLabel(controls, "Scalar/single component visualizations", "color:white; font-family:Arial, Helvetica, sans-serif; font-weight: bold;");
createCheckbox(controls, 23, "Current 0th component - 𝜓†𝜓", false, "scalarVis");
createCheckbox(controls, 24, "Pseudocurrent 0th component", false, "scalarVis");
createCheckbox(controls, 25, "Scalar - 𝜓†𝛾⁰𝜓", true, "scalarVis");
createCheckbox(controls, 26, "Pseudoscalar", false, "scalarVis");
createCheckbox(controls, 27, "|𝜓1|^2 with phase", false, "scalarVis");
createCheckbox(controls, 28, "|𝜓2|^2 with phase", false, "scalarVis");
createCheckbox(controls, 29, "|𝜓3|^2 with phase", false, "scalarVis");
createCheckbox(controls, 30, "|𝜓4|^2 with phase", false, "scalarVis");
createCheckbox(controls, 31, "Scalar potential - V", true);
createLineDivider(controls);
createLabel(controls, "Vector visualizations", "color:white; font-family:Arial, Helvetica, sans-serif; font-weight: bold;");
createCheckbox(controls, 34, "Spatial current", true);
createCheckbox(controls, 35, "Spatial pseudocurrent", false);
createCheckbox(controls, 36, "3-Vector potential", true);
createLineDivider(controls);
createLabel(controls, "Spinor visualizations", "color:white; font-family:Arial, Helvetica, sans-serif; font-weight: bold;");
createCheckbox(controls, 39, "Upper spinor spin", false);
createCheckbox(controls, 40, "Bottom spinor spin", false);
createLineDivider(controls);
createScalarParameterSlider(controls, 42, "Arrows max length", "float", {'value': 0.05, 'min': 0.0, 'max': 1.0, 'step': 0.01});
createScalarParameterSlider(controls, 43, "Arrows scale", "float", {'value': 1.0, 'min': 0.0, 'max': 20.0, 'step': 0.1});
createEntryBoxes(controls, 44, "4-Vector potential", 4);

