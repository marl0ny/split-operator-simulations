
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

let controls = document.getElementById('controls');
createScalarParameterSlider(controls, 0, "Steps/frame", "int", {'value': 1, 'min': 0, 'max': 20});
createScalarParameterSlider(controls, 1, "Wave function brightness", "float", {'value': 1.0, 'min': 0.0, 'max': 20.0, 'step': 0.01});
createScalarParameterSlider(controls, 2, "Potential brightness", "float", {'value': 0.1, 'min': 0.0, 'max': 1.0, 'step': 0.001});
createSelectionList(controls, 4, 0, "Mouse usage", [ "New wave function",  "Sketch modify scalar potential",  "Erase modify scalar potential",  "Sketch modify vector potential",  "Erase modify vector potential",  "Rotations only for 3D view"]);
createScalarParameterSlider(controls, 5, "Sketch size", "float", {'value': 0.02, 'min': 0.0, 'max': 0.05, 'step': 0.001});
createCheckbox(controls, 6, "3D view", false);
createLabel(controls, 7, "Simulation domain", "");
createLabel(controls, 8, "-1 a.u. ≤ x < 1 a.u.", "");
createLabel(controls, 9, "-1 a.u. ≤ y < 1 a.u.", "");
createSelectionList(controls, 10, 1, "Grid discretization size", [ "128x128",  "256x256",  "512x512",  "1024x1024",  "2048x2048"]);
createLabel(controls, 11, "Time step Δt (a.u.) = 0.000028", "");
createScalarParameterSlider(controls, 12, "c|Δt|/Δx", "float", {'value': 0.99, 'min': 0.0, 'max': 1.0, 'step': 0.001});
createCheckbox(controls, 13, "Negative time step", false);
createScalarParameterSlider(controls, 17, "Mass in atomic units (a.u.)", "float", {'value': 1.0, 'min': 0.0, 'max': 10.0, 'step': 0.1});
createLineDivider(controls);
createLabel(controls, 19, "Initialize wave function options", "color:white; font-family:Arial, Helvetica, sans-serif; font-weight: bold;");
createLabel(controls, 20, "Compute new wave function from: ", "");
createCheckbox(controls, 21, "Product of a real-valued Gaussian with a single free (zero potential) plane wave solution", true, "waveFuncInitOptions");
createCheckbox(controls, 22, "Superposition of free plane wave solutions that form a Gaussian wave packet", false, "waveFuncInitOptions");
createScalarParameterSlider(controls, 23, "Size (standard deviation)", "float", {'value': 0.1, 'min': 0.01, 'max': 0.3, 'step': 0.001});
createScalarParameterSlider(controls, 24, "Proportion of +E solutions", "float", {'value': 1.0, 'min': 0.0, 'max': 1.0, 'step': 0.01});
createLabel(controls, 25, "Proportion of -E solutions = 0", "");
createVectorParameterSliders(controls, 26, "(𝜓₁, 𝜓₂) spin up axis for +E solutions", "Vec3", {'value': [0.0, 0.0, 1.0], 'min': [-1.0, -1.0, -1.0], 'max': [1.0, 1.0, 1.0], 'step': [0.01, 0.01, 0.01]});
createVectorParameterSliders(controls, 27, "(𝜓₃, 𝜓₄) spin up axis for -E solutions", "Vec3", {'value': [0.0, 0.0, 1.0], 'min': [-1.0, -1.0, -1.0], 'max': [1.0, 1.0, 1.0], 'step': [0.01, 0.01, 0.01]});
createLineDivider(controls);
createLabel(controls, 29, "Wave function visualization options", "color:white; font-family:Arial, Helvetica, sans-serif; font-weight: bold;");
createLabel(controls, 30, "(Please note: bar(𝜓) = 𝜓†γ⁰)", "");
createCheckbox(controls, 31, "Current 0th component - 𝜓(r)†𝜓(r)", false, "scalarVis");
createCheckbox(controls, 32, "Pseudocurrent 0th component - 𝜓(r)†γ⁵𝜓(r)", false, "scalarVis");
createCheckbox(controls, 33, "Scalar - bar(𝜓(r))𝜓(r)", false, "scalarVis");
createCheckbox(controls, 34, "Pseudoscalar - bar(𝜓(r))γ⁵𝜓(r)", false, "scalarVis");
createCheckbox(controls, 35, "|𝜓₁(r)|² component with phase", true, "scalarVis");
createCheckbox(controls, 36, "|𝜓₂(r)|² component with phase", false, "scalarVis");
createCheckbox(controls, 37, "|𝜓₃(r)|² component with phase", false, "scalarVis");
createCheckbox(controls, 38, "|𝜓₄(r)|² component with phase", false, "scalarVis");
createCheckbox(controls, 39, "Spatial current - bar(𝜓(r))γⁱ𝜓(r), i=1,2,3", false);
createCheckbox(controls, 40, "Spatial pseudocurrent - bar(𝜓(r))γⁱγ⁵𝜓(r)", false);
createLineDivider(controls);
createLabel(controls, 42, "Spin visualization options", "color:white; font-family:Arial, Helvetica, sans-serif; font-weight: bold;");
createCheckbox(controls, 43, "Spin axis where (𝜓₁(r), 𝜓₂(r)) is spin up", false);
createCheckbox(controls, 44, "Spin axis where (𝜓₃(r), 𝜓₄(r)) is spin up", false);
createLineDivider(controls);
createLabel(controls, 46, "Potential visualization options", "color:white; font-family:Arial, Helvetica, sans-serif; font-weight: bold;");
createCheckbox(controls, 47, "Scalar potential - V(r)", true);
createCheckbox(controls, 48, "3-Vector potential - 𝐀(r)", true);
createCheckbox(controls, 49, "𝐄(r) = -∇V(r) - ∂𝐀(r)/∂t", false);
createCheckbox(controls, 50, "𝐁(r) = ∇×𝐀(r)", false);
createLineDivider(controls);
createScalarParameterSlider(controls, 52, "Arrows max length", "float", {'value': 0.05, 'min': 0.0, 'max': 1.0, 'step': 0.01});
createScalarParameterSlider(controls, 53, "Arrows scale", "float", {'value': 1.0, 'min': 0.0, 'max': 20.0, 'step': 0.1});
createSelectionList(controls, 54, 0, "Preset potential", [ "Free (periodic)",  "Quadratic",  "Step",  "Circle",  "Double slit"]);
createEntryBoxes(controls, 55, "Text edit four-vector potential", 4, ['V(x, y, t)', 'Aˣ(x, y, t)', 'Aʸ(x, y, t)', 'Aᶻ(x, y, t)']);

