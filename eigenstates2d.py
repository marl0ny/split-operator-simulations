"""
Animation of a particle in 2D Simple Harmonic Oscillator.
"""
from time import perf_counter
from splitstep import SplitStepMethod
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# Constants (Metric Units)
N = 128  # Number of points to use
L = 1e-8 # Extent of simulation (in meters)
X, Y = np.meshgrid(L*np.linspace(-0.5, 0.5 - 1.0/N, N),
                    L*np.linspace(-0.5, 0.5 - 1.0/N, N))
DX = X[1] - X[0]  # Spatial step size
DT = 5e-17  # timestep in seconds

# The wavefunction
SIGMA = 0.056568
wavefunc = np.exp(-((X/L+0.25)/SIGMA)**2/2.0
                    - ((Y/L-0.25)/SIGMA)**2/2.0)*(1.0 + 0.0j)
wavefunc = wavefunc/np.sqrt(np.sum(wavefunc*np.conj(wavefunc)))

# The potential
V = 6*1e-18*((X/L)**2 + (Y/L)**2)  # Simple Harmonic Oscillator
U = SplitStepMethod(V, (L, L), DT)
U.set_timestep(-1.0j*DT)
U.normalize_at_each_step(True)

fig = plt.figure()
ax = fig.add_subplot(1, 1, 1)
# print(np.amax(np.angle(psi)))
max_val = np.amax(np.abs(wavefunc))
im = ax.imshow(np.angle(X + 1.0j*Y),
                alpha=np.abs(wavefunc)/max_val,
                extent=(X[0, 1], X[0, -1], Y[0, 0], Y[-1, 0]),
                interpolation='none',
                cmap='hsv')
potential_im_data = np.transpose(np.array([V, V, V, np.amax(V)*np.ones([N, N])])
                                    /np.amax(V), (2, 1, 0))
im2 = ax.imshow(potential_im_data,
                extent=(X[0, 1], X[0, -1], Y[0, 0], Y[-1, 0]),
                interpolation='bilinear')
ax.set_xlabel('x (m)')
ax.set_ylabel('y (m)')
ax.set_title('Wavefunction')
data = {'psi': wavefunc, 'steps': 0, 'eigenstates': []}
t0 = perf_counter()

def animation_func(*_):
    """
    Animation function
    """
    if data['eigenstates']:
        for prev in data['eigenstates']:
            data['psi'] -= np.dot(prev, data['psi'])*prev
    psi = U(data['psi'])
    data['psi'] = U(psi)
    eps = 1e-1
    if np.sum(np.abs(data['psi'] - psi)) < eps:
        data['eigenstates'].append(data['psi'])
    im.set_data(np.angle(data['psi']))
    im.set_alpha(np.abs(data['psi'])/max_val)
    data['steps'] += 1
    return (im2, im)


ani = animation.FuncAnimation(fig, animation_func, blit=True, interval=1.0)
plt.show()
fps = 1.0/((perf_counter() - t0)/(data["steps"]))
print(f'fps: {np.round(fps, 1)}')
print(np.sum(np.abs(wavefunc)), np.sum(np.abs(data['psi'])))
