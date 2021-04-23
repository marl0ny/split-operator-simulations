from splitstep import SplitStepMethod
import numpy as np
import scipy.constants as const
import matplotlib.pyplot as plt

# Constants (Metric Units)
N = 129 # Number of points to use
L = 4e-9 # Extent of simulation (in meters)
S = L*np.linspace(-0.5, 0.5, N)
X, Y, Z = np.meshgrid(S, S, S)
R = L*np.sqrt((X/L)**2 + (Y/L)**2 + (Z/L)**2)
DR = Z[0, 0, 1] - Z[0, 0, 0]
DT = 4e-17  # timestep in seconds

# The Potential
V = -const.e**2/(4.0*np.pi*const.epsilon_0*R)
if N % 2:
    V[N//2, N//2, N//2] = -const.e**2/(4.0*np.pi*const.epsilon_0*0.5*DR)

U = SplitStepMethod(V, (L, L, L), -1.0j*DT)
U.normalize_at_each_step(True)

# The wavefunction
sigma = 0.07
# sigma = 3.0
e = (1.0 + 0.0j)*np.exp(10.0j*np.pi*X/L)
psi1 = e*np.exp(-((X/L+0.25)/sigma)**2/2.0
                -((Y/L)/sigma)**2/2.0
                -((Z/L)/sigma)**2/2.0)
psi2 = e*np.exp(-((X/L-0.25)/sigma)**2/2.0
                -((Y/L)/sigma)**2/2.0
                -((Z/L)/sigma)**2/2.0)
psi12 = psi1 + np.conj(psi2)
psi = psi12/np.sqrt(np.sum(psi12*np.conj(psi12)))
data = {'psi': psi1/np.sqrt(np.sum(psi1*np.conj(psi1)))}

for i in range(25):
    data['psi'] = U(data['psi'])

# Compute ground state wavefunction using analytic formula
norm_factor = 1.0/np.sqrt(np.sum(np.exp(-2.0*R/5.291772e-11)))
psi0_actual = np.exp(-R/5.291772e-11)*norm_factor

# plt.imshow(V[N//2])
# plt.show(); plt.close()
# p = np.meshgrid(*[2.0*np.pi*const.hbar*np.fft.fftfreq(d)*d/
#                  (L, L, L)[i] for i, d in enumerate(V.shape)])
# Kp = sum([p_i**2 for p_i in p])/(2.0*const.m_e)
# potential_exp_val = np.sum(V*np.abs(data['psi'])**2)
# V[N//2, N//2, N//2] = -const.e**2/(4.0*np.pi*const.epsilon_0*DR)
V[N//2, N//2, N//2] = 0.0
potential_exp_val = np.sum(V*np.abs(psi0_actual)**2)
# p_psi = np.fft.fft(data['psi'])
# p_psi = np.fft.fft(psi0_actual)
# plt.show(); plt.close()
# p_psi = p_psi/np.sqrt(np.sum(np.abs(p_psi)**2))
# kinetic_exp_val = np.abs(np.sum(Kp*p_psi*np.conj(p_psi)))
print(potential_exp_val/const.e, 'eV') # It really isn't that accurate!
# print((kinetic_exp_val + potential_exp_val)/const.e)

plt.title("Hydrogen Ground State Radial Profile:\nAnalytic vs Numerical")
plt.xlabel('r (m)')
plt.yticks([])
upper = 5*N//8
plt.plot(S[N//2: upper], psi0_actual[N//2, N//2, N//2: upper], label='Analytic')
plt.plot(S[N//2: upper], 
         np.abs(data['psi'][N//2, N//2, N//2: upper]), 
         label='Numerical')
plt.legend()
plt.show()