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
X0 = -0.0
wavefunc = np.exp(-((X/L - X0)/SIGMA)**2/2.0)
wavefunc = wavefunc/np.sqrt(np.sum(wavefunc*np.conj(wavefunc)))

# The potential
V = 15*1e-18*(X/L)**2 # Simple Harmonic Oscillator
# V =  3.5*1e-18*(X/L)
# V = 15*1e-18*((X/L)**2 + np.exp(-0.5*(X/L)**2/0.05**2)/8.0)

U = SplitStepMethod(V, (L, ), -1.0j*DT)
U.normalize_at_each_step(True)

fig = plt.figure()
ax = fig.add_subplot(1, 1, 1)
re_plot, = ax.plot(X, np.real(wavefunc), label=r'Re($\psi(x)$)')
im_plot, = ax.plot(X, np.imag(wavefunc), label=r'Im($\psi(x)$)')
abs_plot, = ax.plot(X, np.abs(wavefunc), color='black', 
                    label=r'$|\psi(x)|$')
ax.plot(X, V*np.amax(np.abs(wavefunc))/np.amax(V), color='gray', label='V(x)')
ax.set_ylim(-1.1*np.amax(np.abs(wavefunc)), 1.1*np.amax(np.abs(wavefunc)))
wavefunc_data = {'x': wavefunc}
ax.set_xlabel('X (m)')
ax.set_yticks([])
ax.set_xlim(X[0], X[-1])
ax.set_title('Wavefunction Plot')
wavefunc_data['prev'] = []


def func_animation(*_):
    psi = wavefunc_data['x']
    # psi_sum = wavefunc_data['x'] - wavefunc_data['prev']
    if wavefunc_data['prev']:
        # prev = sum([psi for psi in wavefunc_data['prev']])
        # prev = prev/np.sqrt(np.sum(np.abs(prev)**2))
        for prev in wavefunc_data['prev']:
            wavefunc_data['x'] -= np.dot(prev, wavefunc_data['x'])*prev
            # wavefunc_data['x'] = U(wavefunc_data['x'] + prev)
    # else:
    wavefunc_data['x'] = np.real(U(wavefunc_data['x'])) + 0.0j
    eps = 1e-3 # if len(wavefunc_data['prev']) == 0 else 1e-2
    diff = psi - wavefunc_data['x']
    if np.sum(np.abs(diff)) < eps:
        wavefunc_data['prev'].append(psi)
    abs_plot.set_ydata(np.abs(wavefunc_data['x']))
    re_plot.set_ydata(np.real(wavefunc_data['x']))
    im_plot.set_ydata(np.imag(wavefunc_data['x']))
    return re_plot, im_plot, abs_plot


ani = animation.FuncAnimation(fig, func_animation, blit=True, interval=1000/60)
plt.legend()
plt.show()
print(np.sum(wavefunc*np.conj(wavefunc)), 
      np.sum(np.real(wavefunc_data['x']*np.conj(wavefunc_data['x'])))
      )
plt.close()


# for i, d in enumerate(wavefunc_data['prev']):
#     fig = plt.figure()
#     ax = fig.add_subplot(1, 1, 1)
#     re_plot, = ax.plot(X, np.real(d), label=r'Re($\psi(x)$)')
#     im_plot, = ax.plot(X, np.imag(d), label=r'Im($\psi(x)$)')
#     abs_plot, = ax.plot(X, np.abs(d), color='black', 
#                         label=r'$|\psi(x)|$')
#     ax.plot(X, V*np.amax(np.abs(wavefunc))/np.amax(V), 
#             color='gray', label='V(x)')
#     ax.set_ylim(-1.1*np.amax(np.abs(wavefunc)), 1.1*np.amax(np.abs(wavefunc)))
#     ax.set_xlabel('X (m)')
#     ax.set_yticks([])
#     ax.set_xlim(X[0], X[-1])
#     ax.set_title('Eigenstate n = %d' % (i + 1))
#     plt.show()
#     plt.close()

