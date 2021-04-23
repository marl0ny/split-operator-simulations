"""
Animation of a particle in 1D Simple Harmonic Oscillator.
"""
from splitstep import SplitStepMethod
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# Constants (Metric Units)
N = 512  # Number of points to use
L = 4e-9 # Extent of simulation (in meters)
X = L*np.linspace(-0.5, 0.5 - 1.0/N, N)
DX = X[1] - X[0]  # Spatial step size
DT = 1e-17  # timestep in seconds

# The wavefunction
SIGMA = 0.07
wavefunc = np.exp(-((X/L+0.25)/SIGMA)**2/2.0)
wavefunc = wavefunc/np.sqrt(np.sum(wavefunc*np.conj(wavefunc)))

# The potential
V = 15*1e-18*(X/L)**2 # Simple Harmonic Oscillator
U = SplitStepMethod(V, (L, ), DT)

fig = plt.figure()
ax = fig.add_subplot(1, 1, 1)
re_plot, = ax.plot(X, np.real(wavefunc), label='Re($\psi(x)$)')
im_plot, = ax.plot(X, np.imag(wavefunc), label='Im($\psi(x)$)')
abs_plot, = ax.plot(X, np.abs(wavefunc), color='black', 
                    label='$|\psi(x)|$')
ax.plot(X, V*np.amax(np.abs(wavefunc))/np.amax(V), color='gray', label='V(x)')
ax.set_ylim(-1.1*np.amax(np.abs(wavefunc)), 1.1*np.amax(np.abs(wavefunc)))
wavefunc_data = {'x': wavefunc}
ax.set_xlabel('X (m)')
ax.set_yticks([])
ax.set_xlim(X[0], X[-1])
ax.set_title('Wavefunction Plot')


def func_animation(*_):
    wavefunc_data['x'] = U(wavefunc_data['x'])
    abs_plot.set_ydata(np.abs(wavefunc_data['x']))
    re_plot.set_ydata(np.real(wavefunc_data['x']))
    im_plot.set_ydata(np.imag(wavefunc_data['x']))
    return re_plot, im_plot, abs_plot


ani = animation.FuncAnimation(fig, func_animation, blit=True, interval=1000/60)
plt.legend()
plt.show()

