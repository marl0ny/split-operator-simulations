"""
Animation of a particle scattering in a Coulomb potential in 3D.
"""
from splitstep import SplitStepMethod
import numpy as np
import scipy.constants as const

# Constants (Metric Units)
N = 64  # Number of points to use
L = 4e-9 # Extent of simulation (in meters)
S = L*np.linspace(-0.5, 0.5, N)
X, Y, Z = np.meshgrid(S, S, S)
R = L*np.sqrt((X/L)**2 + (Y/L)**2 + (Z/L)**2)
DT = 4e-17  # timestep in seconds

# The Potential
V = -const.e**2/(4.0*np.pi*const.epsilon_0*R)

U = SplitStepMethod(V, (L, L, L), DT)
# U.normalize_at_each_step(True)

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
data = {'psi': 4.0*psi1/np.sqrt(np.sum(psi1*np.conj(psi1)))}

from mayavi import mlab
mlab.figure(1, fgcolor=(1, 1, 1), bgcolor=(0, 0, 0))
plot_data = mlab.pipeline.scalar_field(np.abs(psi))
angle_data = (np.angle(psi)).T.ravel()
plot_data.image_data.point_data.add_array(angle_data)
plot_data.image_data.point_data.get_array(1).name = 'phase'
plot_data.update()

plot_data2 = mlab.pipeline.set_active_attribute(plot_data, point_scalars='scalar')
contour = mlab.pipeline.contour(plot_data2)
contour2 = mlab.pipeline.set_active_attribute(contour, point_scalars='phase')
mlab.pipeline.surface(contour2, 
                      colormap='hsv'
                      )

@mlab.animate(delay=10)
def animation():
    while (1):
        for _ in range(1):
            data['psi'] = U(data['psi'])
        plot_data.mlab_source.scalars = np.abs(data['psi'])
        np.copyto(angle_data, np.angle(data['psi']).T.ravel())
        # print(np.sum(np.abs(data['psi'])**2))
        yield

animation()
mlab.show()


# import matplotlib.pyplot as plt
# import matplotlib.animation as animation
# fig = plt.figure()
# axes = fig.subplots(1, 3)
# extent = (S[0], S[-1], S[0], S[-1])
# im_x = axes[0].imshow(np.sum(np.abs(psi), axis=0), extent=extent)
# im_y = axes[1].imshow(np.sum(np.abs(psi), axis=1), extent=extent)
# im_z = axes[2].imshow(np.sum(np.abs(psi), axis=2), extent=extent)
# axes[0].set_title('')
# axes[1].set_title('')
# axes[2].set_title('')

# def animation_func(*_):
#     data['psi'] = U(data['psi'])
#     im_x.set_data(np.sum(np.abs(data['psi']), axis=0))
#     im_y.set_data(np.sum(np.abs(data['psi']), axis=1))
#     im_z.set_data(np.sum(np.abs(data['psi']), axis=2))
#     return im_x, im_y, im_z

# ani = animation.FuncAnimation(fig, animation_func, blit=True, interval=1.0)
# plt.show()