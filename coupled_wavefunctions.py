"""
Two coupled wavefunctions using the Gross-Pitaevskii equations.
This is following an example found in an article found here by Antoine et al.:
https://arxiv.org/pdf/1305.1093.pdf

"""
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

# The wavefunc1tion
SIGMA = 0.056568
e = np.exp(10.0j*np.pi*(X/L + Y/L))
wavefunc1 = np.exp(-((X/L+0.15)/SIGMA)**2/2.0
                    - ((Y/L-0.15)/SIGMA)**2/2.0)*(1.0 + 0.0j)*e
wavefunc2 = np.exp(-((X/L-0.15)/SIGMA)**2/2.0
                    - ((Y/L+0.15)/SIGMA)**2/2.0)*(1.0 + 0.0j) #*np.conj(e)
wavefunc1 = wavefunc1/np.sqrt(np.sum(wavefunc1*np.conj(wavefunc1)))
wavefunc2 = wavefunc2/np.sqrt(np.sum(wavefunc2*np.conj(wavefunc2)))

# The potential
V = 6.0*1e-18*((X/L)**2 + (Y/L)**2)  # Simple Harmonic Oscillator
U = NonlinearSplitStepMethod(V, (L, L), DT)

fig = plt.figure()
ax = fig.add_subplot(1, 1, 1)
# print(np.amax(np.angle(psi)))
max_val = np.amax(np.abs(wavefunc1))
im = ax.imshow(np.angle(X + 1.0j*Y),
                alpha=np.abs(wavefunc1)/max_val,
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
ax.set_title('wavefunction')
data = {'psi1': wavefunc1, 'psi2': wavefunc2}


def animation_func(*_):
    """
    Animation function
    """
    psi1, psi2 = data['psi1'], data['psi2']
    nonlinear_term1 = 1.0e-17*np.abs(psi1)**2 + 3.0e-16*np.abs(psi2)**2
    nonlinear_term2 = 3.0e-16*np.abs(psi1)**2 + 1.0e-17*np.abs(psi2)**2
    U.set_nonlinear_term(lambda psi:
                         psi*np.exp(-0.25j*nonlinear_term1*DT/const.hbar))
    data['psi1'] = U(psi1)
    U.set_nonlinear_term(lambda psi:
                         psi*np.exp(-0.25j*nonlinear_term2*DT/const.hbar))
    data['psi2'] = U(psi2)
    im.set_data(np.angle(data['psi1'] #+ data['psi2']
                         ))
    im.set_alpha(np.abs(data['psi1'] 
                 #+ data['psi2']
                 )/(1.0*max_val))
    return (im2, im)


ani = animation.FuncAnimation(fig, animation_func, blit=True, interval=1.0)
plt.show()
