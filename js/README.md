# JavaScript/WebGL Split-Operator Simulations (WIP)

Interactively visualize numerical solutions to the time-dependent linear and nonlinear Schrödinger equation in [2D](https://marl0ny.github.io/split-operator-simulations/js/2d.html) and [3D](https://marl0ny.github.io/split-operator-simulations/js/3d.html) using the [split-operator method](https://www.algorithm-archive.org/contents/split-operator_method/split-operator_method.hml). Computations are primarily handled using GLSL shaders, while the front-facing UI is implemented in HTML5/Javascript. 

These simulations run client side inside the web browser, and are real-time interactive. However, please note that as of now they may not work properly if at all on many handheld/mobile devices, and the 3D version requires a modern discrete GPU (such as an RTX card) to get decent frame rates.

Some inspirations for the visual presentation and GUI are the [WebGL Superfluid Simulation](https://georgestagg.github.io/webgl_gpe/) by George Stagg, the [Visual PDE](https://visualpde.com/) project, as well as some older programs by [Daniel Schroeder](https://physics.weber.edu/schroeder/software/QuantumScattering2D.html) and [Paul Falstad](https://www.falstad.com/qm2dosc/).


## References:

Split-operator method:
 - [The Arcane Algorithm Archive - Split-operator method](https://www.algorithm-archive.org/contents/split-operator_method/split-operator_method.hml)
 - [Wikipedia - Split-step method](https://en.wikipedia.org/wiki/Split-step_method)
 - [Arxiv - Accelerating the Fourier split operator method via graphics processing units](https://arxiv.org/abs/1012.3911)

Fast Fourier Transform algorithm (used in the split-operator method):
 - [Wikipedia - Cooley-Tukey Algorithm](https://en.wikipedia.org/wiki/Cooley%E2%80%93Tukey_FFT_algorithm)
 - [MathWorld Wolfram - Fast Fourier Transform](http://mathworld.wolfram.com/FastFourierTransform.html)
 - [Numerical Recipes Chapter 12](https://websites.pmc.ucsc.edu/~fnimmo/eart290c_17/NumericalRecipesinF77.pdf)

Review of various methods for solving the nonlinear Schrödinger equation:
 - [Arxiv - Computational methods for the dynamics of the nonlinear Schrödinger/Gross-Pitaevskii equations](https://arxiv.org/abs/1305.1093)

Graphics rendering reference with OpenGL/WebGL:
 - [Learn OpenGL](https://learnopengl.com)
  
Building a basic volumetric render for visualizing 3D data:
 - [Volume ray casting - Wikipedia](https://en.wikipedia.org/wiki/Volume_ray_casting)

Parsing simple math expressions (Shunting Yard algorithm):
 - [Wikipedia - Shunting Yard Algorithm](https://en.wikipedia.org/wiki/Shunting_yard_algorithm)

