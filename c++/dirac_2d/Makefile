SHELL = /bin/bash
FLAGS = -O2 -g
C_COMPILE = clang
CPP_COMPILE = clang++ -std=c++11
LINKER = /usr/bin/ld

ifeq ($(shell uname),Darwin)
INCLUDE =  -I${PWD} -I${PWD}/gl_wrappers -I/opt/homebrew/include
LIBS = -ldl -L/opt/homebrew/lib -lglfw\
       -framework CoreVideo -framework OpenGL -framework IOKit\
       -framework Cocoa -framework Carbon
else
INCLUDE =  -I${PWD} -I${PWD}/gl_wrappers
LIBS = -lm -lGL -lGLEW -lglfw
endif

# Make sure to source <emcc_location>/emsdk/emsdk_env.sh first!
WEB_TARGET = main.js

TARGET = ${PWD}/program
DATA_DEPENDENCIES = parameters.json
GENERATION_SCRIPTS = make_parameter_files.py
GENERATED_DEPENDENCIES = parameters.hpp
C_SOURCES =
CPP_SOURCES = main.cpp simulation.cpp gl_wrappers.cpp spinors.cpp arrows2d.cpp arrows3d2d.cpp gaussian_wavepacket2d.cpp visualization2d.cpp visualization3d2d.cpp fft2d.cpp dirac_split_step2d.cpp glfw_window.cpp interactor.cpp parse.cpp user_edit_glsl.cpp surface.cpp
SOURCES = ${C_SOURCES} ${CPP_SOURCES}
OBJECTS = main.o simulation.o gl_wrappers.o spinors.o arrows2d.o arrows3d2d.o gaussian_wavepacket2d.o visualization2d.o visualization3d2d.o fft2d.o dirac_split_step2d.o glfw_window.o interactor.o parse.o user_edit_glsl.o surface.o
# SHADERS = ./shaders/*


all: ${TARGET}

${TARGET}: ${OBJECTS}
	${CPP_COMPILE} ${FLAGS} -o $@ ${OBJECTS} ${LIBS}

${WEB_TARGET}: ${SOURCES} ${GENERATED_DEPENDENCIES}
	emcc -lembind -o $@ ${SOURCES} ${INCLUDE} -O3 -v -s WASM=2 -s USE_GLFW=3 -s FULL_ES3=1 \
	-s TOTAL_MEMORY=100MB -s LLD_REPORT_UNDEFINED --embed-file shaders

${OBJECTS}: ${CPP_SOURCES} ${GENERATED_DEPENDENCIES}
	${CPP_COMPILE} ${FLAGS} -c ${CPP_SOURCES} ${INCLUDE}

${GENERATED_DEPENDENCIES}: ${DATA_DEPENDENCIES} ${GENERATION_SCRIPTS}
	python3 make_parameter_files.py

clean:
	rm -f *.o ${TARGET} *.wasm *.js
