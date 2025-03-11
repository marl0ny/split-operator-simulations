#include "gl_wrappers.hpp"

namespace sim_2d {

#ifndef _PARAMETERS_
#define _PARAMETERS_

struct SimParams {
    int stepsPerFrame = (int)(4);
    float c = (float)(137.06F);
    float hbar = (float)(1.0F);
    float m = (float)(1.0F);
    float dt = (float)(2.8e-05F);
    float t = (float)(0.0F);
    float sigma = (float)(0.05F);
    int texelSideLength = (int)(512);
    float sideLength = (float)(2.0F);
    float brightness = (float)(1.0F);
    float potentialBrightness = (float)(0.1F);
    std::vector<std::string> fourVectorPotential = std::vector<std::string>{"0", "0", "0", "0"};
    float posE = (float)(1.0F);
    float posX = (float)(0.0F);
    float posY = (float)(1.0F);
    float posZ = (float)(0.0F);
    float negX = (float)(0.0F);
    float negY = (float)(1.0F);
    float negZ = (float)(0.0F);
    bool showCurrent0 = (bool)(false);
    bool showPsuedocurrent0 = (bool)(false);
    bool showScalar = (bool)(true);
    bool showPseudoscalar = (bool)(false);
    bool showScalarPotential = (bool)(true);
    bool showSpatialCurrent = (bool)(true);
    bool showPseudospatialCurrent = (bool)(false);
    bool showPsi01Spin = (bool)(false);
    bool showPsi23Spin = (bool)(false);
    bool showVectorPotential = (bool)(true);
    bool showPsi0WPhase = (bool)(false);
    bool showPsi1WPhase = (bool)(false);
    bool showPsi2WPhase = (bool)(false);
    bool showPsi3WPhase = (bool)(false);
    float arrowMaxLength = (float)(0.05F);
    float arrowScale = (float)(1.0F);
    enum {
        STEPS_PER_FRAME=0,
        C=1,
        HBAR=2,
        M=3,
        DT=4,
        T=5,
        SIGMA=6,
        TEXEL_SIDE_LENGTH=7,
        SIDE_LENGTH=8,
        BRIGHTNESS=9,
        POTENTIAL_BRIGHTNESS=10,
        FOUR_VECTOR_POTENTIAL=11,
        POS_E=12,
        POS_X=13,
        POS_Y=14,
        POS_Z=15,
        NEG_X=16,
        NEG_Y=17,
        NEG_Z=18,
        SHOW_CURRENT0=19,
        SHOW_PSUEDOCURRENT0=20,
        SHOW_SCALAR=21,
        SHOW_PSEUDOSCALAR=22,
        SHOW_SCALAR_POTENTIAL=23,
        SHOW_SPATIAL_CURRENT=24,
        SHOW_PSEUDOSPATIAL_CURRENT=25,
        SHOW_PSI01_SPIN=26,
        SHOW_PSI23_SPIN=27,
        SHOW_VECTOR_POTENTIAL=28,
        SHOW_PSI0_W_PHASE=29,
        SHOW_PSI1_W_PHASE=30,
        SHOW_PSI2_W_PHASE=31,
        SHOW_PSI3_W_PHASE=32,
        ARROW_MAX_LENGTH=33,
        ARROW_SCALE=34,
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
            case SIGMA:
            sigma = val.f32;
            break;
            case TEXEL_SIDE_LENGTH:
            texelSideLength = val.i32;
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
            case SHOW_SCALAR_POTENTIAL:
            showScalarPotential = val.b32;
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
            case SHOW_VECTOR_POTENTIAL:
            showVectorPotential = val.b32;
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
            case SIGMA:
            return {(float)sigma};
            case TEXEL_SIDE_LENGTH:
            return {(int)texelSideLength};
            case SIDE_LENGTH:
            return {(float)sideLength};
            case BRIGHTNESS:
            return {(float)brightness};
            case POTENTIAL_BRIGHTNESS:
            return {(float)potentialBrightness};
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
            case SHOW_SCALAR_POTENTIAL:
            return {(bool)showScalarPotential};
            case SHOW_SPATIAL_CURRENT:
            return {(bool)showSpatialCurrent};
            case SHOW_PSEUDOSPATIAL_CURRENT:
            return {(bool)showPseudospatialCurrent};
            case SHOW_PSI01_SPIN:
            return {(bool)showPsi01Spin};
            case SHOW_PSI23_SPIN:
            return {(bool)showPsi23Spin};
            case SHOW_VECTOR_POTENTIAL:
            return {(bool)showVectorPotential};
            case SHOW_PSI0_W_PHASE:
            return {(bool)showPsi0WPhase};
            case SHOW_PSI1_W_PHASE:
            return {(bool)showPsi1WPhase};
            case SHOW_PSI2_W_PHASE:
            return {(bool)showPsi2WPhase};
            case SHOW_PSI3_W_PHASE:
            return {(bool)showPsi3WPhase};
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
