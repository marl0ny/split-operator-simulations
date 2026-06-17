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
    int stepsPerFrame = (int)(4);
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
    float sideLength = (float)(8.0F);
    IVec3 simulationDimensions3D = (IVec3)(IVec3 {.ind={64, 64, 64}});
    IVec3 dataTexelDimensions3D = (IVec3)(IVec3 {.ind={64, 64, 64}});
    SubSectionStart visualizationControlsStart = SubSectionStart{};
    SelectionList visualizationSelect = SelectionList{0, {"Volume render", "Three orthogonal planar slices"}};
    bool usePerspectiveProjection = (bool)(true);
    float brightness = (float)(0.25F);
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
    bool showPsi01Spin = (bool)(false);
    bool showPsi23Spin = (bool)(false);
    SubSectionEnd waveFuncVisEnd = SubSectionEnd{};
    SubSectionStart potentialVisStart = SubSectionStart{};
    bool showScalarPotential = (bool)(true);
    bool showVectorPotential = (bool)(true);
    bool showElectric = (bool)(false);
    bool showMagnetic = (bool)(false);
    SubSectionEnd potentialVisEnd = SubSectionEnd{};
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
    IVec3 arrowDimensions = (IVec3)(IVec3 {.ind={16, 16, 16}});
    bool useCones = (bool)(false);
    SubSectionEnd arrows3DLineSectionEnd = SubSectionEnd{};
    SubSectionEnd visualizationControlsEnd = SubSectionEnd{};
    SubSectionStart initializeWaveFunctionStart = SubSectionStart{};
    float sigma = (float)(0.04F);
    float posE = (float)(1.0F);
    Label negE = Label{};
    Vec3 posSpinDir = (Vec3)(Vec3 {.ind={0.0, 0.0, 1.0}});
    Label orientationsMSGLabel = Label{};
    Vec3 negSpinDir = (Vec3)(Vec3 {.ind={0.0, 0.0, 1.0}});
    bool momentumSpaceInit = (bool)(false);
    IVec3 wavenumber = (IVec3)(IVec3 {.ind={16, 0, 0}});
    Vec3 position = (Vec3)(Vec3 {.ind={0.5, 0.5, 0.5}});
    Button initializeNewWaveFunctionButton = Button{};
    SubSectionEnd initializeWaveFunctionEnd = SubSectionEnd{};
    SubSectionStart initializePotentialStart = SubSectionStart{};
    Label potLabel = Label{};
    SelectionList presetPotentialsDropdown = SelectionList{0, {"0", "abs(a)*((x/width)^2 + (y/height)^2 + (z/depth)^2)", "abs(a)/sqrt(x^2 + y^2 + z^2)", "10.0*(step(-y^2+(height*0.084*s1)^2)+step(y^2-(height*0.126*s2)^2))*step(-x^2+(width*0.04*w)^2)", "step(sqrt( (x/width)^2 + (y/height)^2 + (z/depth)^2 ) - 0.45)"}};
    KaTeXLabel latexLabel1 = KaTeXLabel{};
    EntryBoxes fourVectorPotential = EntryBoxes{"0", "0", "0", "0"};
    SubSectionEnd initializePotentialEnd = SubSectionEnd{};
    SubSectionStart boundariesStart = SubSectionStart{};
    Label periodicLabel = Label{};
    bool useAbsorbingBoundaries = (bool)(false);
    float absCoeff = (float)(137.036F);
    SubSectionEnd boundariesEnd = SubSectionEnd{};
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
        VISUALIZATION_CONTROLS_START=15,
        VISUALIZATION_SELECT=16,
        USE_PERSPECTIVE_PROJECTION=17,
        BRIGHTNESS=18,
        WAVE_FUNC_VIS_START=19,
        ADJ_NOTE_LABEL=20,
        SHOW_CURRENT0=21,
        SHOW_PSUEDOCURRENT0=22,
        SHOW_SCALAR=23,
        SHOW_PSEUDOSCALAR=24,
        SHOW_PSI0_W_PHASE=25,
        SHOW_PSI1_W_PHASE=26,
        SHOW_PSI2_W_PHASE=27,
        SHOW_PSI3_W_PHASE=28,
        SHOW_SPATIAL_CURRENT=29,
        SHOW_PSEUDOSPATIAL_CURRENT=30,
        SHOW_PSI01_SPIN=31,
        SHOW_PSI23_SPIN=32,
        WAVE_FUNC_VIS_END=33,
        POTENTIAL_VIS_START=34,
        SHOW_SCALAR_POTENTIAL=35,
        SHOW_VECTOR_POTENTIAL=36,
        SHOW_ELECTRIC=37,
        SHOW_MAGNETIC=38,
        POTENTIAL_VIS_END=39,
        VOLUME_RENDER_SECTION_START=40,
        USE_LINEAR=41,
        ALPHA_BRIGHTNESS=42,
        COLOR_BRIGHTNESS=43,
        VOLUME_TEXEL_DIMENSIONS3_D=44,
        APPLY_BLUR=45,
        BLUR_SIZE=46,
        VOLUME_RENDER_SECTION_END=47,
        PLANAR_SLICES_SECTION_START=48,
        PLANAR_NORM_COORD_OFFSETS=49,
        PLANAR_SLICES_SECTION_END=50,
        ARROWS3_D_LINE_SECTION_START=51,
        ARROW_DIMENSIONS=52,
        USE_CONES=53,
        ARROWS3_D_LINE_SECTION_END=54,
        VISUALIZATION_CONTROLS_END=55,
        INITIALIZE_WAVE_FUNCTION_START=56,
        SIGMA=57,
        POS_E=58,
        NEG_E=59,
        POS_SPIN_DIR=60,
        ORIENTATIONS_M_S_G_LABEL=61,
        NEG_SPIN_DIR=62,
        MOMENTUM_SPACE_INIT=63,
        WAVENUMBER=64,
        POSITION=65,
        INITIALIZE_NEW_WAVE_FUNCTION_BUTTON=66,
        INITIALIZE_WAVE_FUNCTION_END=67,
        INITIALIZE_POTENTIAL_START=68,
        POT_LABEL=69,
        PRESET_POTENTIALS_DROPDOWN=70,
        LATEX_LABEL1=71,
        FOUR_VECTOR_POTENTIAL=72,
        INITIALIZE_POTENTIAL_END=73,
        BOUNDARIES_START=74,
        PERIODIC_LABEL=75,
        USE_ABSORBING_BOUNDARIES=76,
        ABS_COEFF=77,
        BOUNDARIES_END=78,
        TAKE_SCREENSHOTS=79,
        CANVAS_HOVER_DISPLAY=80,
        DUMMY_VALUE=81,
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
            case USE_ABSORBING_BOUNDARIES:
            useAbsorbingBoundaries = val.b32;
            break;
            case ABS_COEFF:
            absCoeff = val.f32;
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
            case USE_ABSORBING_BOUNDARIES:
            return {(bool)useAbsorbingBoundaries};
            case ABS_COEFF:
            return {(float)absCoeff};
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
            case ADJ_NOTE_LABEL:
            adjNoteLabel = val;
            break;
            case NEG_E:
            negE = val;
            break;
            case ORIENTATIONS_M_S_G_LABEL:
            orientationsMSGLabel = val;
            break;
            case POT_LABEL:
            potLabel = val;
            break;
            case FOUR_VECTOR_POTENTIAL:
            fourVectorPotential[index] = val;
            break;
            case PERIODIC_LABEL:
            periodicLabel = val;
            break;
        }
    }
};
#endif
}
