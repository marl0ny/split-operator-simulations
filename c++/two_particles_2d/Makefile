SHELL = /bin/bash
FLAGS = -O0 -g
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
C_SOURCES =
CPP_SOURCES = main.cpp gl_wrappers.cpp glfw_window.cpp interactor.cpp fft4d.cpp reduce4d.cpp split_step4d.cpp
SOURCES = ${C_SOURCES} ${CPP_SOURCES}
OBJECTS = main.o gl_wrappers.o glfw_window.o interactor.o fft4d.o reduce4d.o split_step4d.o

all: ${TARGET}

${TARGET}: ${OBJECTS}
	${CPP_COMPILE} ${FLAGS} -o $@ ${OBJECTS} ${LIBS}

${WEB_TARGET}: ${SOURCES}
	emcc -lembind -o $@ ${SOURCES} ${INCLUDE} -O3 -v -s WASM=2 -s USE_GLFW=3 -s FULL_ES3=1 \
	-s TOTAL_MEMORY=100MB -s LLD_REPORT_UNDEFINED --embed-file shaders

${OBJECTS}: ${CPP_SOURCES}
	${CPP_COMPILE} ${FLAGS} -c ${CPP_SOURCES} ${INCLUDE}

clean:
	rm -f *.o ${TARGET} *.wasm *.js
