from splitstep import NonlinearSplitStepMethod
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import scipy.constants as const

# Constants (Metric Units)
N = 256  # Number of points to use
L = 1e-8 # Extent of simulation (in meters)
X = L*np.linspace(-0.5, 0.5 - 1.0/N, N)
DX = X[1] - X[0]  # Spatial step size
DT = 5e-17  # timestep in seconds
# DT = DT*(1.0-1.0j)/np.sqrt(2.0)

# The wavefunction
SIGMA = 0.056568
wavefunc = np.exp(-((X/L+0.25)/SIGMA)**2/2.0)
wavefunc = wavefunc/np.sqrt(np.sum(wavefunc*np.conj(wavefunc)))

# The potential
V = 6*1e-18*(X/L)**2 # Simple Harmonic Oscillator
U = NonlinearSplitStepMethod(V, (L, ), DT)
# U.normalize_at_each_step(True)
U.set_nonlinear_term(lambda psi:
                     psi*np.exp(-0.25j*6.0e-18*np.abs(psi)**2*DT/const.hbar))

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

