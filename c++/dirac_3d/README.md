

### TODO
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