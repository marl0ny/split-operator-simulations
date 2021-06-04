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
DT = 0.01  # timestep

# Simple Harmonic Oscillator Setup
# V = 200.0*((X/L)**2 + (Y/L)**2) 
# SIGMA = 0.056568
# BX, BY = 0.2, -0.2
# BX, BY = 0.0, 0.0
# wavefunc = np.exp(-((X/L+BX)/SIGMA)**2/2.0
#                     - ((Y/L-BY)/SIGMA)**2/2.0)
# wavefunc = wavefunc/np.sqrt(np.sum(wavefunc*np.conj(wavefunc)))

# Double Slit
V = np.zeros([N, N])
y0, yf = 11*N//20 - 5, 11*N//20 + 5
V[y0: yf, :] = 120.0 # Barrier
V[0: 4, :] = -120.0
V[y0: yf, 54*N//128: 58*N//128] = 0.0 # Make the left slit
V[y0: yf, 70*N//128: 74*N//128] = 0.0 # Make the right slit
A = [-30.0*np.where(Y == 0.0, 1e-30, Y), 
     30.0*np.where(X == 0.0, 1e-30, X), 0.0]
SIGMA = 0.07
BX, BY = 0.0, 0.25
wavefunc = np.exp(-((X/L-BX)/SIGMA)**2/2.0
                    - ((Y/L-BY)/SIGMA)**2/2.0)*np.exp(-40.0j*np.pi*Y/L)
wavefunc = wavefunc/np.sqrt(np.sum(wavefunc*np.conj(wavefunc)))

# Step Potential
# V = np.zeros([N, N])
# V[0: N//2+1, :] = 100.0
# SIGMA = 0.056568
# BX, BY = 0.0, 0.25
# wavefunc = np.exp( # -((X/L-BX)/SIGMA)**2/2.0
#                     - ((Y/L-BY)/SIGMA)**2/2.0)*np.exp(-40.0j*np.pi*Y/L)
# wavefunc = wavefunc/np.sqrt(np.sum(wavefunc*np.conj(wavefunc)))

m = 80.0
U = DiracSplitStepMethod(V - m/2.0, (L, L), DT, m=m, 
                         vector_potential=A
                        )

fig = plt.figure()
ax = fig.add_subplot(1, 1, 1)
# print(np.amax(np.angle(psi)))
data = {'psi': [wavefunc, np.zeros([N, N]), 
                np.zeros([N, N]), np.zeros([N, N])], 'steps': 0}
abs_val = lambda psi: np.sqrt(np.real(
                              sum([psi[i]*np.conj(psi[i]) for i in range(4)])))
max_val = np.amax(abs_val(data['psi']))
im = ax.imshow(np.angle(X + 1.0j*Y),
               alpha=abs_val(data['psi'])/max_val,
               extent=(X[0, 1], X[0, -1], Y[0, 0], Y[-1, 0]),
               interpolation='none',
               cmap='hsv')
V = V.T
potential_im_data = np.transpose(np.array([V, V, V, np.amax(V)*np.ones([N, N])])
                                    /np.amax(V), (2, 1, 0))
im2 = ax.imshow(potential_im_data,
                extent=(X[0, 1], X[0, -1], Y[0, 0], Y[-1, 0]),
                interpolation='bilinear')
ax.set_xlabel('x')
ax.set_ylabel('y')
ax.set_title('Wavefunction')
t0 = perf_counter()

def animation_func(*_):
    """
    Animation function
    """
    for _i in range(1):
        data['psi'] = U(data['psi'])
    im.set_data(np.angle(data['psi'][0]))
    a_psi2 = abs_val(data['psi'])**2
    # a_psi = np.abs(data['psi'][0])
    a_psi2_scaled = 4.0*a_psi2/np.amax(a_psi2)
    im.set_alpha(np.where(a_psi2_scaled > 1.0, 1.0, a_psi2_scaled))
    data['steps'] += 1
    return (im, )

ani = animation.FuncAnimation(fig, animation_func, blit=True, interval=1.0)
plt.show()
fps = 1.0/((perf_counter() - t0)/(data["steps"]))
print(f'fps: {np.round(fps, 1)}')
