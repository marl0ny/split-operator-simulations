"""
Two identical particles in the 2D simple harmonic oscillator.
You may find the simulation to be incredibly slow, with a frame taking
about two seconds to render.
"""
from time import perf_counter
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import scipy.constants as const
from splitstep import SplitStepMethod


# Constants (Metric Units)
N = 50  # Number of points to use
L = 1e-8  # Extent of simulation (in meters)
X = L*np.linspace(-0.5, 0.5 - 1.0/N, N)
X1, X2, Y1, Y2 = np.meshgrid(X, X, X, X)
# Coordinates are X2, X1, Y1, Y2 -> ijkl
DT = 5e-17  # timestep in seconds

# Simple Harmonic Oscillator With Coulomb Interaction
R = np.sqrt((X2 - X1)**2 + (Y2 - Y1)**2) + 1e-60
V_INT = const.e**2/(4.0*np.pi*const.epsilon_0*R)
V = 6*1e-18*((X1/L)**2 + (X2/L)**2 + (Y1/L)**2 + (Y2/L)**2) + V_INT
U = SplitStepMethod(V, (L, L, L, L), DT)


# The wavefunction
SIGMA = np.complex128(0.056568)
wavefunc = np.exp(-((X1/L+0.25)/SIGMA)**2/2.0
                  - ((X2/L-0.25)/SIGMA)**2/2.0
                  - ((Y1/L+0.25)/SIGMA)**2/2.0
                  - ((Y2/L-0.25)/SIGMA)**2/2.0
                  )
wavefunc = wavefunc/np.sqrt(np.sum(wavefunc*np.conj(wavefunc)))


fig = plt.figure()
ax = fig.add_subplot(1, 1, 1)
max_val = np.amax(np.abs(wavefunc))
im = ax.imshow(np.einsum('ijkl->kj', np.abs(wavefunc)),
               extent=(X1[0, 0, 0, 0], X1[0, -1, 0, 0], 
                       Y1[0, 0, 0, 0], Y1[0, 0, -1, 0]),
               interpolation='bilinear',
               origin='lower', cmap='gray')
ax.set_xlabel('x1 (m)')
ax.set_ylabel('x2 (m)')
ax.set_title('Wavefunction')
data = {'psi': (wavefunc - np.transpose(wavefunc, (1, 0, 3, 2)))/np.sqrt(2.0),
        'steps': 0}
t0 = perf_counter()

def animation_func(*_):
    """
    Animation function
    """
    data['psi'] = U(data['psi'])
    im.set_data(np.einsum('ijkl->jk', np.abs(data['psi'])))
    data['steps'] += 1
    return (im, )

ani = animation.FuncAnimation(fig, animation_func, blit=True, interval=1.0)
plt.show()
fps = 1.0/((perf_counter() - t0)/(data["steps"]))
print(f'fps: {np.round(fps, 1)}')




