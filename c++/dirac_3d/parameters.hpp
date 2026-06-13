#include "gl_wrappers.hpp"

namespace sim_3d {

#ifndef _PARAMETERS_
#define _PARAMETERS_

struct Button {};

struct UploadImage {};

typedef std::string Label;

typedef bool BoolRecord;

struct BMPRecord {
    bool is_recording;
    int width, height;
};

typedef std::vector<std::string> EntryBoxes;

struct SelectionList {
    int selected;
    std::vector<std::string> options;
};

struct LineDivider {};

struct SubSectionStart {};

struct SubSectionEnd {};

struct HoveringCanvasLabel { std::string contents; };

struct LinkedLabel { std::string contents; };

struct KaTeXLabel {};

struct NotUsed {};

struct SimParams {
    LinkedLabel link = {"https://github.com/marl0ny/split-operator-simulations"};
    int stepsPerFrame = (int)(1);
    SelectionList mouseSelector = SelectionList{0, {"Rotate only", "New wave function", "Sketch modify scalar potential", "Erase modify scalar potential", "Sketch modify vector potential", "Erase modify vector potential"}};
    SelectionList texelSideLengthSelector = SelectionList{0, {"64x64x64", "128x128x128", "256x256x256"}};
    Label dtLabel = Label{};
    float cdtdx = (float)(0.99F);
    float c = (float)(137.06F);
    float hbar = (float)(1.0F);
    float m = (float)(1.0F);
    float dt = (float)(2.8e-05F);
    float t = (float)(0.0F);
    int texelSideLength = (int)(64);
    float sideLength = (float)(2.0F);
    IVec3 simulationDimensions3D = (IVec3)(IVec3 {.ind={64, 64, 64}});
    IVec3 dataTexelDimensions3D = (IVec3)(IVec3 {.ind={64, 64, 64}});
    SubSectionStart initializeWaveFunctionStart = SubSectionStart{};
    float sigma = (float)(0.1F);
    float posE = (float)(1.0F);
    Label negE = Label{};
    Vec3 posSpinDir = (Vec3)(Vec3 {.ind={0.0, 0.0, 1.0}});
    Label orientationsMSGLabel = Label{};
    Vec3 negSpinDir = (Vec3)(Vec3 {.ind={0.0, 0.0, 1.0}});
    bool momentumSpaceInit = (bool)(false);
    IVec3 wavenumber = (IVec3)(IVec3 {.ind={0, 0, 0}});
    Vec3 position = (Vec3)(Vec3 {.ind={0.5, 0.5, 0.5}});
    Button initializeNewWaveFunctionButton = Button{};
    SubSectionEnd initializeWaveFunctionEnd = SubSectionEnd{};
    SubSectionStart initializePotentialStart = SubSectionStart{};
    EntryBoxes fourVectorPotential = EntryBoxes{"0", "0", "0", "0"};
    KaTeXLabel latexLabel1 = KaTeXLabel{};
    KaTeXLabel latexLabel2 = KaTeXLabel{};
    KaTeXLabel latexLabel3 = KaTeXLabel{};
    KaTeXLabel latexLabel4 = KaTeXLabel{};
    SubSectionEnd initializePotentialEnd = SubSectionEnd{};
    SubSectionStart visualizationControlsStart = SubSectionStart{};
    SelectionList visualizationSelect = SelectionList{0, {"Volume render", "Three orthogonal planar slices", "Vector field", "Three orthogonal planar slices, vector field", "Volume render, vector field"}};
    bool usePerspectiveProjection = (bool)(true);
    float brightness = (float)(0.5F);
    SubSectionStart waveFuncVisStart = SubSectionStart{};
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
    SubSectionEnd waveFuncVisEnd = SubSectionEnd{};
    SubSectionStart volumeRenderSectionStart = SubSectionStart{};
    bool useLinear = (bool)(false);
    float alphaBrightness = (float)(2.0F);
    float colorBrightness = (float)(1.0F);
    IVec3 volumeTexelDimensions3D = (IVec3)(IVec3 {.ind={128, 128, 192}});
    bool applyBlur = (bool)(true);
    int blurSize = (int)(5);
    SubSectionEnd volumeRenderSectionEnd = SubSectionEnd{};
    SubSectionStart planarSlicesSectionStart = SubSectionStart{};
    Vec3 planarNormCoordOffsets = (Vec3)(Vec3 {.ind={0.5, 0.5, 0.5}});
    SubSectionEnd planarSlicesSectionEnd = SubSectionEnd{};
    SubSectionStart arrows3DLineSectionStart = SubSectionStart{};
    IVec3 arrowDimensions = (IVec3)(IVec3 {.ind={8, 8, 8}});
    bool useCones = (bool)(false);
    SubSectionEnd arrows3DLineSectionEnd = SubSectionEnd{};
    SubSectionEnd visualizationControlsEnd = SubSectionEnd{};
    BMPRecord takeScreenshots = BMPRecord{false, 1440, 1440};
    HoveringCanvasLabel canvasHoverDisplay = HoveringCanvasLabel{};
    int dummyValue = (int)(0);
    enum {
        LINK=0,
        STEPS_PER_FRAME=1,
        MOUSE_SELECTOR=2,
        TEXEL_SIDE_LENGTH_SELECTOR=3,
        DT_LABEL=4,
        CDTDX=5,
        C=6,
        HBAR=7,
        M=8,
        DT=9,
        T=10,
        TEXEL_SIDE_LENGTH=11,
        SIDE_LENGTH=12,
        SIMULATION_DIMENSIONS3_D=13,
        DATA_TEXEL_DIMENSIONS3_D=14,
        INITIALIZE_WAVE_FUNCTION_START=15,
        SIGMA=16,
        POS_E=17,
        NEG_E=18,
        POS_SPIN_DIR=19,
        ORIENTATIONS_M_S_G_LABEL=20,
        NEG_SPIN_DIR=21,
        MOMENTUM_SPACE_INIT=22,
        WAVENUMBER=23,
        POSITION=24,
        INITIALIZE_NEW_WAVE_FUNCTION_BUTTON=25,
        INITIALIZE_WAVE_FUNCTION_END=26,
        INITIALIZE_POTENTIAL_START=27,
        FOUR_VECTOR_POTENTIAL=28,
        LATEX_LABEL1=29,
        LATEX_LABEL2=30,
        LATEX_LABEL3=31,
        LATEX_LABEL4=32,
        INITIALIZE_POTENTIAL_END=33,
        VISUALIZATION_CONTROLS_START=34,
        VISUALIZATION_SELECT=35,
        USE_PERSPECTIVE_PROJECTION=36,
        BRIGHTNESS=37,
        WAVE_FUNC_VIS_START=38,
        ADJ_NOTE_LABEL=39,
        SHOW_CURRENT0=40,
        SHOW_PSUEDOCURRENT0=41,
        SHOW_SCALAR=42,
        SHOW_PSEUDOSCALAR=43,
        SHOW_PSI0_W_PHASE=44,
        SHOW_PSI1_W_PHASE=45,
        SHOW_PSI2_W_PHASE=46,
        SHOW_PSI3_W_PHASE=47,
        SHOW_SPATIAL_CURRENT=48,
        SHOW_PSEUDOSPATIAL_CURRENT=49,
        WAVE_FUNC_VIS_END=50,
        VOLUME_RENDER_SECTION_START=51,
        USE_LINEAR=52,
        ALPHA_BRIGHTNESS=53,
        COLOR_BRIGHTNESS=54,
        VOLUME_TEXEL_DIMENSIONS3_D=55,
        APPLY_BLUR=56,
        BLUR_SIZE=57,
        VOLUME_RENDER_SECTION_END=58,
        PLANAR_SLICES_SECTION_START=59,
        PLANAR_NORM_COORD_OFFSETS=60,
        PLANAR_SLICES_SECTION_END=61,
        ARROWS3_D_LINE_SECTION_START=62,
        ARROW_DIMENSIONS=63,
        USE_CONES=64,
        ARROWS3_D_LINE_SECTION_END=65,
        VISUALIZATION_CONTROLS_END=66,
        TAKE_SCREENSHOTS=67,
        CANVAS_HOVER_DISPLAY=68,
        DUMMY_VALUE=69,
    };
    void set(int enum_val, Uniform val) {
        switch(enum_val) {
            case STEPS_PER_FRAME:
            stepsPerFrame = val.i32;
            break;
            case CDTDX:
            cdtdx = val.f32;
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
            case TEXEL_SIDE_LENGTH:
            texelSideLength = val.i32;
            break;
            case SIDE_LENGTH:
            sideLength = val.f32;
            break;
            case SIMULATION_DIMENSIONS3_D:
            simulationDimensions3D = val.ivec3;
            break;
            case DATA_TEXEL_DIMENSIONS3_D:
            dataTexelDimensions3D = val.ivec3;
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
            case MOMENTUM_SPACE_INIT:
            momentumSpaceInit = val.b32;
            break;
            case WAVENUMBER:
            wavenumber = val.ivec3;
            break;
            case POSITION:
            position = val.vec3;
            break;
            case USE_PERSPECTIVE_PROJECTION:
            usePerspectiveProjection = val.b32;
            break;
            case BRIGHTNESS:
            brightness = val.f32;
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
            case USE_LINEAR:
            useLinear = val.b32;
            break;
            case ALPHA_BRIGHTNESS:
            alphaBrightness = val.f32;
            break;
            case COLOR_BRIGHTNESS:
            colorBrightness = val.f32;
            break;
            case VOLUME_TEXEL_DIMENSIONS3_D:
            volumeTexelDimensions3D = val.ivec3;
            break;
            case APPLY_BLUR:
            applyBlur = val.b32;
            break;
            case BLUR_SIZE:
            blurSize = val.i32;
            break;
            case PLANAR_NORM_COORD_OFFSETS:
            planarNormCoordOffsets = val.vec3;
            break;
            case ARROW_DIMENSIONS:
            arrowDimensions = val.ivec3;
            break;
            case USE_CONES:
            useCones = val.b32;
            break;
            case DUMMY_VALUE:
            dummyValue = val.i32;
            break;
        }
    }
    Uniform get(int enum_val) const {
        switch(enum_val) {
            case STEPS_PER_FRAME:
            return {(int)stepsPerFrame};
            case CDTDX:
            return {(float)cdtdx};
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
            case TEXEL_SIDE_LENGTH:
            return {(int)texelSideLength};
            case SIDE_LENGTH:
            return {(float)sideLength};
            case SIMULATION_DIMENSIONS3_D:
            return {(IVec3)simulationDimensions3D};
            case DATA_TEXEL_DIMENSIONS3_D:
            return {(IVec3)dataTexelDimensions3D};
            case SIGMA:
            return {(float)sigma};
            case POS_E:
            return {(float)posE};
            case POS_SPIN_DIR:
            return {(Vec3)posSpinDir};
            case NEG_SPIN_DIR:
            return {(Vec3)negSpinDir};
            case MOMENTUM_SPACE_INIT:
            return {(bool)momentumSpaceInit};
            case WAVENUMBER:
            return {(IVec3)wavenumber};
            case POSITION:
            return {(Vec3)position};
            case USE_PERSPECTIVE_PROJECTION:
            return {(bool)usePerspectiveProjection};
            case BRIGHTNESS:
            return {(float)brightness};
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
            case USE_LINEAR:
            return {(bool)useLinear};
            case ALPHA_BRIGHTNESS:
            return {(float)alphaBrightness};
            case COLOR_BRIGHTNESS:
            return {(float)colorBrightness};
            case VOLUME_TEXEL_DIMENSIONS3_D:
            return {(IVec3)volumeTexelDimensions3D};
            case APPLY_BLUR:
            return {(bool)applyBlur};
            case BLUR_SIZE:
            return {(int)blurSize};
            case PLANAR_NORM_COORD_OFFSETS:
            return {(Vec3)planarNormCoordOffsets};
            case ARROW_DIMENSIONS:
            return {(IVec3)arrowDimensions};
            case USE_CONES:
            return {(bool)useCones};
            case DUMMY_VALUE:
            return {(int)dummyValue};
        }
        return Uniform(0);
    }
    void set(int enum_val, int index, std::string val) {
        switch(enum_val) {
            case DT_LABEL:
            dtLabel = val;
            break;
            case NEG_E:
            negE = val;
            break;
            case ORIENTATIONS_M_S_G_LABEL:
            orientationsMSGLabel = val;
            break;
            case FOUR_VECTOR_POTENTIAL:
            fourVectorPotential[index] = val;
            break;
            case ADJ_NOTE_LABEL:
            adjNoteLabel = val;
            break;
        }
    }
};
#endif
}
