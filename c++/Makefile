SHELL = /bin/bash

# Clang
COMPILE = /usr/bin/clang++
FLAGS = -O2 -Wall -g -std=c++11
LIBS = -lm -lGL -lGLEW -lglfw

# GCC
# COMPILE = /usr/bin/g++ 
# FLAGS = -Og -Wall -g
# OPENMP = -fopenmp
# INCLUDE = ${OPENMP}
# LIBS = -lm -lGL -lGLEW -lglfw -fPIC ${OPENMP}

TARGETDIR = .
TARGET = ${TARGETDIR}/program
TARGET2 = ${TARGETDIR}/split-operator-quantum2d.js
SOURCES = quantum.cpp gl_wrappers.cpp fft_gl.cpp
HEADERS = fft.hpp
OBJECTS = quantum.o gl_wrappers.o fft_gl.o

all: ${TARGET}

${TARGET}: ${OBJECTS}
	${COMPILE} ${FLAGS} -o $@ $^ ${LIBS}

${OBJECTS}: ${SOURCES} ${HEADERS}
	${COMPILE} ${FLAGS} -c $^ ${INCLUDE}

${TARGET2}: ${SOURCES}
	python3 make_shaders_h.py
	emcc -o $@ $^ -std=c++11 -O3 -s WASM=1 -s USE_GLFW=3 -s FULL_ES2=1
	rm -f shaders.hpp

clean:
	rm -f *.o *~ *.gch ${TARGET} split-operator-quantum2d.wasm ${TARGET2}

