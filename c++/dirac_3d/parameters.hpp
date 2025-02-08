#include "gl_wrappers.hpp"

namespace sim_3d {

#ifndef _PARAMETERS_
#define _PARAMETERS_

struct SimParams {
    int stepsPerFrame = (int)(1);
    float c = (float)(137.06F);
    float hbar = (float)(1.0F);
    float m = (float)(1.0F);
    float dt = (float)(2.8e-05F);
    float t = (float)(0.0F);
    int texelSideLength = (int)(64);
    float sideLength = (float)(2.0F);
    std::vector<std::string> fourVectorPotential = std::vector<std::string>{"0", "0", "0", "0"};
    enum {
        STEPS_PER_FRAME=0,
        C=1,
        HBAR=2,
        M=3,
        DT=4,
        T=5,
        TEXEL_SIDE_LENGTH=6,
        SIDE_LENGTH=7,
        FOUR_VECTOR_POTENTIAL=8,
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
            case TEXEL_SIDE_LENGTH:
            texelSideLength = val.i32;
            break;
            case SIDE_LENGTH:
            sideLength = val.f32;
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
            case TEXEL_SIDE_LENGTH:
            return {(int)texelSideLength};
            case SIDE_LENGTH:
            return {(float)sideLength};
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
