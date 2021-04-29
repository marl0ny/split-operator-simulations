from time import perf_counter
from splitstep import DiracSplitStepMethod
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# Constants (Metric Units)
N = 256  # Number of points to use
L = 2.0 # Extent of simulation
S = L*np.linspace(-0.5, 0.5 - 1.0/N, N)
X, Y = np.meshgrid(S, S)
DX = X[1] - X[0]  # Spatial step size
DT = 0.001  # timestep

# The wavefunction
SIGMA = 0.056568
# BX, BY = 0.25, -0.25
BX, BY = 0.0, 0.0
wavefunc = np.exp(-((X/L+BX)/SIGMA)**2/2.0
                    - ((Y/L-BY)/SIGMA)**2/2.0)*(1.0 + 0.0j)
wavefunc = wavefunc/np.sqrt(np.sum(wavefunc*np.conj(wavefunc)))

# The potential
V = np.zeros([N, N])
# V = 200.0*((X/L)**2 + (Y/L)**2)  # Simple Harmonic Oscillator
U = DiracSplitStepMethod(V, (L, L), DT)

fig = plt.figure()
ax = fig.add_subplot(1, 1, 1)
# print(np.amax(np.angle(psi)))
data = {'psi': [wavefunc/np.sqrt(2.0), np.zeros([N, N]), 
                1.0j*wavefunc/np.sqrt(2.0), np.zeros([N, N])], 'steps': 0}
abs_val = lambda psi: np.sqrt(np.real(
                              sum([psi[i]*np.conj(psi[i]) for i in range(4)])))
im = ax.imshow(abs_val(data['psi']),
               extent=(X[0, 1], X[0, -1], Y[0, 0], Y[-1, 0]))
ax.set_xlabel('x')
ax.set_ylabel('y')
ax.set_title('Wavefunction')
t0 = perf_counter()

def animation_func(*_):
    """
    Animation function
    """
    data['psi'] = U(data['psi'])
    im.set_data(abs_val(data['psi']))
    data['steps'] += 1
    return (im, )


ani = animation.FuncAnimation(fig, animation_func, blit=True, interval=1.0)
plt.show()
fps = 1.0/((perf_counter() - t0)/(data["steps"]))
print(f'fps: {np.round(fps, 1)}')