# Free Particle

The scripts contained within this subdirectory do not actually use the Split-Operator method, because
these do not use spatially dependant potentials. Instead the Fourier transform is only done once to get the initial wavefunction |ψ(0)> in the momentum basis, and then the wavefunction is found for all times t using |ψ(t)> = exp(-itH)|ψ(0)>, where [H, p] = 0 and H is the time-independent Hamiltonian. An inverse Fourier transform is then performed to go back to position space. 

