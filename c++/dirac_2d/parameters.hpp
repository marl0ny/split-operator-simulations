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
    int stepsPerFrame = (int)(0);
    float brightness = (float)(1.0F);
    float potentialBrightness = (float)(0.1F);
    float sideLength = (float)(2.0F);
    SelectionList mouseSelector = SelectionList{0, {"New wave function", "Sketch modify scalar potential", "Erase modify scalar potential", "Sketch modify vector potential", "Erase modify vector potential", "Rotate only (`3D view` enabled)"}};
    float sketchSize = (float)(0.02F);
    bool show3D = (bool)(false);
    Label simulationDomainLabel = Label{};
    Label xRangeLabel = Label{};
    Label yRangeLabel = Label{};
    SelectionList texelSideLengthSelector = SelectionList{0, {"128x128", "256x256", "512x512", "1024x1024", "2048x2048"}};
    Label dtLabel = Label{};
    float cdtdx = (float)(0.99F);
    bool useNegativeTimeStep = (bool)(false);
    float t = (float)(0.0F);
    float c = (float)(137.06F);
    float hbar = (float)(1.0F);
    float m = (float)(1.0F);
    LineDivider waveFuncInitializationLineDividerStart = LineDivider{};
    Label waveFuncInitializationLabel = Label{};
    Label initializeOptionsLabel = Label{};
    bool positionSpaceInit = (bool)(true);
    bool momentumSpaceInit = (bool)(false);
    float sigma = (float)(0.1F);
    float posE = (float)(1.0F);
    Label negE = Label{};
    Vec3 posSpinDir = (Vec3)(Vec3 {.ind={0.0, 0.0, 1.0}});
    Vec3 negSpinDir = (Vec3)(Vec3 {.ind={0.0, 0.0, 1.0}});
    LineDivider scalarLineDividerStart = LineDivider{};
    Label scalarSingleComponentsLabel = Label{};
    Label adjNoteLabel = Label{};
    bool showCurrent0 = (bool)(false);
    bool showPsuedocurrent0 = (bool)(false);
    bool showScalar = (bool)(false);
    bool showPseudoscalar = (bool)(false);
    bool showPsi0WPhase = (bool)(true);
    bool showPsi1WPhase = (bool)(false);
    bool showPsi2WPhase = (bool)(false);
    bool showPsi3WPhase = (bool)(false);
    bool showSpatialCurrent = (bool)(false);
    bool showPseudospatialCurrent = (bool)(false);
    LineDivider scalarLineDividerEnd = LineDivider{};
    Label spinorFieldVisLabel = Label{};
    bool showPsi01Spin = (bool)(false);
    bool showPsi23Spin = (bool)(false);
    LineDivider spinorFieldVisDividerEnd = LineDivider{};
    Label multiComponentsVisLabel = Label{};
    bool showScalarPotential = (bool)(true);
    bool showVectorPotential = (bool)(true);
    bool showElectric = (bool)(false);
    bool showMagnetic = (bool)(false);
    LineDivider vectorFieldVisDividerEnd = LineDivider{};
    float arrowMaxLength = (float)(0.05F);
    float arrowScale = (float)(1.0F);
    SelectionList presetPotentialSelector = SelectionList{0, {"Free (periodic)", "Quadratic", "Step", "Circle", "Double slit"}};
    EntryBoxes fourVectorPotential = EntryBoxes{"0", "0", "0", "0"};
    enum {
        STEPS_PER_FRAME=0,
        BRIGHTNESS=1,
        POTENTIAL_BRIGHTNESS=2,
        SIDE_LENGTH=3,
        MOUSE_SELECTOR=4,
        SKETCH_SIZE=5,
        SHOW3_D=6,
        SIMULATION_DOMAIN_LABEL=7,
        X_RANGE_LABEL=8,
        Y_RANGE_LABEL=9,
        TEXEL_SIDE_LENGTH_SELECTOR=10,
        DT_LABEL=11,
        CDTDX=12,
        USE_NEGATIVE_TIME_STEP=13,
        T=14,
        C=15,
        HBAR=16,
        M=17,
        WAVE_FUNC_INITIALIZATION_LINE_DIVIDER_START=18,
        WAVE_FUNC_INITIALIZATION_LABEL=19,
        INITIALIZE_OPTIONS_LABEL=20,
        POSITION_SPACE_INIT=21,
        MOMENTUM_SPACE_INIT=22,
        SIGMA=23,
        POS_E=24,
        NEG_E=25,
        POS_SPIN_DIR=26,
        NEG_SPIN_DIR=27,
        SCALAR_LINE_DIVIDER_START=28,
        SCALAR_SINGLE_COMPONENTS_LABEL=29,
        ADJ_NOTE_LABEL=30,
        SHOW_CURRENT0=31,
        SHOW_PSUEDOCURRENT0=32,
        SHOW_SCALAR=33,
        SHOW_PSEUDOSCALAR=34,
        SHOW_PSI0_W_PHASE=35,
        SHOW_PSI1_W_PHASE=36,
        SHOW_PSI2_W_PHASE=37,
        SHOW_PSI3_W_PHASE=38,
        SHOW_SPATIAL_CURRENT=39,
        SHOW_PSEUDOSPATIAL_CURRENT=40,
        SCALAR_LINE_DIVIDER_END=41,
        SPINOR_FIELD_VIS_LABEL=42,
        SHOW_PSI01_SPIN=43,
        SHOW_PSI23_SPIN=44,
        SPINOR_FIELD_VIS_DIVIDER_END=45,
        MULTI_COMPONENTS_VIS_LABEL=46,
        SHOW_SCALAR_POTENTIAL=47,
        SHOW_VECTOR_POTENTIAL=48,
        SHOW_ELECTRIC=49,
        SHOW_MAGNETIC=50,
        VECTOR_FIELD_VIS_DIVIDER_END=51,
        ARROW_MAX_LENGTH=52,
        ARROW_SCALE=53,
        PRESET_POTENTIAL_SELECTOR=54,
        FOUR_VECTOR_POTENTIAL=55,
    };
    void set(int enum_val, Uniform val) {
        switch(enum_val) {
            case STEPS_PER_FRAME:
            stepsPerFrame = val.i32;
            break;
            case BRIGHTNESS:
            brightness = val.f32;
            break;
            case POTENTIAL_BRIGHTNESS:
            potentialBrightness = val.f32;
            break;
            case SIDE_LENGTH:
            sideLength = val.f32;
            break;
            case SKETCH_SIZE:
            sketchSize = val.f32;
            break;
            case SHOW3_D:
            show3D = val.b32;
            break;
            case CDTDX:
            cdtdx = val.f32;
            break;
            case USE_NEGATIVE_TIME_STEP:
            useNegativeTimeStep = val.b32;
            break;
            case T:
            t = val.f32;
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
            case POSITION_SPACE_INIT:
            positionSpaceInit = val.b32;
            break;
            case MOMENTUM_SPACE_INIT:
            momentumSpaceInit = val.b32;
            break;
            case SIGMA:
            sigma = val.f32;
            break;
            case POS_E:
            posE = val.f32;
            break;
            case POS_SPIN_DIR:
            posSpinDir = val.vec3;
            break;
            case NEG_SPIN_DIR:
            negSpinDir = val.vec3;
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
            case SHOW_SPATIAL_CURRENT:
            showSpatialCurrent = val.b32;
            break;
            case SHOW_PSEUDOSPATIAL_CURRENT:
            showPseudospatialCurrent = val.b32;
            break;
            case SHOW_PSI01_SPIN:
            showPsi01Spin = val.b32;
            break;
            case SHOW_PSI23_SPIN:
            showPsi23Spin = val.b32;
            break;
            case SHOW_SCALAR_POTENTIAL:
            showScalarPotential = val.b32;
            break;
            case SHOW_VECTOR_POTENTIAL:
            showVectorPotential = val.b32;
            break;
            case SHOW_ELECTRIC:
            showElectric = val.b32;
            break;
            case SHOW_MAGNETIC:
            showMagnetic = val.b32;
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
            case BRIGHTNESS:
            return {(float)brightness};
            case POTENTIAL_BRIGHTNESS:
            return {(float)potentialBrightness};
            case SIDE_LENGTH:
            return {(float)sideLength};
            case SKETCH_SIZE:
            return {(float)sketchSize};
            case SHOW3_D:
            return {(bool)show3D};
            case CDTDX:
            return {(float)cdtdx};
            case USE_NEGATIVE_TIME_STEP:
            return {(bool)useNegativeTimeStep};
            case T:
            return {(float)t};
            case C:
            return {(float)c};
            case HBAR:
            return {(float)hbar};
            case M:
            return {(float)m};
            case POSITION_SPACE_INIT:
            return {(bool)positionSpaceInit};
            case MOMENTUM_SPACE_INIT:
            return {(bool)momentumSpaceInit};
            case SIGMA:
            return {(float)sigma};
            case POS_E:
            return {(float)posE};
            case POS_SPIN_DIR:
            return {(Vec3)posSpinDir};
            case NEG_SPIN_DIR:
            return {(Vec3)negSpinDir};
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
            case SHOW_SPATIAL_CURRENT:
            return {(bool)showSpatialCurrent};
            case SHOW_PSEUDOSPATIAL_CURRENT:
            return {(bool)showPseudospatialCurrent};
            case SHOW_PSI01_SPIN:
            return {(bool)showPsi01Spin};
            case SHOW_PSI23_SPIN:
            return {(bool)showPsi23Spin};
            case SHOW_SCALAR_POTENTIAL:
            return {(bool)showScalarPotential};
            case SHOW_VECTOR_POTENTIAL:
            return {(bool)showVectorPotential};
            case SHOW_ELECTRIC:
            return {(bool)showElectric};
            case SHOW_MAGNETIC:
            return {(bool)showMagnetic};
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
