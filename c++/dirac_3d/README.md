# Real-Time Interactive 3D Dirac Equation Split-Operator Simulation (WIP)

[See here](https://marl0ny.github.io/split-operator-simulations/c++/dirac_3d/) for this interactive web-based visualization of numerical solutions to the Dirac Equation.

## References:

Split-operator method applied to the Dirac Equation:
 - Bauke H., Keitel C. (2010). [Accelerating the Fourier split operator method via graphics processing units](https://arxiv.org/abs/1012.3911). 
See section II.3.

More general references on the Dirac Equation; obtaining the exact free-particle plane wave solutions:
 - Shankar R (1994). The Dirac Equation, Chapter 20. in <i>Principles of Quantum Mechanics</i>.
 - [Dirac Equation](https://en.wikipedia.org/wiki/Dirac_equation). Wikipedia.
 - [Dirac spinor](https://en.wikipedia.org/wiki/Dirac_spinor). Wikipedia.

Fast Fourier Transform algorithm:
 - [Cooley-Tukey Algorithm](https://en.wikipedia.org/wiki/Cooley%E2%80%93Tukey_FFT_algorithm). Wikipedia.
 - Press W. et al. (1992). Fast Fourier Transform, Chapter 12. in <i>[Numerical Recipes](https://websites.pmc.ucsc.edu/~fnimmo/eart290c_17/NumericalRecipesinF77.pdf)</i>.

### Library credits

For rendering LaTeX expressions, KaTeX is used:
 - Eisenberg E. and Alpert S. [KaTeX](https://github.com/KaTeX/KaTeX)

The development and source code of the volumetric render and the other 3D visualizations of which this project utilizes are found in this [repository](https://github.com/marl0ny/SomeGraphicsStuff/tree/master/OpenGL/RenderIn3D).

#### TODO
 - The E and B fields from the external potential are computed on staggered grids. Stagger their visualizations as well.
 - Fix scaling disparity of momentum and position initialization of a wavepacket. Fix momentum initialization when the momentum is purely in the z-direction.
 - Display when the timestep dt is greater than pi/E(p_{max}). Somehow illustrate from dt what values of p gives plane waves that are properly sampled. Also check if this relation is computed correctly.
 - Fix z-clipping of conical arrows
 - Update momentum and position slider displays when placing a new wave packet.
 - Change blur strenth when at different zoom levels.
 - Add arror for notifying direction of expectation value of momentum when placing a new wave packet wave function.
 - Add sketch size slider for the potential and sketch height
 - For some of the sketch methods of Simulation the cursor parameter is either Vec2 or Vec3. For the ones that use Vec2, convert it to Vec3 then call the Vec3 version instead of doing a separate texture draw call.
 - For the native version the four-vector potential edit crashes with a segmentation fault when trying to input something. Fix this.
 - Base absorption strength on initial momentum, and other factors.
