"""
Numerically solving the  Klein-Gordon equation in 2D


from sympy import Matrix, Symbol, exp

# -hbar^2 (d^2/dt^2) phi = - c^2 hbar^2 laplacian(phi) + m^2 c^4 phi
# -(hbar/c)^2 (d^2/dt^2) phi = p^2 phi + m^2 c^2 phi
# (hbar/c)^2 (d^2/dt^2) phi = -p^2 phi - m^2 c^2 phi
# (d^2/dt^2) phi = -(c^2 p^2/hbar^2) phi - 
# (m^2 c^4/hbar^2) phi + V(x) phi

p2 = Symbol('p2', real=True)
c2_hbar2 = Symbol('c2_hbar2', positive=True)
m2c4_hbar2 = Symbol('m2c4_hbar2', positive=True)
dt = Symbol('dt')
ec = exp(dt*Matrix([[0, 0.5], 
                    [-p2*c2_hbar2 - m2c4_hbar2, 0]])).simplify()
for i, term in enumerate(ec):
    j, k = i // 2, i % 2
    print('e%d%d = ' % (j, k), term)
V = Symbol('V')
vc = exp(dt*Matrix([[0, 0.5], 
                    [V*c2_hbar2, 0]])).simplify()
for i, term in enumerate(vc):
    j, k = i // 2, i % 2
    print('e%d%d = ' % (j, k), term)

"""
from time import perf_counter
from splitstep import KleinGordonSplitstep
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# Constants (Metric Units)
N = 128  # Number of points to use
L = 4.0 # Extent of simulation
S = L*np.linspace(-0.5, 0.5 - 1.0/N, N)
X, Y = np.meshgrid(S, S)
DX = X[1] - X[0]  # Spatial step size
DT = 0.00009  # timestep

SIGMA = 0.04
BX, BY = 0.2, 0.2
wavefunc = np.exp(-((X/L-BX)/SIGMA)**2/2.0
                    - ((Y/L-BY)/SIGMA)**2/2.0
                       ) #*np.exp(-20.0j*np.pi*(X - Y)/L)
wavefunc = wavefunc # /np.sqrt(np.sum(wavefunc*np.conj(wavefunc)))

# V = None
# V = np.zeros([N, N]) + 1e-10

# Simple Harmonic Oscillator Setup
V = 10000.0*((X/L)**2 + (Y/L)**2) + 1e-10

m = 1.0/10.0
U = KleinGordonSplitstep(V, (L, L), DT, m=m, shape=(N, N))
def nonlinear_interaction(phi):
    return 2.0*(phi**2 - 2.0)*phi
    # phi2 = m*10000.0*(phi + 1e-10)
    # return phi2
    # return np.where(np.abs(phi2) < 100.0, phi2, 100*np.sign(phi2))
U.set_nonlinear_term(nonlinear_interaction)

fig = plt.figure()
ax = fig.add_subplot(1, 1, 1)
data = {'psi': [wavefunc, np.zeros([N, N])], 'steps': 0}
potential_im_data = np.abs(data['psi'][0])
if V is not None:
    V2 = V.T
    potential_im_data = np.transpose(np.array([V2, V2, V2, 
                                               np.amax(V2)*np.ones([N, N])])
                                        /np.amax(V2), (2, 1, 0))
    im2 = ax.imshow(potential_im_data,
                    extent=(X[0, 1], X[0, -1], Y[0, 0], Y[-1, 0]),
                    interpolation='bilinear')
else:
    im2 = ax.imshow(potential_im_data,
                    extent=(X[0, 1], X[0, -1], Y[0, 0], Y[-1, 0]),
                    interpolation='bilinear', cmap='Greys_r')
    im2.set_data(np.zeros([N, N]))
im = ax.imshow(np.angle(X + 1.0j*Y),
               alpha=np.abs(data['psi'][0]),
               extent=(X[0, 1], X[0, -1], Y[0, 0], Y[-1, 0]),
               interpolation='none',
               cmap='hsv')
ax.set_xlabel('x')
ax.set_ylabel('y')
ax.set_title('Wavefunction')
t0 = perf_counter()

def animation_func(*_):
    for _i in range(1):
        data['psi'] = U(data['psi'])
    im.set_data(np.angle(data['psi'][0]))
    im.set_alpha(np.abs(data['psi'][0]))
    data['steps'] += 1
    return (im2, im)

ani = animation.FuncAnimation(fig, animation_func, blit=True, interval=1.0)
plt.show()
fps = 1.0/((perf_counter() - t0)/(data["steps"]))
print(f'fps: {np.round(fps, 1)}')
