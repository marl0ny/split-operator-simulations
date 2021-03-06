from splitstep import NonlinearSplitStepMethod
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import scipy.constants as const

# Constants (Metric Units)
N = 256  # Number of points to use
L = 1e-8 # Extent of simulation (in meters)
X, Y = np.meshgrid(L*np.linspace(-0.5, 0.5 - 1.0/N, N),
                    L*np.linspace(-0.5, 0.5 - 1.0/N, N))
DX = X[1] - X[0]  # Spatial step size
DT = 5e-17  # timestep in seconds

# The wavefunction
SIGMA = 0.056568
wavefunc = np.exp(-((X/L+0.25)/SIGMA)**2/2.0
                    - ((Y/L-0.25)/SIGMA)**2/2.0)*(1.0 + 0.0j)
# wavefunc += np.exp(-((X/L-0.25)/SIGMA)**2/2.0
#                     - ((Y/L+0.25)/SIGMA)**2/2.0)*(1.0 + 0.0j)
wavefunc = wavefunc/np.sqrt(np.sum(wavefunc*np.conj(wavefunc)))

# The potential
V = 6*1e-18*((X/L)**2 + (Y/L)**2)  # Simple Harmonic Oscillator
U = NonlinearSplitStepMethod(V, (L, L), DT)
U.set_nonlinear_term(lambda psi:
                     psi*np.exp(-0.25j*1.0e-16*np.abs(psi)**2*DT/const.hbar))

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
data = {'psi': wavefunc}


def animation_func(*_):
    """
    Animation function
    """
    data['psi'] = U(data['psi'])
    im.set_data(np.angle(data['psi']))
    im.set_alpha(np.abs(data['psi'])/max_val)
    return (im2, im)


ani = animation.FuncAnimation(fig, animation_func, blit=True, interval=1.0)
plt.show()
