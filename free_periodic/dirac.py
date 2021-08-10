import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation


# Constants (Hartree units)
C = 137.036 # Speed of light
HBAR = 1.0
N = 256 # Number of points to use
N_DIM = 2
L = 4.0 # Length of simulation in the x and y directions
X, Y = np.meshgrid(L*np.linspace(-0.5, 0.5 - 1.0/N, N),
                   L*np.linspace(-0.5, 0.5 - 1.0/N, N))
M = 1.0 # Mass of the particle
f = np.fft.fftfreq(N)
f[0] = 1e-60
P = np.pi*f*N/L # Momenta in 1D
PX, PY = np.meshgrid(P, P) # Momenta in the x and y directions


def get_eigenvectors(momenta):
    """
    For the given momenta find the corresponding spinor
    energy eigenvectors that solves the time-independent
    free-particle Dirac equation. This returns a 4x4 matrix
    where each row is the eigenvector.
    """

    px, py, pz = momenta
    p2 = px**2 + py**2 + pz**2
    p = np.sqrt(p2)
    mc = M*C
    zeros = np.zeros(N_DIM*[N], dtype=np.complex128)
    omega = np.sqrt(mc*mc + p2) # Corresponds to E/c

    # Temporary variable used for
    # some denominators in the negative energy solutions
    den1 = p*np.sqrt((mc - omega)**2 + p2)
    # Used for denominators in the positive energy solutions
    den2 = p*np.sqrt((mc + omega)**2 + p2)

    # Negative energy solutions
    neg_eig1 = [pz*(mc - omega)/den1, 
                (mc*px - 1.0j*mc*py - (px - 1.0j*py)*omega)/den1,
                p2/den1, zeros]
    neg_eig2 = [(mc*px + 1.0j*mc*py + (-px - 1.0j*py)*omega)/den1,
                -pz*(mc - omega)/den1, zeros, p2/den1]

    # Positive energy solutions
    pos_eig1 = [pz*(mc + omega)/den2, 
                (mc*px - 1.0j*mc*py + (px - 1.0j*py)*omega)/den2,
                p2/den2, zeros]
    pos_eig2 = [(mc*px + 1.0j*mc*py + (px + 1.0j*py)*omega)/den2,
                -pz*(mc + omega)/den2, zeros, p2/den2]
    
    # These orthonormal eigenvectors are found by diagonalizing the
    # \alpha_i p_i + \beta m c matrix.
    # This is done by using Sympy. Some more work is done
    # in order to get the eigenvectors in a simplified form.
    # More information found here: https://en.wikipedia.org/wiki/Dirac_spinor.

    return np.array([neg_eig1, neg_eig2, pos_eig1, pos_eig2])


def get_energies(momenta):
    """
    For the given momenta find the corresponding
    energy eigenvalues for the time-independent free-particle
    Dirac equation. Note that each of the energy eigenvalues
    are double degenerate so that they correspond to the
    eigenvectors returned by get_eigenvectors above.
    """
    px, py, pz = momenta
    omega = np.sqrt(M**2*C**2 + px**2 + py**2 + pz**2)
    return np.array([-C*omega, -C*omega, C*omega, C*omega])


E = get_energies([PX, PY, 0.0])
U = get_eigenvectors([PX, PY, 0.0]) # 4x4 matrix containing the eigenvectors
U_DAGGER = np.conj(np.transpose(U, (1, 0, 2, 3)))


# 0th component of the initial wavefunction
psi00 = np.exp(-0.5*((X/L)**2
                + (Y/L)**2)/0.06**2
              )*np.exp(2.0j*np.pi*(15.0*X/L - 15.0*Y/L))

# The full 4-component initial wavefunction
psi0 = np.array([psi00, np.zeros(N_DIM*[N]), 
                 np.zeros(N_DIM*[N]), np.zeros(N_DIM*[N])])

# This is the initial wavefunction in momentum space
psi0_p = np.array([np.fft.fftn(psi0[i]) for i in range(4)])

# Get the initial wavefunction in terms of spinor energy eigenvectors.
# Remember that each row of U contains the normalized spinor eigenvectors.
psi0_s = np.einsum('jk...,k...->j...', U, psi0_p)
# psi0_s[0] *= 0.0 # Set the negative energy components to zero
# psi0_s[1] *= 0.0 

# Get the wavefunction for at an arbitrary future time t
t = 0.075
psi_s = np.exp(-1.0j*E*t/HBAR)*psi0_s

# Transform the wavefunction back to position space.
psi_p = np.einsum('ij...,j...->i...', U_DAGGER, psi_s)
psi = np.array([np.fft.ifftn(psi_p[i]) for i in range(4)])

# Plot the wavefunction.
fig = plt.figure()
ax = fig.add_subplot(1, 1, 1)
ax.imshow(np.zeros([N, N]), cmap='Greys_r', 
          extent=(-L/2, L/2, -L/2, L/2)) # Make background black
im = ax.imshow(np.angle(psi[0]), cmap='hsv', interpolation='none', 
               extent=(-L/2, L/2, -L/2, L/2))
im.set_alpha(np.sqrt(sum([np.abs(psi[i])**2 for i in range(4)])))
ax.set_xlabel('x (a.u.)')
ax.set_ylabel('y (a.u.)')
ax.set_title("Relativistic Dirac Particle")
plt.show()
plt.close()


# Do an animation instead
fig = plt.figure()
ax = fig.add_subplot(1, 1, 1)
im2 = ax.imshow(np.zeros([N, N]), cmap='Greys_r', 
                extent=(-L/2, L/2, -L/2, L/2))
im = ax.imshow(np.angle(X + 1.0j*Y), cmap='hsv', interpolation='none',
               extent=(-L/2, L/2, -L/2, L/2))
ax.set_xlabel('x (a.u.)')
ax.set_ylabel('y (a.u.)')
ax.set_title("Relativistic Dirac Particle")

data = {'t': 0.0}
def animation_func(*args):
    data['t'] += 0.001
    t = data['t']
    psi_p = np.exp(-1.0j*t*E/HBAR)*psi0_s
    psi_p = np.einsum('ij...,j...->i...', U_DAGGER, psi_p)
    psi = np.zeros([4, N, N], np.complex128)
    for i in range(4):
        psi[i] = np.fft.ifftn(psi_p[i])
    im.set_data(np.angle(psi[0]))
    im.set_alpha(np.sqrt(sum([np.abs(psi[i])**2 for i in range(4)])))
    return (im2, im, )


data['ani'] = animation.FuncAnimation(fig, animation_func, 
                                      blit=True, interval=1000.0/60.0)
plt.show()
