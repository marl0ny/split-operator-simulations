## Issues

### Dirac 2D
 - Include mouse selection in the simulation parameters instead of a separate thing. Add 3D mouse zoom/rotation as an option.
 - Set the time step controls as a percentage of the CFL condition instead. Display the actual time step in a label at the bottom.
 - Complete the pseudoscalar shader and add it as a visualization option.
 - For the gaussian wave packet standard deviation slider in the wave function initialization group, make sure to display it in the units that simulation uses.
 - When modifying the positive energy proportion slider, get the negative energy proportion label to actually display its amount. Base these proportions off of the magnitude squared instead of the magnitude, so that adding the positive and negative proportions gives one.
  - For wave function initialization, group the positive spin direction sliders together: instead of each slider controlling a single floating point parameter, apply a single Vec3 that encompasses all sliders. Do this as well for the negative spin direction sliders. 
  - Fix issues with how the 3D potential is displayed.
  - Fix issues with how 2D vector plots are displayed, particularly for vector magnitudes that are close to zero.
  - Add preset potentials.
  - For the four-vector potential entry boxes, add sub-headings for each entry box. The entry box for the time component should be the first.