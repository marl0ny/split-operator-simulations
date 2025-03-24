#include "gl_wrappers.hpp"

namespace sim_2d {

#ifndef _PARAMETERS_
#define _PARAMETERS_

struct Button {};

typedef std::string Label;

typedef std::vector<std::string> EntryBoxes;

struct SelectionList {
    int selected;
    std::vector<std::string> options;
};

struct SimParams {

struct LineDivider {};
    int stepsPerFrame = (int)(4);
    float c = (float)(137.06F);
    float hbar = (float)(1.0F);
    float m = (float)(1.0F);
    float dt = (float)(2.8e-05F);
    float t = (float)(0.0F);
    float sideLength = (float)(2.0F);
    float brightness = (float)(1.0F);
    float potentialBrightness = (float)(0.1F);
    SelectionList mouseSelector = SelectionList{0, {"New wave function", "Scalar potential sketch", "Vector potential sketch", "Rotate/zoom 3D view"}};
    SelectionList texelSideLengthSelector = SelectionList{0, {"128x128", "256x256", "512x512", "1024x1024", "2048x2048"}};
    bool show3D = (bool)(false);
    LineDivider waveFuncInitializationLineDividerStart = LineDivider{};
    Label waveFuncInitializationLabel = Label{};
    float sigma = (float)(0.05F);
    float posE = (float)(1.0F);
    Label negE = Label{};
    float posX = (float)(0.0F);
    float posY = (float)(1.0F);
    float posZ = (float)(0.0F);
    float negX = (float)(0.0F);
    float negY = (float)(1.0F);
    float negZ = (float)(0.0F);
    LineDivider scalarLineDividerStart = LineDivider{};
    Label scalarSingleComponentsLabel = Label{};
    Label adjNoteLabel = Label{};
    bool showCurrent0 = (bool)(false);
    bool showPsuedocurrent0 = (bool)(false);
    bool showScalar = (bool)(true);
    bool showPseudoscalar = (bool)(false);
    bool showPsi0WPhase = (bool)(false);
    bool showPsi1WPhase = (bool)(false);
    bool showPsi2WPhase = (bool)(false);
    bool showPsi3WPhase = (bool)(false);
    bool showScalarPotential = (bool)(true);
    LineDivider scalarLineDividerEnd = LineDivider{};
    Label multiComponentsVisLabel = Label{};
    bool showSpatialCurrent = (bool)(true);
    bool showPseudospatialCurrent = (bool)(false);
    bool showVectorPotential = (bool)(true);
    LineDivider vectorFieldVisDividerEnd = LineDivider{};
    Label spinorFieldVisLabel = Label{};
    bool showPsi01Spin = (bool)(false);
    bool showPsi23Spin = (bool)(false);
    LineDivider spinorFieldVisDividerEnd = LineDivider{};
    float arrowMaxLength = (float)(0.05F);
    float arrowScale = (float)(1.0F);
    EntryBoxes fourVectorPotential = EntryBoxes{"0", "0", "0", "0"};
    enum {
        STEPS_PER_FRAME=0,
        C=1,
        HBAR=2,
        M=3,
        DT=4,
        T=5,
        SIDE_LENGTH=6,
        BRIGHTNESS=7,
        POTENTIAL_BRIGHTNESS=8,
        MOUSE_SELECTOR=9,
        TEXEL_SIDE_LENGTH_SELECTOR=10,
        SHOW3_D=11,
        WAVE_FUNC_INITIALIZATION_LINE_DIVIDER_START=12,
        WAVE_FUNC_INITIALIZATION_LABEL=13,
        SIGMA=14,
        POS_E=15,
        NEG_E=16,
        POS_X=17,
        POS_Y=18,
        POS_Z=19,
        NEG_X=20,
        NEG_Y=21,
        NEG_Z=22,
        SCALAR_LINE_DIVIDER_START=23,
        SCALAR_SINGLE_COMPONENTS_LABEL=24,
        ADJ_NOTE_LABEL=25,
        SHOW_CURRENT0=26,
        SHOW_PSUEDOCURRENT0=27,
        SHOW_SCALAR=28,
        SHOW_PSEUDOSCALAR=29,
        SHOW_PSI0_W_PHASE=30,
        SHOW_PSI1_W_PHASE=31,
        SHOW_PSI2_W_PHASE=32,
        SHOW_PSI3_W_PHASE=33,
        SHOW_SCALAR_POTENTIAL=34,
        SCALAR_LINE_DIVIDER_END=35,
        MULTI_COMPONENTS_VIS_LABEL=36,
        SHOW_SPATIAL_CURRENT=37,
        SHOW_PSEUDOSPATIAL_CURRENT=38,
        SHOW_VECTOR_POTENTIAL=39,
        VECTOR_FIELD_VIS_DIVIDER_END=40,
        SPINOR_FIELD_VIS_LABEL=41,
        SHOW_PSI01_SPIN=42,
        SHOW_PSI23_SPIN=43,
        SPINOR_FIELD_VIS_DIVIDER_END=44,
        ARROW_MAX_LENGTH=45,
        ARROW_SCALE=46,
        FOUR_VECTOR_POTENTIAL=47,
    };
    void set(int enum_val, Uniform val) {
        switch(enum_val) {
            case STEPS_PER_FRAME:
            stepsPerFrame = val.i32;
            break;
            case C:
            c = val.f32;
            break;
            case HBAR:
            hbar = val.f32;
            break;
            case M:
            m = val.f32;
            break;
            case DT:
            dt = val.f32;
            break;
            case T:
            t = val.f32;
            break;
            case SIDE_LENGTH:
            sideLength = val.f32;
            break;
            case BRIGHTNESS:
            brightness = val.f32;
            break;
            case POTENTIAL_BRIGHTNESS:
            potentialBrightness = val.f32;
            break;
            case SHOW3_D:
            show3D = val.b32;
            break;
            case SIGMA:
            sigma = val.f32;
            break;
            case POS_E:
            posE = val.f32;
            break;
            case POS_X:
            posX = val.f32;
            break;
            case POS_Y:
            posY = val.f32;
            break;
            case POS_Z:
            posZ = val.f32;
            break;
            case NEG_X:
            negX = val.f32;
            break;
            case NEG_Y:
            negY = val.f32;
            break;
            case NEG_Z:
            negZ = val.f32;
            break;
            case SHOW_CURRENT0:
            showCurrent0 = val.b32;
            break;
            case SHOW_PSUEDOCURRENT0:
            showPsuedocurrent0 = val.b32;
            break;
            case SHOW_SCALAR:
            showScalar = val.b32;
            break;
            case SHOW_PSEUDOSCALAR:
            showPseudoscalar = val.b32;
            break;
            case SHOW_PSI0_W_PHASE:
            showPsi0WPhase = val.b32;
            break;
            case SHOW_PSI1_W_PHASE:
            showPsi1WPhase = val.b32;
            break;
            case SHOW_PSI2_W_PHASE:
            showPsi2WPhase = val.b32;
            break;
            case SHOW_PSI3_W_PHASE:
            showPsi3WPhase = val.b32;
            break;
            case SHOW_SCALAR_POTENTIAL:
            showScalarPotential = val.b32;
            break;
            case SHOW_SPATIAL_CURRENT:
            showSpatialCurrent = val.b32;
            break;
            case SHOW_PSEUDOSPATIAL_CURRENT:
            showPseudospatialCurrent = val.b32;
            break;
            case SHOW_VECTOR_POTENTIAL:
            showVectorPotential = val.b32;
            break;
            case SHOW_PSI01_SPIN:
            showPsi01Spin = val.b32;
            break;
            case SHOW_PSI23_SPIN:
            showPsi23Spin = val.b32;
            break;
            case ARROW_MAX_LENGTH:
            arrowMaxLength = val.f32;
            break;
            case ARROW_SCALE:
            arrowScale = val.f32;
            break;
        }
    }
    Uniform get(int enum_val) const {
        switch(enum_val) {
            case STEPS_PER_FRAME:
            return {(int)stepsPerFrame};
            case C:
            return {(float)c};
            case HBAR:
            return {(float)hbar};
            case M:
            return {(float)m};
            case DT:
            return {(float)dt};
            case T:
            return {(float)t};
            case SIDE_LENGTH:
            return {(float)sideLength};
            case BRIGHTNESS:
            return {(float)brightness};
            case POTENTIAL_BRIGHTNESS:
            return {(float)potentialBrightness};
            case SHOW3_D:
            return {(bool)show3D};
            case SIGMA:
            return {(float)sigma};
            case POS_E:
            return {(float)posE};
            case POS_X:
            return {(float)posX};
            case POS_Y:
            return {(float)posY};
            case POS_Z:
            return {(float)posZ};
            case NEG_X:
            return {(float)negX};
            case NEG_Y:
            return {(float)negY};
            case NEG_Z:
            return {(float)negZ};
            case SHOW_CURRENT0:
            return {(bool)showCurrent0};
            case SHOW_PSUEDOCURRENT0:
            return {(bool)showPsuedocurrent0};
            case SHOW_SCALAR:
            return {(bool)showScalar};
            case SHOW_PSEUDOSCALAR:
            return {(bool)showPseudoscalar};
            case SHOW_PSI0_W_PHASE:
            return {(bool)showPsi0WPhase};
            case SHOW_PSI1_W_PHASE:
            return {(bool)showPsi1WPhase};
            case SHOW_PSI2_W_PHASE:
            return {(bool)showPsi2WPhase};
            case SHOW_PSI3_W_PHASE:
            return {(bool)showPsi3WPhase};
            case SHOW_SCALAR_POTENTIAL:
            return {(bool)showScalarPotential};
            case SHOW_SPATIAL_CURRENT:
            return {(bool)showSpatialCurrent};
            case SHOW_PSEUDOSPATIAL_CURRENT:
            return {(bool)showPseudospatialCurrent};
            case SHOW_VECTOR_POTENTIAL:
            return {(bool)showVectorPotential};
            case SHOW_PSI01_SPIN:
            return {(bool)showPsi01Spin};
            case SHOW_PSI23_SPIN:
            return {(bool)showPsi23Spin};
            case ARROW_MAX_LENGTH:
            return {(float)arrowMaxLength};
            case ARROW_SCALE:
            return {(float)arrowScale};
        }
        return Uniform(0);
    }
    void set(int enum_val, int index, std::string val) {
        switch(enum_val) {
            case FOUR_VECTOR_POTENTIAL:
            fourVectorPotential[index] = val;
            break;
        }
    }
};
#endif
}
