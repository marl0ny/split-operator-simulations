"""
Numerically solving the Dirac equation in 1D.

Haven't done any checks yet for correctness.
"""
from splitstep import DiracSplitStepMethod
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# Constants (Metric Units)
N = 256  # Number of points to use
L = 2.0 # Extent of simulation
X = L*np.linspace(-0.5, 0.5 - 1.0/N, N)
DX = X[1] - X[0]  # Spatial step size
DT = 0.005  # timestep

# The wavefunction
SIGMA = 0.04
wavefunc = np.exp(-((X/L - 0.2)/SIGMA)**2/2.0) #*np.exp(-2.0j*10.0*np.pi*X/L)
wavefunc = wavefunc/np.sqrt(np.sum(wavefunc*np.conj(wavefunc)))

# The potential
# V = np.zeros([N])
V = 200*(X/L)**2 # Simple Harmonic Oscillator
# Barrier
# V = 100.0*np.array([1.0 if i > 48*N//100 and i < 52*N//100 
#                    else 0.0 for i in range(N)])
# V += 50.0*np.array([1.0 if i > 98*N//100 or i < 2*N//100 
#                    else 0.0 for i in range(N)])
# Barrier and Well
# V = 20.0*np.array([1.0 if i > 48*N//100 and i < 52*N//100 
#                    else 0.0 for i in range(N)])
# V -= 20.0*np.array([1.0 if i > 98*N//100 or i < 2*N//100 
#                    else 0.0 for i in range(N)])

U = DiracSplitStepMethod(V, (L, ), DT, m=20.0)

fig = plt.figure()
ax = fig.add_subplot(1, 1, 1)
wavefunc_data = {'x': [wavefunc, np.zeros([N]), np.zeros([N]), np.zeros([N])]}
# wavefunc_data = {'x': [wavefunc/4.0*np.exp(np.pi/4.0), 1.0j*wavefunc/4.0, 
#                        wavefunc/4.0*np.exp(np.pi/3.0), -1.0j*wavefunc/4.0,]}
re_plots, im_plots = [], []
for i in (0, 3):
    re_plot, = ax.plot(X, np.real(wavefunc_data['x'][i]), 
                       label=r'Re($\psi_%d(x)$)' % (i+1))
    re_plots.append(re_plot)
    im_plot, = ax.plot(X, np.imag(wavefunc_data['x'][i]),
                       label=r'Im($\psi_%d(x)$)' % (i+1))
    im_plots.append(im_plot)

abs_val = lambda psi: np.sqrt(np.real(
                              sum([psi[i]*np.conj(psi[i]) for i in range(4)]))
                              )
abs_plot, = ax.plot(X, abs_val(wavefunc_data['x']), color='black', 
                    label=r'$|\psi(x)|$')
ymin, ymax = -1.1*np.amax(np.abs(wavefunc)), 1.1*np.amax(np.abs(wavefunc)) 
ax.set_ylim(ymin, ymax)
max_pot_val = np.amax(V)
potential_plot, = ax.plot(X, 0.9*ymax*V/max_pot_val, color='gray', 
                          label=r'$V(x)$', linewidth=2.0)
ax.set_xlabel('X')
ax.set_yticks([])
ax.set_xlim(X[0], X[-1])
ax.set_title('Wavefunction Plot')


def func_animation(*_):
    wavefunc_data['x'] = U(wavefunc_data['x'])
    abs_plot.set_ydata(abs_val(wavefunc_data['x']))
    for i, k in zip([0, 1], [0, 3]):
        re_plots[i].set_ydata(np.real(wavefunc_data['x'][k]))
        im_plots[i].set_ydata(np.imag(wavefunc_data['x'][k]))
    return re_plots + im_plots + [abs_plot]


ani = animation.FuncAnimation(fig, func_animation, blit=True, interval=1000/60)
plt.legend()
plt.show()
