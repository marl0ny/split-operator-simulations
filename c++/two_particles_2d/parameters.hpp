#include "gl_wrappers.hpp"

namespace sim_2d {

#ifndef _PARAMETERS_
#define _PARAMETERS_

struct Button {};

struct UploadImage {};

typedef std::string Label;

typedef bool BoolRecord;

typedef std::vector<std::string> EntryBoxes;

struct SelectionList {
    int selected;
    std::vector<std::string> options;
};

struct LineDivider {};

struct NotUsed {};

struct SimParams {
    float hbar = (float)(1.0F);
    float m1 = (float)(1.0F);
    float m2 = (float)(1.0F);
    float dt = (float)(0.1F);
    float c = (float)(137.036F);
    float brightness = (float)(10.0F);
    int log2TexWidth = (int)(5);
    enum {
        HBAR=0,
        M1=1,
        M2=2,
        DT=3,
        C=4,
        BRIGHTNESS=5,
        LOG2_TEX_WIDTH=6,
    };
    void set(int enum_val, Uniform val) {
        switch(enum_val) {
            case HBAR:
            hbar = val.f32;
            break;
            case M1:
            m1 = val.f32;
            break;
            case M2:
            m2 = val.f32;
            break;
            case DT:
            dt = val.f32;
            break;
            case C:
            c = val.f32;
            break;
            case BRIGHTNESS:
            brightness = val.f32;
            break;
            case LOG2_TEX_WIDTH:
            log2TexWidth = val.i32;
            break;
        }
    }
    Uniform get(int enum_val) const {
        switch(enum_val) {
            case HBAR:
            return {(float)hbar};
            case M1:
            return {(float)m1};
            case M2:
            return {(float)m2};
            case DT:
            return {(float)dt};
            case C:
            return {(float)c};
            case BRIGHTNESS:
            return {(float)brightness};
            case LOG2_TEX_WIDTH:
            return {(int)log2TexWidth};
        }
        return Uniform(0);
    }
    void set(int enum_val, int index, std::string val) {
        switch(enum_val) {
        }
    }
};
#endif
}
