## Issues

### Dirac 2D
 - Discrepancy in the two different options for wave function initialization: the position space selection produces an amplitude roughly twice that of the momentum space one. Find the cause of this issue and fix it.
 - When using the scalar wave function visualization option, selecting one of the "show component with phase" options then switching back to scalar causes it to change its colour scheme. This only happens when the number of steps per frame is greater than zero.
 - Complete the pseudoscalar shader and add it as a visualization option.
  - Fix issues with 3D display of the potential.
  - Fix issues with how 2D vector plots are displayed, particularly for vector magnitudes that are close to zero.
  - Add time-dependent potentials. Properly show the E-Field whenever modifying the vector-potential with the sliders.
  - Place each of the 3D vector field views at separate z offsets.
  - Since the E and B fields are computed at staggered offsets, display these at staggered offsets as well.
   - The arrows scale slider does not seem to work.
   - Brightness slider does not work for 0th component current in 3D.
   - For 3D add a view cursor. This is to properly show the location of where the cursor's line of sight
   intersects the simulation view plane, as actual drawn quantities are at a height offset
   away from the plane.
   - Account for perspective when applying cursor interaction in the 3D view.
   - Sketching the vector potential seems to modify the scalar potential in unexpected ways.