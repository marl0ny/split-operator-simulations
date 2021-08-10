import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation

N = 256
L = 2.0
S = np.linspace(-L, L - 1.0/N, N)
X, Y = np.meshgrid(S, S)

phi0 = np.exp(-0.5*((X/L - 0.3)**2
                     + (Y/L + 0.1)**2)/0.07**2
             )*np.exp(1.0j*np.pi*5*(X + Y))
phi0 += np.exp(-0.5*
               ((X/L + 0.2)**2 + (Y/L - 0.3)**2)/0.07**2)
phi0k = np.fft.fftn(phi0)
kx, ky = np.meshgrid(*2*[np.fft.fftfreq(N, d=1.0/N)])
mass = 4.0
omega = np.sqrt(kx**2 + ky**2 + mass**2)
fig = plt.figure()
ax = fig.add_subplot(1, 1, 1)
im2 = ax.imshow(np.abs(phi0), cmap='Greys_r',
                extent=(-L, L - 1.0/N, -L, L - 1.0/N))
im2.set_data(np.zeros([N, N]))
im = ax.imshow(np.angle(X + 1.0j*Y), extent=(-L, L - 1.0/N, -L, L - 1.0/N), 
               interpolation='none', cmap='hsv')
ax.set_title('Wavefunction')
ax.set_xlabel('x (a.u.)')
ax.set_ylabel('y (a.u.)')
data = {'t': 0.0}

def animation_func(*arg):
    data['t'] += 0.01
    phit = np.fft.ifft2(phi0k*np.cos(omega*data['t']))
    im.set_data(np.angle(phit))
    im.set_alpha(np.abs(phit))
    return im2, im,

ani = animation.FuncAnimation(fig, func=animation_func, 
                              interval=1000.0/60.0, blit=True)

plt.show()