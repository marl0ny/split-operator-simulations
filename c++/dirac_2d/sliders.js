
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
        controls.appendChild(label);
        controls.appendChild(document.createElement("br"));
        controls.appendChild(entryBox);
        controls.appendChild(document.createElement("br"));
        entryBoxes.push(entryBox);
        entryBox.addEventListener("input", e =>
            Module.set_string_param(enumCode, i, `${e.target.value}`)
        );
    }
}


let controls = document.getElementById('controls');
createScalarParameterSlider(controls, 0, "Steps/Frame", "int", {'value': 4, 'min': 0, 'max': 20});
createScalarParameterSlider(controls, 3, "mass (a.u.)", "float", {'value': 1.0, 'min': 0.0, 'max': 10.0, 'step': 0.1});
createScalarParameterSlider(controls, 4, "Time step (a.u.)", "float", {'value': 2.8e-05, 'min': 0.0, 'max': 3e-05, 'step': 1e-06});
createScalarParameterSlider(controls, 6, "sigma", "float", {'value': 0.05, 'min': 0.001, 'max': 0.25, 'step': 0.001});
createScalarParameterSlider(controls, 7, "Grid side length (Cubic)", "int", {'value': 512, 'min': 256, 'max': 4096, 'step': 64});
createScalarParameterSlider(controls, 9, "Wave Function Brightness", "float", {'value': 1.0, 'min': 0.0, 'max': 20.0, 'step': 0.01});
createScalarParameterSlider(controls, 10, "Potential brightness", "float", {'value': 0.1, 'min': 0.0, 'max': 1.0, 'step': 0.001});
createEntryBoxes(controls, 11, "4-Vector potential (WIP; currently does nothing)", 4);
createScalarParameterSlider(controls, 12, "Positive energy (+E) amount", "float", {'value': 1.0, 'min': 0.0, 'max': 1.0, 'step': 0.01});
createScalarParameterSlider(controls, 13, "+x spin direction", "float", {'value': 0.0, 'min': -1.0, 'max': 1.0, 'step': 0.01});
createScalarParameterSlider(controls, 14, "+y spin direction", "float", {'value': 1.0, 'min': -1.0, 'max': 1.0, 'step': 0.01});
createScalarParameterSlider(controls, 15, "+z spin direction", "float", {'value': 0.0, 'min': -1.0, 'max': 1.0, 'step': 0.01});
createScalarParameterSlider(controls, 16, "-x spin direction", "float", {'value': 0.0, 'min': -1.0, 'max': 1.0, 'step': 0.01});
createScalarParameterSlider(controls, 17, "-y spin direction", "float", {'value': 0.0, 'min': -1.0, 'max': 1.0, 'step': 0.01});
createScalarParameterSlider(controls, 18, "-z spin direction", "float", {'value': 1.0, 'min': -1.0, 'max': 1.0, 'step': 0.01});
createScalarParameterSlider(controls, 33, "Arrows max length", "float", {'value': 0.05, 'min': 0.0, 'max': 1.0, 'step': 0.01});
createScalarParameterSlider(controls, 34, "Arrows scale", "float", {'value': 1.0, 'min': 0.0, 'max': 20.0, 'step': 0.1});

