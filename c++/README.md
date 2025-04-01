## Issues

### Dirac 2D
 - Include mouse selection in the simulation parameters instead of making it separate. Add 3D mouse zoom/rotation as an option.
 - Discrepancy in the two different options for wave function initialization: the position space option produces an amplitude roughly twice that of the momentum space one. Find the cause of this issue and fix it.
 - When using the scalar wave function visualization option, selecting one of the "show component with phase" options then switching back to scalar causes it to change its colour scheme. This only happens when the number of steps per frame is greater than zero.
 - Complete the pseudoscalar shader and add it as a visualization option.
  - Fix issues with 3D display of the potential.
  - Fix issues with how 2D vector plots are displayed, particularly for vector magnitudes that are close to zero.
  - Add time-dependent potentials
  - Place each of the 3D vector field views at separate z offsets.
  - Since the E and B fields are computed at staggered offsets, display these at staggered offsets as well.