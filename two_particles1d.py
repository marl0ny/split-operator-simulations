"""
Two interacting particles in 1D simple harmonic oscillator.
"""
from splitstep import SplitStepMethod
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation


# Constants (Metric Units)
N = 256  # Number of points to use
L = 4e-9  # Extent of simulation (in meters)
X1, X2 = np.meshgrid(L*np.linspace(-0.5, 0.5 - 1.0/N, N),
                     L*np.linspace(-0.5, 0.5 - 1.0/N, N))
DX = X1[1] - X1[0]  # Spatial step size
DT = 2e-17  # timestep in seconds


# V = 12*1e-18*((X1/L)**2 + (X2/L)**2)  # Simple Harmonic Oscillator
# V = 12*1e-18*((X1/L) - (X2/L))**2 + 12*1e-18*((X1/L)**2 + (X2/L)**2)
import scipy.constants as const
R = np.abs(X1 - X2)
for i in range(N):
  R[i, i] = R[i, i-1] if i > 0 else R[i, i+1]
non_interacting_term = 15*1e-18*((X1/L)**2 + (X2/L)**2)
V = const.e**2/(4.0*np.pi*const.epsilon_0*R) + non_interacting_term
# V = const.e**2/(4.0*np.pi*const.epsilon_0*R)

# non_interacting_term = np.zeros([N, N])
# V = np.zeros([N, N])
# plt.imshow(V)
# plt.show()
# import sys
# sys.exit()
U = SplitStepMethod(V, (L, L), DT)
U.normalize_at_each_step(True)

# The wavefunction
SIGMA = 0.07
wavefunc = np.exp(-((X1/L+0.3)/SIGMA)**2/2.0
                  - ((X2/L-0.1)/SIGMA)**2/2.0
                    )*(1.0 + 0.0j) # *np.exp(20.0j*np.pi*X1/L)
wavefunc = wavefunc/np.sqrt(np.sum(wavefunc*np.conj(wavefunc)))
norm_factor = np.sum(np.dot(wavefunc - wavefunc.T, 
                           np.conj(wavefunc - wavefunc.T)))


fig = plt.figure()
axes = fig.subplots(1, 2)
ax = axes[0]
ax2 = axes[1]
max_val = np.amax(np.abs(wavefunc))
im = ax.imshow(np.angle(X1 + 1.0j*X2),
                alpha=np.abs(wavefunc)/max_val,
                extent=(X1[0, 1], X1[0, -1], X2[0, 0], X2[-1, 0]),
                interpolation='none',
                origin='lower',
                aspect='auto',
                cmap='hsv')
potential_im_data = np.transpose(np.array([V, V, V, np.amax(V)*np.ones([N, N])])
                                    /np.amax(V), (1, 2, 0))
# potential_im_data = np.transpose(np.array([0.0*V, 0.0*V, 0.0*V, 
#                                            np.ones([N, N])]), (1, 2, 0))
im2 = ax.imshow(potential_im_data,
                origin='lower',
                extent=(X1[0, 1], X1[0, -1], X2[0, 0], X2[-1, 0]),
                interpolation='bilinear')
ax.set_xlabel('x1 (m)')
ax.set_ylabel('x2 (m)')
ax.set_title('Two 1D Particles Wavefunction')
wavefunc_data = {'psi1(x1)psi2(x2)': wavefunc}
line, = ax2.plot(X1[0], np.dot(np.abs(wavefunc)**2, np.ones([N])))
ax2.plot(X1[0], np.amax(np.dot(np.abs(wavefunc)**2, np.ones([N])))*
                non_interacting_term[N//2]/
                np.amax(non_interacting_term[N//2]), color='gray')
# x1_line, = ax2.plot([0.0, 0.0], [0.0, 1.0], color='gray')
# x2_line, = ax2.plot([0.0, 0.0], [0.0, 1.0], color='gray')
ax2.set_xlim(X1[0, 0], X1[0, -1])
ax2.set_ylim(-0.05/10.0, 0.05*0.5)
ax2.set_xlabel('X (m)')
ax2.set_yticks([])

def animation_func(*_):
    """
    Animation function
    """
    wavefunc_data['psi1(x1)psi2(x2)'] = U(wavefunc_data['psi1(x1)psi2(x2)'])
    psi1_x1_psi2_x2 = wavefunc_data['psi1(x1)psi2(x2)']
    psi1_x2_psi2_x1 = psi1_x1_psi2_x2.T
    psi = (1.0/np.sqrt(2.0))*(psi1_x1_psi2_x2 
                               - psi1_x2_psi2_x1
                              )
    prob = np.abs(psi)**2
    prob_1d = np.dot(prob, np.ones([N]))
    # exp_x1 = np.sum(prob*X1)
    # exp_x2 = np.sum(prob*X2)
    # x1_line.set_xdata([exp_x1, exp_x1])
    # x2_line.set_xdata([exp_x2, exp_x2])
    line.set_ydata(prob_1d)
    im.set_data(np.angle(psi))
    im.set_alpha(np.abs(psi/max_val))
    return (im2, im, line, 
            # x1_line, x2_line
            )

ani = animation.FuncAnimation(fig, animation_func, blit=True, interval=1.0)
plt.show()




